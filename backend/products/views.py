from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, F, Value, FloatField, IntegerField, Case, When, Count, Min, Max
from django.db.models.functions import Cast, Cos, Sin, ACos, Radians, Least, Greatest
import math
from .models import (Product, Category, Brand, Review, Wishlist, Cart, Banner,
                     ProductNotification, HomeCategory, Crop)
from .serializers import (ProductListSerializer, ProductDetailSerializer,
    ProductCreateUpdateSerializer, CategorySerializer, BrandSerializer,
    ReviewSerializer, CartSerializer, WishlistSerializer, BannerSerializer,
    HomeCategorySerializer, CropSerializer)
from .filters import ProductFilter
from accounts.admin_views import IsAdminUser


def distance_expression(lat, lng):
    """Great-circle distance in km between (lat, lng) and the product's seller.

    Uses the spherical law of cosines with database math functions, so the
    result can be filtered and ordered in SQL (and paginated correctly).
    Works on SQLite (Django registers the math functions) and PostgreSQL.
    """
    f = FloatField()
    seller_lat = Radians(Cast(F('seller__latitude'), f), output_field=f)
    seller_lng = Radians(Cast(F('seller__longitude'), f), output_field=f)
    user_lat = Value(math.radians(lat), output_field=f)
    user_lng = Value(math.radians(lng), output_field=f)

    cos_angle = (
        Cos(user_lat, output_field=f) * Cos(seller_lat, output_field=f)
        * Cos(seller_lng - user_lng, output_field=f)
        + Sin(user_lat, output_field=f) * Sin(seller_lat, output_field=f)
    )
    # Clamp to [-1, 1]: float rounding can push it slightly out of ACos' domain
    clamped = Least(Value(1.0, output_field=f), Greatest(Value(-1.0, output_field=f), cos_angle), output_field=f)
    return ACos(clamped, output_field=f) * Value(6371.0, output_field=f)


def with_sold_out_flag(queryset):
    """Adds `sold_out` (1 when stock is 0) so listings can push sold-out items to the end."""
    return queryset.annotate(
        sold_out=Case(When(stock__lte=0, then=1), default=0, output_field=IntegerField())
    )


def sold_out_last(queryset):
    """Keeps whatever ordering was chosen, but lists sold-out products after the available ones."""
    current = list(queryset.query.order_by) or list(Product._meta.ordering)
    return queryset.order_by('sold_out', *current)


class IsSellerOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == 'seller'

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.seller == request.user


from rest_framework.pagination import PageNumberPagination

class ProductPagination(PageNumberPagination):
    page_size = 500
    page_size_query_param = 'page_size'
    max_page_size = 1000


class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'brand__name', 'seller__seller_profile__shop_name',
                     'seller__village', 'seller__taluka', 'seller__district']
    ordering_fields = ['price', 'rating', 'created_at', 'distance']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = with_sold_out_flag(
            Product.objects.filter(is_active=True).select_related('seller', 'seller__seller_profile', 'category', 'brand')
        )

        # Nearby products filter
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        radius = self.request.query_params.get('radius', 20)

        located = False
        if lat and lng:
            try:
                lat, lng, radius = float(lat), float(lng), float(radius)
                if not (-90 <= lat <= 90 and -180 <= lng <= 180) or radius <= 0:
                    raise ValueError('out of range')
                # Bounding box first (cheap, can use indexes), exact circle after
                lat_delta = radius / 111
                lng_delta = radius / (111 * max(math.cos(math.radians(lat)), 0.01))
                qs = qs.filter(
                    seller__latitude__range=(lat - lat_delta, lat + lat_delta),
                    seller__longitude__range=(lng - lng_delta, lng + lng_delta)
                )
                qs = qs.annotate(distance=distance_expression(lat, lng)).filter(distance__lte=radius)
                located = True
            except (ValueError, TypeError):
                pass

        if not located:
            # Keeps ?ordering=distance harmless when no location was sent
            qs = qs.annotate(distance=Value(None, output_field=FloatField()))

        return qs

    def filter_queryset(self, queryset):
        # Allow random ordering (e.g. for homepage discovery / ?ordering=random / ?ordering=?)
        order_param = self.request.query_params.get('ordering')
        if order_param in ('random', '?'):
            for backend in list(self.filter_backends):
                if backend != filters.OrderingFilter:
                    queryset = backend().filter_queryset(self.request, queryset, self)
            return queryset.order_by('sold_out', '?')
        # Sold-out products stay visible (with a "Sold out" label) but come after the available ones
        return sold_out_last(super().filter_queryset(queryset))


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductDetailSerializer
    permission_classes = [permissions.AllowAny]


class SellerProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ProductListSerializer
        return ProductCreateUpdateSerializer

    def get_queryset(self):
        return Product.objects.filter(seller=self.request.user)


class SellerProductUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsSellerOrReadOnly]
    serializer_class = ProductCreateUpdateSerializer

    def get_queryset(self):
        return Product.objects.filter(seller=self.request.user)


class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        product_id = self.kwargs['product_id']
        product = get_object_or_404(Product, id=product_id, is_active=True)
        existing = Review.objects.filter(user=self.request.user, product=product).first()
        if existing:
            existing.rating = serializer.validated_data.get('rating', existing.rating)
            existing.comment = serializer.validated_data.get('comment', existing.comment)
            existing.save(update_fields=['rating', 'comment'])
        else:
            serializer.save(user=self.request.user, product=product)

        # Update product rating
        reviews = product.reviews.all()
        count = reviews.count()
        if count > 0:
            product.rating = round(sum(r.rating for r in reviews) / count, 2)
            product.total_reviews = count
            product.save(update_fields=['rating', 'total_reviews'])


class CartView(generics.ListCreateAPIView):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).select_related('product')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        total = sum(float(item.subtotal) for item in qs)
        return Response({'items': serializer.data, 'total': round(total, 2), 'count': qs.count()})


class CartItemView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)


class ClearCartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        Cart.objects.filter(user=request.user).delete()
        return Response({'message': 'Cart cleared'})


class WishlistView(generics.ListCreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('product')


class WishlistItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        item = Wishlist.objects.filter(user=request.user, pk=pk).first()
        if not item:
            item = Wishlist.objects.filter(user=request.user, product_id=pk).first()
        if item:
            item.delete()
            return Response({'in_wishlist': False, 'message': 'Removed from wishlist'}, status=status.HTTP_200_OK)
        return Response({'in_wishlist': False, 'message': 'Item not in wishlist'}, status=status.HTTP_200_OK)


class ToggleWishlistView(APIView):
    """Toggle adding or removing a product from the user's wishlist."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'error': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            product = Product.objects.get(pk=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        item = Wishlist.objects.filter(user=request.user, product=product).first()
        if item:
            item.delete()
            return Response({
                'in_wishlist': False,
                'product_id': product.id,
                'message': f'Removed {product.name} from wishlist'
            }, status=status.HTTP_200_OK)
        else:
            Wishlist.objects.create(user=request.user, product=product)
            return Response({
                'in_wishlist': True,
                'product_id': product.id,
                'message': f'Added {product.name} to wishlist!'
            }, status=status.HTTP_200_OK)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class BrandListView(generics.ListAPIView):
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Brand.objects.filter(is_active=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_group__icontains=category)
        return qs.order_by('name')


class GroupedBrandsView(APIView):
    """Returns all active brands organized into SEEDS, CROP PROTECTION, CROP NUTRITION, IMPLEMENTS, and MOST POPULAR."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        all_brands = Brand.objects.filter(is_active=True).order_by('name')
        data = {
            'seeds': [],
            'crop_protection': [],
            'crop_nutrition': [],
            'implements': [],
            'popular': []
        }
        for b in all_brands:
            groups = [g.strip() for g in b.category_group.split(',') if g.strip()]
            for g in groups:
                if g in data:
                    data[g].append({'id': b.id, 'name': b.name})
        return Response(data)


class FilterOptionsView(APIView):
    """Values that actually exist in the catalogue, used to build the filter panel.

    Only options that have at least one active product are returned, so the
    panel never offers a brand/unit/district that would give an empty result.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        active = Product.objects.filter(is_active=True)

        def counted(qs, field):
            return list(qs.exclude(**{f'{field}__isnull': True}).exclude(**{field: ''})
                        .values(field).annotate(count=Count('id')).order_by(field))

        categories = [
            {'value': row['category__category_type'], 'count': row['count']}
            for row in counted(active, 'category__category_type')
        ]
        brands = [
            {'id': row['brand_id'], 'name': row['brand__name'], 'count': row['count']}
            for row in active.exclude(brand__isnull=True)
            .values('brand_id', 'brand__name').annotate(count=Count('id')).order_by('brand__name')
        ]
        units = [{'value': row['unit'], 'count': row['count']} for row in counted(active, 'unit')]
        districts = [{'value': row['seller__district'], 'count': row['count']}
                     for row in counted(active, 'seller__district')]
        price = active.aggregate(min=Min('price'), max=Max('price'))

        return Response({
            'categories': categories,
            'brands': brands,
            'units': units,
            'districts': districts,
            'price': {'min': float(price['min'] or 0), 'max': float(price['max'] or 0)},
        })


class FeaturedProductsView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = with_sold_out_flag(Product.objects.filter(is_active=True, is_featured=True))
        return qs.order_by('sold_out', '?')


class BannerListView(generics.ListAPIView):
    """Public list of active promotional banners for the homepage hero slider."""
    serializer_class = BannerSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Banner.objects.filter(is_active=True).order_by('order', '-created_at')



class AdminBannerListCreateView(APIView):
    """Admin endpoint to list all banners and upload single or multiple banners."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        banners = Banner.objects.all().order_by('order', '-created_at')
        serializer = BannerSerializer(banners, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        files = request.FILES.getlist('images')
        single_image = request.FILES.get('image')

        # Multi-file upload support
        if files:
            created_banners = []
            base_order = Banner.objects.count()
            title = request.data.get('title', '').strip()
            subtitle = request.data.get('subtitle', '').strip()
            link_url = request.data.get('link_url', '').strip()

            for idx, img_file in enumerate(files):
                banner_title = title if (len(files) == 1 or not title) else f"{title} #{idx + 1}"
                banner = Banner.objects.create(
                    image=img_file,
                    title=banner_title,
                    subtitle=subtitle,
                    link_url=link_url,
                    order=base_order + idx,
                    is_active=True,
                )
                created_banners.append(banner)

            serializer = BannerSerializer(created_banners, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        if single_image:
            serializer = BannerSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return Response({'error': 'No image(s) provided. Upload via "image" or "images" field.'}, status=status.HTTP_400_BAD_REQUEST)


class AdminBannerDetailView(APIView):
    """Admin endpoint to update or delete a specific banner."""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            banner = Banner.objects.get(pk=pk)
        except Banner.DoesNotExist:
            return Response({'error': 'Banner not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = BannerSerializer(banner, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            banner = Banner.objects.get(pk=pk)
        except Banner.DoesNotExist:
            return Response({'error': 'Banner not found'}, status=status.HTTP_404_NOT_FOUND)

        if banner.image:
            try:
                banner.image.delete(save=False)
            except Exception:
                pass
        banner.delete()
        return Response({'message': 'Banner deleted successfully'}, status=status.HTTP_200_OK)


class ProductNotifyMeView(APIView):
    """Subscribe or unsubscribe user from restock alerts for a sold out product."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk, is_active=True)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=404)

        alert, created = ProductNotification.objects.get_or_create(
            user=request.user,
            product=product,
            defaults={'is_notified': False}
        )

        if not created and alert.is_notified:
            # Re-activate alert if previously notified
            alert.is_notified = False
            alert.notified_at = None
            alert.save(update_fields=['is_notified', 'notified_at'])
            return Response({
                'subscribed': True,
                'message': f'You will be notified as soon as {product.name} is back in stock! 🔔'
            })

        if not created and not alert.is_notified:
            # User clicked again -> toggle unsubscribe
            alert.delete()
            return Response({
                'subscribed': False,
                'message': f'Restock notification cancelled for {product.name}'
            })

        return Response({
            'subscribed': True,
            'message': f'You will be notified as soon as {product.name} is back in stock! 🔔'
        })

    def get(self, request, pk):
        is_sub = ProductNotification.objects.filter(
            user=request.user,
            product_id=pk,
            is_notified=False
        ).exists()
        return Response({'subscribed': is_sub})


class HomeCategoryListView(generics.ListAPIView):
    serializer_class = HomeCategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return HomeCategory.objects.filter(is_active=True).order_by('order', 'id')


class CropListView(generics.ListAPIView):
    serializer_class = CropSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = Crop.objects.filter(is_active=True)
        if self.request.query_params.get('featured') == 'true':
            qs = qs.filter(is_featured=True)
        return qs.order_by('order', 'id')



