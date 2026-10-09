from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class Order(models.Model):
    PENDING = 'pending'
    ACCEPTED = 'accepted'
    PACKED = 'packed'
    OUT_FOR_DELIVERY = 'out_for_delivery'
    DELIVERED = 'delivered'
    CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (PENDING, 'Order Placed'),
        (ACCEPTED, 'Seller Accepted'),
        (PACKED, 'Packed'),
        (OUT_FOR_DELIVERY, 'Out for Delivery'),
        (DELIVERED, 'Delivered'),
        (CANCELLED, 'Cancelled'),
    ]

    COD = 'cod'
    UPI = 'upi'
    RAZORPAY = 'razorpay'

    PAYMENT_CHOICES = [
        (COD, 'Cash on Delivery'),
        (UPI, 'UPI'),
        (RAZORPAY, 'Razorpay'),
    ]

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    farmer = models.ForeignKey(User, on_delete=models.PROTECT, related_name='orders', limit_choices_to={'role': 'farmer'})
    seller = models.ForeignKey(User, on_delete=models.PROTECT, related_name='received_orders', limit_choices_to={'role': 'seller'})
    delivery_partner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deliveries', limit_choices_to={'role': 'delivery'})

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default=COD)
    payment_status = models.CharField(max_length=20, default='pending')
    razorpay_order_id = models.CharField(max_length=100, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_charge = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    delivery_address = models.TextField()
    delivery_village = models.CharField(max_length=100, blank=True)
    delivery_taluka = models.CharField(max_length=100, blank=True)
    delivery_district = models.CharField(max_length=100, blank=True)
    delivery_pincode = models.CharField(max_length=10, blank=True)
    delivery_phone = models.CharField(max_length=15)
    # Optional map pin of the delivery address (used for rider dispatch and navigation)
    delivery_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    delivery_otp = models.CharField(max_length=6, blank=True)
    notes = models.TextField(blank=True)

    # Shipping / Tracking fields
    tracking_number = models.CharField(max_length=100, blank=True)
    expected_delivery = models.DateField(null=True, blank=True)

    # Dispatch / delivery timeline
    estimated_prep_minutes = models.PositiveSmallIntegerField(default=20)
    rider_assigned_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"AGR{str(uuid.uuid4().int)[:10].upper()}"
        if not self.tracking_number:
            self.tracking_number = f"TRK{str(uuid.uuid4().int)[:10].upper()}"
        if not self.expected_delivery:
            from django.utils import timezone
            from datetime import timedelta
            self.expected_delivery = (timezone.now() + timedelta(days=3)).date()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.order_number}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.PROTECT, related_name='order_items')
    product_name = models.CharField(max_length=200)  # snapshot
    product_price = models.DecimalField(max_digits=10, decimal_places=2)  # snapshot
    quantity = models.IntegerField(default=1)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.product_name = self.product.name
        self.product_price = self.product.price
        self.subtotal = self.product_price * self.quantity
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"


class Invoice(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=20, unique=True)
    pdf_file = models.FileField(upload_to='invoices/', blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"Invoice {self.invoice_number}"


# Import Payment model so Django discovers it for migrations
from .payment_models import Payment  # noqa: E402, F401
from .delivery_models import DeliveryProfile, DeliveryOffer  # noqa: E402, F401