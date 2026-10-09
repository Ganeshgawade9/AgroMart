from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    FARMER = 'farmer'
    SELLER = 'seller'
    DELIVERY = 'delivery'
    ADMIN = 'admin'

    ROLE_CHOICES = [
        (FARMER, 'Farmer'),
        (SELLER, 'Seller'),
        (DELIVERY, 'Delivery Partner'),
        (ADMIN, 'Admin'),
    ]

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True)
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=FARMER)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)  # sellers need admin approval
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Location fields
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    address = models.TextField(blank=True)
    village = models.CharField(max_length=100, blank=True)
    taluka = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True, default='Maharashtra')
    pincode = models.CharField(max_length=10, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.role})"

    @property
    def is_farmer(self):
        return self.role == self.FARMER

    @property
    def is_seller(self):
        return self.role == self.SELLER

    @property
    def is_delivery(self):
        return self.role == self.DELIVERY


class SellerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='seller_profile')
    shop_name = models.CharField(max_length=200)
    shop_description = models.TextField(blank=True)
    shop_logo = models.ImageField(upload_to='shops/', blank=True, null=True)
    gst_number = models.CharField(max_length=20, blank=True)
    bank_account = models.CharField(max_length=20, blank=True)
    ifsc_code = models.CharField(max_length=15, blank=True)
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_reviews = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Payment configuration
    merchant_display_name = models.CharField(max_length=200, blank=True)
    upi_id = models.CharField(max_length=100, blank=True)
    payment_phone = models.CharField(max_length=15, blank=True)
    bank_account_name = models.CharField(max_length=200, blank=True)

    # Payment method toggles
    cod_enabled = models.BooleanField(default=True)
    upi_enabled = models.BooleanField(default=True)
    razorpay_enabled = models.BooleanField(default=False)
    online_payments_enabled = models.BooleanField(default=False)

    # Future Gateway Credentials
    razorpay_key_id = models.CharField(max_length=200, blank=True)
    razorpay_secret = models.CharField(max_length=200, blank=True)
    phonepe_merchant_id = models.CharField(max_length=200, blank=True)
    cashfree_key_id = models.CharField(max_length=200, blank=True)
    cashfree_secret = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['shop_name']

    def __str__(self):
        return self.shop_name


class FarmerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='farmer_profile')
    land_area = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='in acres')
    crops_grown = models.TextField(blank=True, help_text='Comma separated crop names')
    aadhaar_number = models.CharField(max_length=12, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name}'s farm profile"


class PasswordResetOTP(models.Model):
    """One-time code sent by SMS to a user's registered mobile to reset the password."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_otps')
    code_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Password reset OTP for {self.user_id} ({'used' if self.used_at else 'open'})"
