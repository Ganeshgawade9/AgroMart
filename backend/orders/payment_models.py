from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class Payment(models.Model):
    """
    Payment record tracking every payment attempt.
    Designed to be gateway-agnostic for future real payment integration.
    """
    CREATED = 'created'
    PENDING = 'pending'
    PROCESSING = 'processing'
    PAID = 'paid'
    FAILED = 'failed'
    EXPIRED = 'expired'

    STATUS_CHOICES = [
        (CREATED, 'Created'),
        (PENDING, 'Pending'),
        (PROCESSING, 'Processing'),
        (PAID, 'Paid'),
        (FAILED, 'Failed'),
        (EXPIRED, 'Expired'),
    ]

    COD = 'cod'
    UPI = 'upi'
    RAZORPAY = 'razorpay'

    METHOD_CHOICES = [
        (COD, 'Cash on Delivery'),
        (UPI, 'UPI'),
        (RAZORPAY, 'Razorpay'),
    ]

    MANUAL = 'manual'
    UPI_QR = 'upi_qr'
    RAZORPAY_DEMO = 'razorpay_demo'

    GATEWAY_CHOICES = [
        (MANUAL, 'Manual / COD'),
        (UPI_QR, 'UPI QR Code'),
        (RAZORPAY_DEMO, 'Razorpay Demo'),
    ]

    payment_id = models.CharField(max_length=30, unique=True, editable=False)
    order = models.ForeignKey(
        'orders.Order', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='payments'
    )
    seller = models.ForeignKey(
        User, on_delete=models.PROTECT,
        related_name='received_payments',
        limit_choices_to={'role': 'seller'}
    )
    farmer = models.ForeignKey(
        User, on_delete=models.PROTECT,
        related_name='made_payments',
        limit_choices_to={'role': 'farmer'}
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    gateway = models.CharField(max_length=20, choices=GATEWAY_CHOICES, default=MANUAL)
    transaction_id = models.CharField(max_length=100, blank=True)
    reference_number = models.CharField(max_length=100, blank=True)
    
    # Gateway specific reference IDs
    gateway_order_id = models.CharField(max_length=100, blank=True)
    gateway_payment_id = models.CharField(max_length=100, blank=True)
    failure_reason = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=CREATED)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Store checkout data to create order after payment succeeds
    checkout_data = models.JSONField(default=dict, blank=True)
    # Extra gateway-specific metadata
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.payment_id:
            self.payment_id = f"PAY{str(uuid.uuid4().int)[:10]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Payment {self.payment_id} - {self.status}"
