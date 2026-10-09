from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Notification(models.Model):
    NEW_ORDER = 'new_order'
    ORDER_UPDATE = 'order_update'
    PAYMENT = 'payment'
    LOW_STOCK = 'low_stock'
    OFFER = 'offer'

    TYPE_CHOICES = [
        (NEW_ORDER, 'New Order'),
        (ORDER_UPDATE, 'Order Update'),
        (PAYMENT, 'Payment'),
        (LOW_STOCK, 'Low Stock'),
        (OFFER, 'Offer'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message = models.TextField()
    order_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name}: {self.message[:50]}"