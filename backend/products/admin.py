from django.contrib import admin
from django.utils.html import format_html
from .models import Product, Category, Brand, Review, Banner, HomeCategory, Crop

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'seller', 'category', 'price', 'stock', 'is_active', 'rating']
    list_filter = ['is_active', 'is_featured', 'category']
    search_fields = ['name', 'seller__seller_profile__shop_name']

@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ['title', 'order', 'is_active', 'created_at']
    list_editable = ['order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['title', 'subtitle', 'link_url']

@admin.register(HomeCategory)
class HomeCategoryAdmin(admin.ModelAdmin):
    list_display = ['image_preview', 'name', 'slug', 'bg_color', 'link_url', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    search_fields = ['name', 'slug', 'link_url']
    readonly_fields = ['image_preview_large']

    def image_preview(self, obj):
        url = obj.image.url if obj.image else obj.default_image
        if url:
            return format_html(
                '<div style="width:38px;height:38px;border-radius:50%;background:{};display:flex;align-items:center;justify-content:center;padding:4px;border:1px solid #e5e7eb;">'
                '<img src="{}" style="max-width:100%;max-height:100%;object-fit:contain;" />'
                '</div>',
                obj.bg_color or '#fff',
                url
            )
        return "-"
    image_preview.short_description = "Preview"

    def image_preview_large(self, obj):
        url = obj.image.url if obj.image else obj.default_image
        if url:
            return format_html(
                '<div style="width:96px;height:96px;border-radius:50%;background:{};display:flex;align-items:center;justify-content:center;padding:8px;border:1px solid #e5e7eb;">'
                '<img src="{}" style="max-width:100%;max-height:100%;object-fit:contain;" />'
                '</div>',
                obj.bg_color or '#fff',
                url
            )
        return "-"
    image_preview_large.short_description = "Current Image Preview"


@admin.register(Crop)
class CropAdmin(admin.ModelAdmin):
    list_display = ['crop_preview', 'name', 'search_query', 'order', 'is_featured', 'is_active']
    list_editable = ['order', 'is_featured', 'is_active']
    list_filter = ['is_featured', 'is_active']
    search_fields = ['name', 'search_query']
    readonly_fields = ['crop_preview_large']

    def crop_preview(self, obj):
        url = obj.image.url if obj.image else obj.default_image
        if url:
            return format_html(
                '<div style="width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;padding:4px;border:1px solid #e5e7eb;">'
                '<img src="{}" style="max-width:100%;max-height:100%;object-fit:contain;" />'
                '</div>',
                url
            )
        return "-"
    crop_preview.short_description = "Preview"

    def crop_preview_large(self, obj):
        url = obj.image.url if obj.image else obj.default_image
        if url:
            return format_html(
                '<div style="width:96px;height:96px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;padding:8px;border:1px solid #e5e7eb;">'
                '<img src="{}" style="max-width:100%;max-height:100%;object-fit:contain;" />'
                '</div>',
                url
            )
        return "-"
    crop_preview_large.short_description = "Current Image Preview"


admin.site.register(Category)
admin.site.register(Brand)
admin.site.register(Review)


