from rest_framework import serializers
from .models import Order, OrderItem, Invoice
from products.serializers import ProductListSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    product_image = serializers.ImageField(source='product.image', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True, default='')
    discount_percent = serializers.DecimalField(source='product.discount_percent', read_only=True, max_digits=5, decimal_places=2, default=0)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_price', 'quantity', 'subtotal', 'product_image', 'category_name', 'discount_percent']
        read_only_fields = ['product_name', 'product_price', 'subtotal']


class OrderCreateSerializer(serializers.Serializer):
    items = serializers.ListField(child=serializers.DictField())
    delivery_address = serializers.CharField()
    delivery_village = serializers.CharField(allow_blank=True)
    delivery_taluka = serializers.CharField(allow_blank=True)
    delivery_district = serializers.CharField(allow_blank=True)
    delivery_pincode = serializers.CharField(allow_blank=True)
    delivery_phone = serializers.CharField()
    delivery_latitude = serializers.FloatField(required=False, allow_null=True, min_value=-90, max_value=90)
    delivery_longitude = serializers.FloatField(required=False, allow_null=True, min_value=-180, max_value=180)
    payment_method = serializers.ChoiceField(choices=['cod', 'upi', 'razorpay'])
    notes = serializers.CharField(allow_blank=True, required=False)
    coupon_code = serializers.CharField(allow_blank=True, required=False)


class OrderListSerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    seller_shop_name = serializers.CharField(source='seller.seller_profile.shop_name', read_only=True, default='')
    seller_shop_logo = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'order_number', 'status', 'payment_method', 'payment_status',
                  'total', 'created_at', 'items_count', 'seller_shop_name', 'seller_shop_logo', 'delivered_at']

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


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source='seller.full_name', read_only=True)
    seller_shop_name = serializers.CharField(source='seller.seller_profile.shop_name', read_only=True, default='')
    seller_shop_logo = serializers.SerializerMethodField()
    farmer_name = serializers.CharField(source='farmer.full_name', read_only=True)
    payment_details = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True, default='')

    class Meta:
        model = Order
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # The OTP proves the farmer received the order. Sellers and delivery
        # partners must not be able to read it from the API.
        request = self.context.get('request')
        if not request or getattr(request.user, 'role', None) != 'farmer':
            data.pop('delivery_otp', None)
        return data

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

    def get_payment_details(self, obj):
        """Get payment details from linked Payment record."""
        payment = obj.payments.order_by('-created_at').first()
        if payment:
            return {
                'payment_id': payment.payment_id,
                'transaction_id': payment.transaction_id,
                'reference_number': payment.reference_number,
                'gateway': payment.gateway,
                'status': payment.status,
                'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
            }
        return None



def _coord(value):
    return float(value) if value is not None else None


class DeliveryOrderSerializer(serializers.ModelSerializer):
    """What a delivery partner needs to pick up and deliver an assigned order."""
    items = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source='farmer.full_name', read_only=True)
    shop_name = serializers.SerializerMethodField()
    shop_address = serializers.SerializerMethodField()
    shop_phone = serializers.CharField(source='seller.phone', read_only=True)
    shop_latitude = serializers.SerializerMethodField()
    shop_longitude = serializers.SerializerMethodField()
    customer_latitude = serializers.SerializerMethodField()
    customer_longitude = serializers.SerializerMethodField()
    cash_to_collect = serializers.SerializerMethodField()
    ready_for_pickup = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'payment_method', 'payment_status', 'total',
            'delivery_charge', 'created_at', 'delivered_at', 'rider_assigned_at', 'picked_up_at',
            'estimated_prep_minutes', 'items', 'customer_name', 'delivery_address',
            'delivery_village', 'delivery_taluka', 'delivery_district', 'delivery_pincode',
            'delivery_phone', 'customer_latitude', 'customer_longitude', 'shop_name',
            'shop_address', 'shop_phone', 'shop_latitude', 'shop_longitude',
            'cash_to_collect', 'ready_for_pickup',
        ]

    def get_items(self, obj):
        return [{'name': i.product_name, 'quantity': i.quantity} for i in obj.items.all()]

    def get_shop_name(self, obj):
        profile = getattr(obj.seller, 'seller_profile', None)
        return profile.shop_name if profile else obj.seller.full_name

    def get_shop_address(self, obj):
        parts = [obj.seller.address, obj.seller.village, obj.seller.district]
        return ', '.join(p for p in parts if p)

    def get_shop_latitude(self, obj):
        return _coord(obj.seller.latitude)

    def get_shop_longitude(self, obj):
        return _coord(obj.seller.longitude)

    def get_customer_latitude(self, obj):
        return _coord(obj.delivery_latitude)

    def get_customer_longitude(self, obj):
        return _coord(obj.delivery_longitude)

    def get_cash_to_collect(self, obj):
        if obj.payment_method == Order.COD and obj.payment_status != 'paid':
            return float(obj.total)
        return 0

    def get_ready_for_pickup(self, obj):
        return obj.status == Order.PACKED
