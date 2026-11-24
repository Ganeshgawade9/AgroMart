from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Category(models.Model):
    FERTILIZER = 'fertilizer'
    PESTICIDE = 'pesticide'
    HERBICIDE = 'herbicide'
    FUNGICIDE = 'fungicide'
    ORGANIC = 'organic'
    SEEDS = 'seeds'
    EQUIPMENT = 'equipment'

    TYPE_CHOICES = [
        (FERTILIZER, 'Fertilizer'),
        (PESTICIDE, 'Pesticide'),
        (HERBICIDE, 'Herbicide'),
        (FUNGICIDE, 'Fungicide'),
        (ORGANIC, 'Organic'),
        (SEEDS, 'Seeds'),
        (EQUIPMENT, 'Equipment'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    category_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    icon = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Brand(models.Model):
    name = models.CharField(max_length=100)
    category_group = models.CharField(max_length=120, blank=True, default='')  # e.g. 'seeds,crop_protection,popular'
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products', limit_choices_to={'role': 'seller'})
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')

    name = models.CharField(max_length=200)
    description = models.TextField()
    ingredients = models.TextField(blank=True)
    usage_instructions = models.TextField(blank=True)
    image = models.ImageField(upload_to='products/')
    image2 = models.ImageField(upload_to='products/', blank=True, null=True)
    image3 = models.ImageField(upload_to='products/', blank=True, null=True)

    price = models.DecimalField(max_digits=10, decimal_places=2)
    mrp = models.DecimalField(max_digits=10, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    stock = models.IntegerField(default=0)
    unit = models.CharField(max_length=50, default='kg', help_text='e.g. kg, litre, bag')
    weight = models.CharField(max_length=50, blank=True, help_text='e.g. 1kg, 500g')

    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_reviews = models.IntegerField(default=0)

    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_organic = models.BooleanField(default=False)
    has_free_delivery = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        is_restocked = False
        if self.pk:
            old_stock = Product.objects.filter(pk=self.pk).values_list('stock', flat=True).first()
            if old_stock is not None and old_stock <= 0 and self.stock > 0:
                is_restocked = True
        super().save(*args, **kwargs)

        if is_restocked:
            self._notify_subscribers()

    def _notify_subscribers(self):
        from notifications.utils import send_notification
        from django.utils import timezone
        alerts = self.restock_subscribers.filter(is_notified=False)
        for alert in alerts:
            send_notification(
                user=alert.user,
                notification_type='back_in_stock',
                message=f'Good news! "{self.name}" is now back in stock at {self.seller_shop_name}. Hurry and order now!',
                order_id=self.id
            )
        alerts.update(is_notified=True, notified_at=timezone.now())

    @property
    def is_in_stock(self):
        return self.stock > 0

    @property
    def seller_shop_name(self):
        if hasattr(self.seller, 'seller_profile'):
            return self.seller.seller_profile.shop_name
        return self.seller.full_name

    @property
    def seller_location(self):
        return {
            'latitude': float(self.seller.latitude) if self.seller.latitude else None,
            'longitude': float(self.seller.longitude) if self.seller.longitude else None,
            'village': self.seller.village,
            'district': self.seller.district,
        }


class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['product', 'user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name} - {self.product.name} ({self.rating}★)"


class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlisted_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'product']
        ordering = ['-created_at']


class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='in_carts')
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'product']
        ordering = ['-added_at']

    @property
    def subtotal(self):
        return self.product.price * self.quantity


class Banner(models.Model):
    title = models.CharField(max_length=200, blank=True)
    subtitle = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to='banners/')
    link_url = models.CharField(max_length=500, blank=True, default='', help_text="Target URL or frontend route (e.g. /products?category_type=fertilizer)")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order, lowest first")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title or f"Banner #{self.id}"


class ProductNotification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_notifications')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='restock_subscribers')
    is_notified = models.BooleanField(default=False)
    notified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'product']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name} -> {self.product.name} (Notified: {self.is_notified})"


class HomeCategory(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, help_text="Unique identifier e.g. offers, sprayers, vegetable_seeds")
    title_key = models.CharField(max_length=100, blank=True, default='', help_text="i18n translation key e.g. cat.offers")
    image = models.ImageField(upload_to='categories/', blank=True, null=True, help_text="Upload custom category image from admin")
    default_image = models.CharField(max_length=255, blank=True, default='', help_text="Fallback static image path (e.g. /categories/offers.svg)")
    bg_color = models.CharField(max_length=30, blank=True, default='#f3f4f6', help_text="Hex code for tile background (e.g. #d1fae5)")
    link_url = models.CharField(max_length=255, blank=True, default='/products', help_text="Frontend route or link (e.g. /products?category_type=seeds)")
    order = models.PositiveIntegerField(default=0, help_text="Display order on home page, lowest first")
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Home Category'
        verbose_name_plural = 'Home Categories'
        ordering = ['order', 'id']

    def __str__(self):
        return self.name

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return self.default_image


class Crop(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    search_query = models.CharField(max_length=100, blank=True, help_text="Product search term e.g. Tomato, Chilli")
    image = models.ImageField(upload_to='crops/', blank=True, null=True, help_text="Upload custom crop image from admin")
    default_image = models.CharField(max_length=255, blank=True, default='', help_text="Fallback static image path (e.g. /crops/tomato.png)")
    order = models.PositiveIntegerField(default=0, help_text="Display order, lowest first")
    is_featured = models.BooleanField(default=False, help_text="Show in Home Page horizontal row")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return self.default_image