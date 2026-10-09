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