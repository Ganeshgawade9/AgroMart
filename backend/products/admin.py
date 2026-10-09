from django.contrib import admin
from .models import Product, Category, Brand, Review

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'seller', 'category', 'price', 'stock', 'is_active', 'rating']
    list_filter = ['is_active', 'is_featured', 'category']
    search_fields = ['name', 'seller__seller_profile__shop_name']

admin.site.register(Category)
admin.site.register(Brand)
admin.site.register(Review)
