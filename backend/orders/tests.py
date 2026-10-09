from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from products.models import Category, Product
from .delivery_models import DeliveryOffer
from .models import Order, OrderItem

User = get_user_model()


def api(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


class DeliveryDispatchTests(TestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            email='shop@example.com', password='x', full_name='Shop', role='seller',
            latitude=18.5907, longitude=73.7390)
        self.farmer = User.objects.create_user(email='farmer@example.com', password='x', full_name='Farmer', role='farmer')
        self.near = User.objects.create_user(email='near@example.com', password='x', full_name='Near Rider', role='delivery')
        self.far = User.objects.create_user(email='far@example.com', password='x', full_name='Far Rider', role='delivery')
        category = Category.objects.create(name='Fert', slug='fert', category_type='fertilizer')
        product = Product.objects.create(
            seller=self.seller, category=category, name='Urea', description='d', image='x.png',
            price=100, mrp=120, stock=10)
        self.order = Order.objects.create(
            farmer=self.farmer, seller=self.seller, subtotal=100, total=105, payment_method='cod',
            delivery_address='Farm road', delivery_phone='9999999999', delivery_otp='123456',
            delivery_latitude=18.55, delivery_longitude=73.80)
        OrderItem.objects.create(order=self.order, product=product, quantity=1)

    def go_online(self, user, lat, lng):
        return api(user).post('/api/orders/delivery/duty/', {'online': True, 'lat': lat, 'lng': lng}, format='json')

    def accept_order(self):
        return api(self.seller).post(
            f'/api/orders/{self.order.id}/update-status/', {'status': 'accepted'}, format='json')

    def test_going_online_requires_location(self):
        response = api(self.near).post('/api/orders/delivery/duty/', {'online': True}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_only_delivery_partners_can_use_duty_endpoint(self):
        response = api(self.farmer).post('/api/orders/delivery/duty/', {'online': True, 'lat': 18.6, 'lng': 73.7}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_nearest_rider_gets_first_offer(self):
        self.go_online(self.far, 18.70, 73.90)
        self.go_online(self.near, 18.60, 73.75)
        self.accept_order()
        offer = self.order.offers.get()
        self.assertEqual(offer.partner, self.near)
        self.assertEqual(offer.status, DeliveryOffer.PENDING)

    def test_offline_and_far_away_riders_are_skipped(self):
        self.go_online(self.near, 28.6, 77.2)  # Delhi, far outside the dispatch radius
        self.accept_order()
        self.assertFalse(self.order.offers.exists())

    def test_decline_passes_offer_to_next_rider(self):
        self.go_online(self.near, 18.60, 73.75)
        self.go_online(self.far, 18.70, 73.90)
        self.accept_order()
        first = self.order.offers.get()
        api(self.near).post(f'/api/orders/delivery/offers/{first.id}/decline/')
        statuses = {o.partner_id: o.status for o in self.order.offers.all()}
        self.assertEqual(statuses[self.near.id], DeliveryOffer.DECLINED)
        self.assertEqual(statuses[self.far.id], DeliveryOffer.PENDING)

    def test_expired_offer_moves_on_and_expired_accept_fails(self):
        self.go_online(self.near, 18.60, 73.75)
        self.go_online(self.far, 18.70, 73.90)
        self.accept_order()
        first = self.order.offers.get()
        DeliveryOffer.objects.filter(pk=first.pk).update(expires_at=timezone.now() - timedelta(seconds=1))
        api(self.far).get('/api/orders/delivery/offers/')  # polling triggers expiry handling
        first.refresh_from_db()
        self.assertEqual(first.status, DeliveryOffer.EXPIRED)
        self.assertTrue(self.order.offers.filter(partner=self.far, status=DeliveryOffer.PENDING).exists())
        response = api(self.near).post(f'/api/orders/delivery/offers/{first.id}/accept/')
        self.assertEqual(response.status_code, 409)

    def test_full_delivery_flow(self):
        self.go_online(self.near, 18.60, 73.75)
        self.accept_order()
        offer = self.order.offers.get()
        rider = api(self.near)

        self.assertEqual(rider.post(f'/api/orders/delivery/offers/{offer.id}/accept/').status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.delivery_partner, self.near)

        # Cannot collect before the shop has packed it
        self.assertEqual(rider.post(f'/api/orders/delivery/{self.order.id}/pickup/').status_code, 400)
        api(self.seller).post(f'/api/orders/{self.order.id}/update-status/', {'status': 'packed'}, format='json')
        self.assertEqual(rider.post(f'/api/orders/delivery/{self.order.id}/pickup/').status_code, 200)

        tracking = api(self.farmer).get(f'/api/orders/{self.order.id}/tracking/').json()
        self.assertEqual(tracking['stage'], 'on_the_way')

        self.assertEqual(rider.post(f'/api/orders/delivery/{self.order.id}/deliver/', {'otp': '000000'}, format='json').status_code, 400)
        self.assertEqual(rider.post(f'/api/orders/delivery/{self.order.id}/deliver/', {'otp': '123456'}, format='json').status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.DELIVERED)

    def test_only_one_rider_can_win_an_order(self):
        self.go_online(self.near, 18.60, 73.75)
        self.accept_order()
        offer = self.order.offers.get()
        # Someone else assigned the order manually in the meantime
        Order.objects.filter(pk=self.order.pk).update(delivery_partner=self.far)
        response = api(self.near).post(f'/api/orders/delivery/offers/{offer.id}/accept/')
        self.assertEqual(response.status_code, 409)

    def test_delivery_otp_hidden_from_everyone_but_the_farmer(self):
        url = f'/api/orders/{self.order.id}/'
        Order.objects.filter(pk=self.order.pk).update(delivery_partner=self.near)
        self.assertIn('delivery_otp', api(self.farmer).get(url).json())
        self.assertNotIn('delivery_otp', api(self.seller).get(url).json())
        self.assertNotIn('delivery_otp', api(self.near).get(url).json())
