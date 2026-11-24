from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from unittest.mock import patch
from .routing import haversine, enrich_shops_with_road_distance, fetch_route_info
from accounts.models import SellerProfile

User = get_user_model()


class MapsRoutingTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.seller = User.objects.create_user(
            email='test_seller_maps@example.com',
            password='testpassword123',
            full_name='Pune Agro Seeds',
            role='seller',
            is_approved=True,
            is_active=True,
            latitude=18.590611,
            longitude=73.746218,
            village='Hinjewadi',
            district='Pune',
            phone='9876543210',
        )
        SellerProfile.objects.create(
            user=self.seller,
            shop_name='Pune Agro Seeds',
            rating=4.8,
        )

    def test_haversine_accuracy(self):
        # Known distance between two points in Pune: ~1.75 km straight line
        dist = haversine(18.579456, 73.7345536, 18.590611, 73.746218)
        self.assertAlmostEqual(dist, 1.75, places=1)

    def test_nearby_shops_endpoint_returns_road_distance(self):
        response = self.client.get('/api/maps/nearby-shops/', {
            'lat': 18.579456,
            'lng': 73.7345536,
            'radius': 20,
            'mode': 'driving',
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('shops', data)
        self.assertGreater(data['count'], 0)
        shop = data['shops'][0]
        self.assertEqual(shop['id'], self.seller.id)
        self.assertIn('distance_km', shop)
        self.assertIn('driving_km', shop)
        self.assertIn('walking_km', shop)
        self.assertIn('duration_minutes', shop)
        # Road distance should be realistic (greater than straight-line 1.75 km)
        self.assertGreaterEqual(shop['distance_km'], 1.7)

    def test_route_endpoint_returns_polyline_and_duration(self):
        response = self.client.get('/api/maps/route/', {
            'origin_lat': 18.579456,
            'origin_lng': 73.7345536,
            'dest_lat': 18.590611,
            'dest_lng': 73.746218,
            'mode': 'walking',
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('distance_km', data)
        self.assertIn('duration_minutes', data)
        self.assertIn('coordinates', data)
        self.assertGreater(len(data['coordinates']), 1)

    def test_route_endpoint_requires_coordinates(self):
        response = self.client.get('/api/maps/route/')
        self.assertEqual(response.status_code, 400)

    def test_fallback_when_routing_offline(self):
        with patch('urllib.request.urlopen', side_effect=Exception('Network offline')):
            info = fetch_route_info(18.579456, 73.7345536, 18.590611, 73.746218, mode='driving')
            self.assertEqual(info['source'], 'circuity_fallback')
            self.assertGreater(info['distance_km'], 1.7)
            self.assertGreater(info['duration_minutes'], 0)

    def test_reverse_geocode_endpoint_requires_coords(self):
        response = self.client.get('/api/maps/reverse-geocode/')
        self.assertEqual(response.status_code, 400)

    @patch('requests.get')
    def test_reverse_geocode_endpoint_parses_details(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            'display_name': 'Hinjawadi, Mulshi Subdistrict, Pune District, Maharashtra, 411057, India',
            'address': {
                'suburb': 'Hinjawadi',
                'county': 'Mulshi Subdistrict',
                'state_district': 'Pune District',
                'postcode': '411057',
                'state': 'Maharashtra',
            }
        }
        response = self.client.get('/api/maps/reverse-geocode/', {'lat': 18.585795, 'lng': 73.738436})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['village'], 'Hinjawadi')
        self.assertEqual(data['taluka'], 'Mulshi')
        self.assertEqual(data['district'], 'Pune')
        self.assertEqual(data['pincode'], '411057')
        self.assertEqual(data['state'], 'Maharashtra')

