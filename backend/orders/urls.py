from django.urls import path
from . import views
from .invoice_views import DownloadInvoiceView
from .dashboard_views import SellerDashboardStatsView
from .payment_views import (
    InitiatePaymentView,
    PaymentStatusView,
    PaymentVerifyView,
    SellerPaymentSettingsView,
    PaymentAnalyticsView,
)

urlpatterns = [
    path('place/', views.PlaceOrderView.as_view(), name='place_order'),
    path('my-orders/', views.FarmerOrderListView.as_view(), name='farmer_orders'),
    path('seller-orders/', views.SellerOrderListView.as_view(), name='seller_orders'),
    path('seller-dashboard-stats/', SellerDashboardStatsView.as_view(), name='seller_dashboard_stats'),
    path('<int:pk>/', views.OrderDetailView.as_view(), name='order_detail'),
    path('<int:order_id>/update-status/', views.UpdateOrderStatusView.as_view(), name='update_order_status'),
    path('<int:order_id>/invoice/', DownloadInvoiceView.as_view(), name='download_invoice'),
    path('razorpay/create/', views.RazorpayCreateOrderView.as_view(), name='razorpay_create'),

    # Payment endpoints
    path('payments/initiate/', InitiatePaymentView.as_view(), name='payment_initiate'),
    path('payments/<str:payment_id>/status/', PaymentStatusView.as_view(), name='payment_status'),
    path('payments/<str:payment_id>/verify/', PaymentVerifyView.as_view(), name='payment_verify'),
    path('payments/seller-analytics/', PaymentAnalyticsView.as_view(), name='payment_analytics'),
    path('seller-payment-settings/', SellerPaymentSettingsView.as_view(), name='seller_payment_settings'),
]

from .views import DeliveryOrderListView, DeliveryUpdateStatusView, AssignDeliveryView
urlpatterns += [
    path('delivery/my-deliveries/', DeliveryOrderListView.as_view(), name='delivery_orders'),
    path('delivery/<int:order_id>/deliver/', DeliveryUpdateStatusView.as_view(), name='delivery_complete'),
    path('<int:order_id>/assign-delivery/', AssignDeliveryView.as_view(), name='assign_delivery'),
]
