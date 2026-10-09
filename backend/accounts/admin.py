from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, SellerProfile, FarmerProfile


class SellerProfileInline(admin.StackedInline):
    model = SellerProfile
    can_delete = False


class FarmerProfileInline(admin.StackedInline):
    model = FarmerProfile
    can_delete = False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'full_name', 'role', 'is_approved', 'is_active', 'created_at']
    list_filter = ['role', 'is_approved', 'is_active']
    search_fields = ['email', 'full_name', 'phone', 'village', 'district']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('full_name', 'phone', 'profile_picture', 'role')}),
        ('Location', {'fields': ('latitude', 'longitude', 'address', 'village', 'taluka', 'district', 'state', 'pincode')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_approved', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'full_name', 'role', 'password1', 'password2')}),
    )

admin.register(SellerProfile)(type('SellerProfileAdmin', (admin.ModelAdmin,), {'list_display': ['shop_name', 'user', 'is_verified', 'total_earnings']}))
admin.register(FarmerProfile)(type('FarmerProfileAdmin', (admin.ModelAdmin,), {'list_display': ['user', 'land_area', 'crops_grown']}))
