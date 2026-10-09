from django.urls import path
from . import views

urlpatterns = [
    path('nearby-shops/', views.NearbyShopsView.as_view(), name='nearby_shops'),
]
