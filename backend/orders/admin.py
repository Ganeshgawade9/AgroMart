from django.contrib import admin
from .models import Order, OrderItem
from .payment_models import Payment


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'farmer', 'seller', 'status', 'total', 'created_at']
    list_filter = ['status', 'payment_method']
    inlines = [OrderItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['payment_id', 'farmer', 'seller', 'amount', 'payment_method', 'status', 'created_at']
    list_filter = ['status', 'payment_method', 'gateway']
    search_fields = ['payment_id', 'transaction_id', 'reference_number']
    readonly_fields = ['payment_id', 'created_at', 'updated_at']
