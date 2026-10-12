from django.urls import path
from . import views

urlpatterns = [
    path('', views.ProductListView.as_view(), name='product_list'),
    path('<int:pk>/', views.ProductDetailView.as_view(), name='product_detail'),
    path('featured/', views.FeaturedProductsView.as_view(), name='featured_products'),
    path('categories/', views.CategoryListView.as_view(), name='categories'),
    path('brands/', views.BrandListView.as_view(), name='brands'),
    path('filter-options/', views.FilterOptionsView.as_view(), name='filter_options'),
    # Seller product management
    path('my-products/', views.SellerProductListCreateView.as_view(), name='my_products'),
    path('my-products/<int:pk>/', views.SellerProductUpdateDeleteView.as_view(), name='my_product_detail'),
    # Reviews
    path('<int:product_id>/reviews/', views.ReviewCreateView.as_view(), name='create_review'),
    # Cart
    path('cart/', views.CartView.as_view(), name='cart'),
    path('cart/<int:pk>/', views.CartItemView.as_view(), name='cart_item'),
    path('cart/clear/', views.ClearCartView.as_view(), name='clear_cart'),
    # Wishlist
    path('wishlist/', views.WishlistView.as_view(), name='wishlist'),
    path('wishlist/<int:pk>/', views.WishlistItemView.as_view(), name='wishlist_item'),
]
