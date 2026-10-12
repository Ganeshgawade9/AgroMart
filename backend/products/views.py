from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, F, Value, FloatField, IntegerField, Case, When, Count, Min, Max
from django.db.models.functions import Cast, Cos, Sin, ACos, Radians, Least, Greatest
import math
from .models import Product, Category, Brand, Review, Wishlist, Cart
from .serializers import (ProductListSerializer, ProductDetailSerializer,
    ProductCreateUpdateSerializer, CategorySerializer, BrandSerializer,
    ReviewSerializer, CartSerializer, WishlistSerializer)
from .filters import ProductFilter


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


class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'seller__seller_profile__shop_name',
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
        product_id = self.kwargs['product_id']
        product = Product.objects.get(id=product_id)
        review = serializer.save(user=self.request.user, product=product)
        # Update product rating
        reviews = product.reviews.all()
        product.rating = sum(r.rating for r in reviews) / reviews.count()
        product.total_reviews = reviews.count()
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


class WishlistItemView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class BrandListView(generics.ListAPIView):
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]


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
        return sold_out_last(qs)
