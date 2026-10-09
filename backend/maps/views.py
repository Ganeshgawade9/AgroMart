from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.contrib.auth import get_user_model
import math

User = get_user_model()


def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


class NearbyShopsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            lat = float(request.query_params.get('lat', 0))
            lng = float(request.query_params.get('lng', 0))
            radius = float(request.query_params.get('radius', 20))
        except ValueError:
            return Response({'error': 'Invalid coordinates'}, status=400)

        if not lat or not lng:
            return Response({'error': 'lat and lng are required'}, status=400)

        lat_delta = radius / 111
        lng_delta = radius / (111 * math.cos(math.radians(lat)))

        sellers = User.objects.filter(
            role='seller',
            is_approved=True,
            is_active=True,
            latitude__range=(lat - lat_delta, lat + lat_delta),
            longitude__range=(lng - lng_delta, lng + lng_delta),
        ).select_related('seller_profile')

        shops = []
        for seller in sellers:
            if seller.latitude and seller.longitude:
                dist = haversine(lat, lng, float(seller.latitude), float(seller.longitude))
                if dist <= radius:
                    shops.append({
                        'id': seller.id,
                        'shop_name': seller.seller_profile.shop_name if hasattr(seller, 'seller_profile') else seller.full_name,
                        'address': seller.address,
                        'village': seller.village,
                        'district': seller.district,
                        'latitude': float(seller.latitude),
                        'longitude': float(seller.longitude),
                        'distance_km': round(dist, 1),
                        'rating': float(seller.seller_profile.rating) if hasattr(seller, 'seller_profile') else 0,
                        'phone': seller.phone,
                    })

        shops.sort(key=lambda x: x['distance_km'])
        return Response({'shops': shops, 'count': len(shops)})
