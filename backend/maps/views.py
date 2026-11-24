from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.contrib.auth import get_user_model
import math
from .routing import haversine, enrich_shops_with_road_distance, fetch_route_info

User = get_user_model()


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

        mode = request.query_params.get('mode', 'driving').lower()
        if mode not in ('driving', 'walking'):
            mode = 'driving'

        lat_delta = radius / 111.0
        lng_delta = radius / (111.0 * max(0.1, math.cos(math.radians(lat))))

        sellers = User.objects.filter(
            role='seller',
            is_approved=True,
            is_active=True,
            latitude__range=(lat - lat_delta, lat + lat_delta),
            longitude__range=(lng - lng_delta, lng + lng_delta),
        ).select_related('seller_profile')

        candidate_shops = []
        for seller in sellers:
            if seller.latitude and seller.longitude:
                straight_dist = haversine(lat, lng, float(seller.latitude), float(seller.longitude))
                if straight_dist <= radius:
                    candidate_shops.append({
                        'id': seller.id,
                        'shop_name': seller.seller_profile.shop_name if hasattr(seller, 'seller_profile') else seller.full_name,
                        'address': seller.address,
                        'village': seller.village,
                        'district': seller.district,
                        'latitude': float(seller.latitude),
                        'longitude': float(seller.longitude),
                        'straight_line_km': round(straight_dist, 1),
                        'rating': float(seller.seller_profile.rating) if hasattr(seller, 'seller_profile') else 0,
                        'phone': seller.phone,
                    })

        # Enrich with actual road distances (OSRM table & foot routing)
        enriched_shops = enrich_shops_with_road_distance(lat, lng, candidate_shops, preferred_mode=mode)
        enriched_shops.sort(key=lambda x: x['distance_km'])

        return Response({
            'shops': enriched_shops,
            'count': len(enriched_shops),
            'mode': mode,
        })


class RouteView(APIView):
    """
    Returns actual road route polyline coordinates, distance (km), and estimated duration (mins)
    between user location and a shop.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            origin_lat = float(request.query_params.get('origin_lat', 0))
            origin_lng = float(request.query_params.get('origin_lng', 0))
            dest_lat = float(request.query_params.get('dest_lat', 0))
            dest_lng = float(request.query_params.get('dest_lng', 0))
        except (TypeError, ValueError):
            return Response({'error': 'Invalid coordinates'}, status=400)

        if not origin_lat or not origin_lng or not dest_lat or not dest_lng:
            return Response({'error': 'origin_lat, origin_lng, dest_lat, dest_lng are required'}, status=400)

        mode = request.query_params.get('mode', 'driving').lower()
        if mode not in ('driving', 'walking'):
            mode = 'driving'

        route_data = fetch_route_info(origin_lat, origin_lng, dest_lat, dest_lng, mode=mode)
        return Response(route_data)


def parse_nominatim_address(data, lat=None, lng=None):
    import re
    addr = data.get('address', {})
    village = (
        addr.get('suburb') or
        addr.get('village') or
        addr.get('neighbourhood') or
        addr.get('hamlet') or
        addr.get('town') or
        addr.get('city_district') or
        ''
    )
    raw_taluka = (
        addr.get('county') or
        addr.get('subdistrict') or
        addr.get('tehsil') or
        addr.get('taluk') or
        addr.get('mandal') or
        ''
    )
    taluka = re.sub(r'\s*(subdistrict|taluka|tehsil|mandal|taluk)\b', '', raw_taluka, flags=re.I).strip()

    raw_dist = (
        addr.get('state_district') or
        addr.get('district') or
        (addr.get('city') if addr.get('city') != village else '') or
        ''
    )
    district = re.sub(r'\s*(district|dist\.?)\b', '', raw_dist, flags=re.I).strip()

    pincode = str(addr.get('postcode') or addr.get('postal_code') or '').replace(' ', '').strip()
    state = addr.get('state') or 'Maharashtra'
    clean_addr = re.sub(r',\s*India$', '', data.get('display_name', ''), flags=re.I).strip()
    if not clean_addr:
        clean_addr = ', '.join([p for p in [village, taluka, district, state, pincode] if p])

    return {
        'village': village,
        'taluka': taluka,
        'district': district,
        'pincode': pincode,
        'state': state,
        'address': clean_addr,
        'latitude': float(lat) if lat is not None else (float(data['lat']) if 'lat' in data else None),
        'longitude': float(lng) if lng is not None else (float(data['lon']) if 'lon' in data else None),
    }


class ReverseGeocodeView(APIView):
    """Reverse geocodes coordinates into structured village, taluka, district, pincode, state."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import requests
        try:
            lat = float(request.query_params.get('lat', 0))
            lng = float(request.query_params.get('lng', 0))
        except (TypeError, ValueError):
            return Response({'error': 'Invalid coordinates'}, status=400)

        if not lat or not lng:
            return Response({'error': 'lat and lng are required'}, status=400)

        url = f'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lng}&zoom=18&addressdetails=1&accept-language=en'
        headers = {'User-Agent': 'AgroConnect/1.0 (contact@agroconnect.in)'}
        try:
            resp = requests.get(url, headers=headers, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                return Response(parse_nominatim_address(data, lat, lng))
            return Response({'error': 'Geocoding upstream failed'}, status=resp.status_code)
        except Exception as e:
            return Response({'error': str(e)}, status=502)


