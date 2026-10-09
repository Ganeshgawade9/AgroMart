from rest_framework import serializers
from .models import Product, Category, Brand, Review, Wishlist, Cart
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
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    seller_shop_name = serializers.CharField(source='seller.seller_profile.shop_name', read_only=True, default='')
    seller_shop_logo = serializers.SerializerMethodField()
    is_in_stock = serializers.ReadOnlyField()
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'image', 'image2', 'image3', 'price', 'mrp', 'discount_percent',
                  'stock', 'unit', 'weight', 'rating', 'total_reviews',
                  'category_name', 'brand_name', 'seller_shop_name', 'seller_shop_logo',
                  'is_in_stock', 'has_free_delivery', 'is_organic',
                  'is_featured', 'distance_km', 'created_at']

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
            return None
        try:
            farmer_lat = float(request.query_params.get('lat', 0))
            farmer_lng = float(request.query_params.get('lng', 0))
            seller_lat = float(obj.seller.latitude or 0)
            seller_lng = float(obj.seller.longitude or 0)
            if not (farmer_lat and farmer_lng and seller_lat and seller_lng):
                return None
            # Haversine formula
            R = 6371
            dlat = math.radians(seller_lat - farmer_lat)
            dlng = math.radians(seller_lng - farmer_lng)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(farmer_lat)) * math.cos(math.radians(seller_lat)) * math.sin(dlng/2)**2
            dist = R * 2 * math.asin(math.sqrt(a))
            return round(dist, 1)
        except Exception:
            return None


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    seller_shop_name = serializers.CharField(source='seller.seller_profile.shop_name', read_only=True, default='')
    seller_shop_logo = serializers.SerializerMethodField()
    seller_location = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = '__all__'

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
