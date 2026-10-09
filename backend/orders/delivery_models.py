from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class DeliveryProfile(models.Model):
    """Live duty state and last known location of a delivery partner."""

    VEHICLE_CHOICES = [
        ('bike', 'Bike'),
        ('tempo', 'Tempo / Small truck'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='delivery_profile'
    )
    is_online = models.BooleanField(default=False)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_updated_at = models.DateTimeField(null=True, blank=True)
    vehicle_type = models.CharField(max_length=10, choices=VEHICLE_CHOICES, default='bike')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.full_name} ({'online' if self.is_online else 'offline'})"

    def set_location(self, lat, lng):
        self.latitude = lat
        self.longitude = lng
        self.location_updated_at = timezone.now()

    @property
    def has_location(self):
        return self.latitude is not None and self.longitude is not None


class DeliveryOffer(models.Model):
    """An order offered to one delivery partner at a time (like a Zomato trip offer)."""

    PENDING = 'pending'
    ACCEPTED = 'accepted'
    DECLINED = 'declined'
    EXPIRED = 'expired'
    CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (ACCEPTED, 'Accepted'),
        (DECLINED, 'Declined'),
        (EXPIRED, 'Expired'),
        (CANCELLED, 'Cancelled'),
    ]

    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='offers')
    partner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='delivery_offers'
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    distance_to_shop_km = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            # An order can only have one live offer at a time, even with concurrent requests
            models.UniqueConstraint(
                fields=['order'], condition=Q(status='pending'), name='one_pending_offer_per_order'
            ),
        ]

    def __str__(self):
        return f"Offer #{self.pk} order {self.order_id} -> {self.partner_id} ({self.status})"

    @property
    def is_live(self):
        return self.status == self.PENDING and self.expires_at > timezone.now()
