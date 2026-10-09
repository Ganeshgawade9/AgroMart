from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
import math
from .models import Product, Category, Brand, Review, Wishlist, Cart
from .serializers import (ProductListSerializer, ProductDetailSerializer,
    ProductCreateUpdateSerializer, CategorySerializer, BrandSerializer,
    ReviewSerializer, CartSerializer, WishlistSerializer)
from .filters import ProductFilter


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
    ordering_fields = ['price', 'rating', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related('seller', 'seller__seller_profile', 'category', 'brand')

        # Nearby products filter
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        radius = self.request.query_params.get('radius', 20)

        if lat and lng:
            try:
                lat, lng, radius = float(lat), float(lng), float(radius)
                # Filter sellers within radius using bounding box first (fast)
                lat_delta = radius / 111
                lng_delta = radius / (111 * math.cos(math.radians(lat)))
                qs = qs.filter(
                    seller__latitude__range=(lat - lat_delta, lat + lat_delta),
                    seller__longitude__range=(lng - lng_delta, lng + lng_delta)
                )
            except (ValueError, TypeError):
                pass

        return qs


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


class FeaturedProductsView(generics.ListAPIView):
    queryset = Product.objects.filter(is_active=True, is_featured=True)
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]
