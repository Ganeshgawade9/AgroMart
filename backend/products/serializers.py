from rest_framework import serializers
from .models import (Product, Category, Brand, Review, Wishlist, Cart, Banner,
                     ProductNotification, HomeCategory, Crop)
import math


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'user_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'user_name', 'created_at']


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source='category', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(source='brand', read_only=True)
    seller_shop_name = serializers.CharField(source='seller.seller_profile.shop_name', read_only=True, default='')
    seller_shop_logo = serializers.SerializerMethodField()
    is_in_stock = serializers.ReadOnlyField()
    distance_km = serializers.SerializerMethodField()
    is_notify_subscribed = serializers.SerializerMethodField()
    is_wishlisted = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'image', 'image2', 'image3', 'price', 'mrp', 'discount_percent',
                  'stock', 'unit', 'weight', 'rating', 'total_reviews',
                  'category_name', 'category_id', 'brand_name', 'brand_id', 'seller_shop_name', 'seller_shop_logo',
                  'is_in_stock', 'has_free_delivery', 'is_organic',
                  'is_featured', 'distance_km', 'is_notify_subscribed', 'is_wishlisted', 'created_at']

    def get_is_wishlisted(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request, '_user_wishlist_ids'):
            request._user_wishlist_ids = set(
                Wishlist.objects.filter(user=request.user).values_list('product_id', flat=True)
            )
        return obj.id in request._user_wishlist_ids

    def get_is_notify_subscribed(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return ProductNotification.objects.filter(user=request.user, product=obj, is_notified=False).exists()

    def get_seller_shop_logo(self, obj):
        try:
            logo = obj.seller.seller_profile.shop_logo
            if logo:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(logo.url)
                return logo.url
        except Exception:
            pass
        return None

    def get_distance_km(self, obj):
        request = self.context.get('request')
        if not request:
            annotated = getattr(obj, 'distance', None)
            return round(float(annotated), 1) if annotated is not None else None
        try:
            farmer_lat = float(request.query_params.get('lat', 0))
            farmer_lng = float(request.query_params.get('lng', 0))
            seller_lat = float(obj.seller.latitude or 0)
            seller_lng = float(obj.seller.longitude or 0)
            if not (farmer_lat and farmer_lng and seller_lat and seller_lng):
                return None

            from maps.routing import fetch_route_info

            # Always default to driving distance on motorable roads
            mode = request.query_params.get('mode', 'driving').lower()
            if mode not in ('driving', 'walking'):
                mode = 'driving'


            # Cache per-request so 20 products from the same seller only query route once
            if not hasattr(request, '_seller_road_distances'):
                request._seller_road_distances = {}
            cache_key = (round(seller_lat, 5), round(seller_lng, 5), mode)
            if cache_key in request._seller_road_distances:
                return request._seller_road_distances[cache_key]

            route_info = fetch_route_info(farmer_lat, farmer_lng, seller_lat, seller_lng, mode=mode, timeout=1.5)
            road_km = route_info['distance_km']
            request._seller_road_distances[cache_key] = road_km
            return road_km
        except Exception:
            annotated = getattr(obj, 'distance', None)
            return round(float(annotated), 1) if annotated is not None else None



class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    seller_shop_name = serializers.CharField(source='seller.seller_profile.shop_name', read_only=True, default='')
    seller_shop_logo = serializers.SerializerMethodField()
    seller_location = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    distance_km = serializers.SerializerMethodField()
    is_notify_subscribed = serializers.SerializerMethodField()
    is_wishlisted = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_is_wishlisted(self, obj):
        return ProductListSerializer.get_is_wishlisted(self, obj)

    def get_is_notify_subscribed(self, obj):
        return ProductListSerializer.get_is_notify_subscribed(self, obj)

    def get_distance_km(self, obj):
        return ProductListSerializer.get_distance_km(self, obj)

    def get_seller_shop_logo(self, obj):
        try:
            logo = obj.seller.seller_profile.shop_logo
            if logo:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(logo.url)
                return logo.url
        except Exception:
            pass
        return None


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        exclude = ['seller', 'rating', 'total_reviews', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['seller'] = self.context['request'].user
        return super().create(validated_data)


class CartSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), write_only=True, source='product')
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'product', 'product_id', 'quantity', 'subtotal', 'added_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        cart_item, created = Cart.objects.get_or_create(
            user=validated_data['user'],
            product=validated_data['product'],
            defaults={'quantity': validated_data.get('quantity', 1)}
        )
        if not created:
            cart_item.quantity += validated_data.get('quantity', 1)
            cart_item.save()
        return cart_item


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), write_only=True, source='product')

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_id', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        wishlist_item, created = Wishlist.objects.get_or_create(
            user=validated_data['user'],
            product=validated_data['product']
        )
        return wishlist_item


class BannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = ['id', 'title', 'subtitle', 'image', 'image_url', 'link_url', 'is_active', 'order', 'created_at']
        read_only_fields = ['id', 'created_at', 'image_url']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class HomeCategorySerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = HomeCategory
        fields = ['id', 'name', 'slug', 'title_key', 'image', 'default_image', 'bg_color', 'link_url', 'order']

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.default_image


class CropSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Crop
        fields = ['id', 'name', 'slug', 'search_query', 'image', 'default_image', 'order', 'is_featured']

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.default_image


