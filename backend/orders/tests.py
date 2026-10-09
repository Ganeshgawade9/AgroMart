from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from unittest import mock

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
        self.order.refresh_from_db()
        self.assertEqual(len(self.order.pickup_otp), 6)
        self.assertEqual(rider.post(f'/api/orders/delivery/{self.order.id}/pickup/', {'otp': self.order.pickup_otp}, format='json').status_code, 200)

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


class HandoverOtpTests(TestCase):
    """seller -> rider (pickup OTP) and rider -> farmer (delivery OTP)."""

    def setUp(self):
        self.seller = User.objects.create_user(
            email='shop@example.com', password='x', full_name='Shop', role='seller',
            phone='9000000001', latitude=18.5907, longitude=73.7390)
        self.farmer = User.objects.create_user(
            email='farmer@example.com', password='x', full_name='Farmer', role='farmer', phone='9000000002')
        self.rider = User.objects.create_user(email='rider@example.com', password='x', full_name='Rider', role='delivery')
        self.other_rider = User.objects.create_user(email='rider2@example.com', password='x', full_name='Rider 2', role='delivery')
        category = Category.objects.create(name='Fert', slug='fert', category_type='fertilizer')
        product = Product.objects.create(
            seller=self.seller, category=category, name='Urea', description='d', image='x.png',
            price=100, mrp=120, stock=10)
        self.order = Order.objects.create(
            farmer=self.farmer, seller=self.seller, delivery_partner=self.rider, status=Order.ACCEPTED,
            subtotal=100, total=105, payment_method='cod', delivery_address='Farm road',
            delivery_phone='9999999999', delivery_otp='123456')
        OrderItem.objects.create(order=self.order, product=product, quantity=1)
        self.pickup_url = f'/api/orders/delivery/{self.order.id}/pickup/'
        self.deliver_url = f'/api/orders/delivery/{self.order.id}/deliver/'

    def pack(self):
        with mock.patch('orders.otp.send_sms') as sms:
            api(self.seller).post(f'/api/orders/{self.order.id}/update-status/', {'status': 'packed'}, format='json')
        self.order.refresh_from_db()
        return sms

    def test_packing_sends_pickup_otp_to_seller_mobile(self):
        sms = self.pack()
        self.assertEqual(len(self.order.pickup_otp), 6)
        phone, message = sms.call_args.args
        self.assertEqual(phone, '9000000001')
        self.assertIn(self.order.pickup_otp, message)

    def test_pickup_needs_correct_otp(self):
        self.pack()
        rider = api(self.rider)
        self.assertEqual(rider.post(self.pickup_url).status_code, 400)
        self.assertEqual(rider.post(self.pickup_url, {'otp': '000000'}, format='json').status_code, 400)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.PACKED)

        with mock.patch('orders.otp.send_sms') as sms:
            response = rider.post(self.pickup_url, {'otp': self.order.pickup_otp}, format='json')
        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.OUT_FOR_DELIVERY)
        self.assertEqual(self.order.pickup_otp, '')  # single use
        # Farmer's delivery OTP is texted to the farmer once the order is on its way
        phone, message = sms.call_args.args
        self.assertEqual(phone, '9000000002')
        self.assertIn('123456', message)

    def test_pickup_locks_after_too_many_wrong_otps_until_seller_resends(self):
        self.pack()
        rider = api(self.rider)
        real = self.order.pickup_otp
        for _ in range(5):
            rider.post(self.pickup_url, {'otp': '000000'}, format='json')
        locked = rider.post(self.pickup_url, {'otp': real}, format='json')
        self.assertEqual(locked.status_code, 400)
        self.assertIn('Too many', locked.json()['error'])

        with mock.patch('orders.otp.send_sms'):
            Order.objects.filter(pk=self.order.pk).update(pickup_otp_sent_at=None)
            self.assertEqual(api(self.seller).post(f'/api/orders/{self.order.id}/resend-pickup-otp/').status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.pickup_otp_attempts, 0)
        self.assertEqual(rider.post(self.pickup_url, {'otp': self.order.pickup_otp}, format='json').status_code, 200)

    def test_resend_is_rate_limited_and_seller_only(self):
        self.pack()
        url = f'/api/orders/{self.order.id}/resend-pickup-otp/'
        self.assertEqual(api(self.seller).post(url).status_code, 429)
        self.assertEqual(api(self.rider).post(url).status_code, 403)

    def test_only_assigned_rider_can_pick_up(self):
        self.pack()
        response = api(self.other_rider).post(self.pickup_url, {'otp': self.order.pickup_otp}, format='json')
        self.assertEqual(response.status_code, 404)

    def test_status_endpoint_cannot_bypass_pickup_otp(self):
        self.pack()
        for user in (self.seller, self.rider):
            response = api(user).post(f'/api/orders/{self.order.id}/update-status/', {'status': 'out_for_delivery'}, format='json')
            self.assertEqual(response.status_code, 400)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.PACKED)

    def test_manual_assignment_still_requires_pickup_otp(self):
        self.pack()
        Order.objects.filter(pk=self.order.pk).update(delivery_partner=None)
        response = api(self.seller).post(
            f'/api/orders/{self.order.id}/assign-delivery/', {'delivery_partner_id': self.rider.id}, format='json')
        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.PACKED)
        self.assertEqual(api(self.rider).post(self.pickup_url, {'otp': self.order.pickup_otp}, format='json').status_code, 200)

    def test_delivery_otp_locks_after_wrong_attempts_and_farmer_can_get_a_new_one(self):
        Order.objects.filter(pk=self.order.pk).update(status=Order.OUT_FOR_DELIVERY)
        rider = api(self.rider)
        for _ in range(5):
            self.assertEqual(rider.post(self.deliver_url, {'otp': '000000'}, format='json').status_code, 400)
        self.assertIn('Too many', rider.post(self.deliver_url, {'otp': '123456'}, format='json').json()['error'])

        with mock.patch('orders.otp.send_sms') as sms:
            self.assertEqual(api(self.farmer).post(f'/api/orders/{self.order.id}/resend-delivery-otp/').status_code, 200)
        self.order.refresh_from_db()
        self.assertNotEqual(self.order.delivery_otp, '')
        self.assertIn(self.order.delivery_otp, sms.call_args.args[1])
        self.assertEqual(rider.post(self.deliver_url, {'otp': self.order.delivery_otp}, format='json').status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.DELIVERED)

    def test_pickup_otp_visible_only_to_the_seller(self):
        self.pack()
        url = f'/api/orders/{self.order.id}/'
        self.assertEqual(api(self.seller).get(url).json()['pickup_otp'], self.order.pickup_otp)
        self.assertNotIn('pickup_otp', api(self.farmer).get(url).json())
        self.assertNotIn('pickup_otp', api(self.rider).get(url).json())
        for user in (self.seller, self.farmer, self.rider):
            self.assertNotIn('pickup_otp_attempts', api(user).get(url).json())
