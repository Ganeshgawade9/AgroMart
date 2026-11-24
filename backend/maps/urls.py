from django.urls import path
from . import views

urlpatterns = [
    path('nearby-shops/', views.NearbyShopsView.as_view(), name='nearby_shops'),
    path('route/', views.RouteView.as_view(), name='map_route'),
    path('reverse-geocode/', views.ReverseGeocodeView.as_view(), name='reverse_geocode'),
]

