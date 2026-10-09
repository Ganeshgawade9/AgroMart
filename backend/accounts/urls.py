from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('update-location/', views.UpdateLocationView.as_view(), name='update_location'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('seller-profile/', views.UpdateSellerProfileView.as_view(), name='seller_profile'),
    # Admin
    path('admin/sellers/', views.SellerListView.as_view(), name='seller_list'),
    path('admin/sellers/<int:seller_id>/approve/', views.ApproveSeller.as_view(), name='approve_seller'),
    path('admin/farmers/', views.FarmerListView.as_view(), name='farmer_list'),
]

# Admin dashboard
from .admin_views import AdminDashboardStatsView, AdminUserListView, AdminToggleUserView, AdminProductListView
urlpatterns += [
    path('admin/dashboard/', AdminDashboardStatsView.as_view(), name='admin_dashboard'),
    path('admin/users/', AdminUserListView.as_view(), name='admin_users'),
    path('admin/users/<int:user_id>/action/', AdminToggleUserView.as_view(), name='admin_user_action'),
    path('admin/all-products/', AdminProductListView.as_view(), name='admin_products'),
    path('admin/all-products/<int:pk>/', AdminProductListView.as_view(), name='admin_product_detail'),
]
