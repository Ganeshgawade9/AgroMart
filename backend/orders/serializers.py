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
