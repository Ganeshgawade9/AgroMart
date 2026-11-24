from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Brand, Category, Product, Banner

User = get_user_model()
URL = '/api/products/'


class ProductFilterTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.pune = User.objects.create_user(
            email='pune@example.com', password='x', full_name='Pune Shop', role='seller', district='Pune')
        cls.nashik = User.objects.create_user(
            email='nashik@example.com', password='x', full_name='Nashik Shop', role='seller', district='Nashik')
        fert = Category.objects.create(name='Fertilizer', slug='fert', category_type='fertilizer')
        pest = Category.objects.create(name='Pesticide', slug='pest', category_type='pesticide')
        seeds = Category.objects.create(name='Seeds', slug='seeds', category_type='seeds')
        cls.iffco = Brand.objects.create(name='IFFCO')
        cls.bayer = Brand.objects.create(name='Bayer')

        def make(name, seller, category, brand, price, mrp, **kw):
            return Product.objects.create(
                seller=seller, category=category, brand=brand, name=name, description='d',
                image='x.png', price=price, mrp=mrp, **kw)

        cls.urea = make('Urea', cls.pune, fert, cls.iffco, 270, 300, stock=50, unit='bag',
                        rating=4.5, has_free_delivery=True)
        cls.dap = make('DAP', cls.pune, fert, cls.iffco, 1200, 1200, stock=0, unit='bag', rating=3.2)
        cls.spray = make('Neem Spray', cls.nashik, pest, cls.bayer, 400, 800, stock=5, unit='litre',
                         rating=2.0, is_organic=True)
        cls.seed = make('Onion Seeds', cls.nashik, seeds, None, 150, 160, stock=9, unit='kg', rating=0)
        # Listed 40 days ago
        Product.objects.filter(pk=cls.seed.pk).update(created_at=timezone.now() - timedelta(days=40))
        cls.client = APIClient()

    def names(self, **params):
        response = self.client.get(URL, params)
        self.assertEqual(response.status_code, 200)
        return sorted(p['name'] for p in response.data['results'])

    def test_no_filters_returns_everything(self):
        self.assertEqual(len(self.names()), 4)

    def test_single_category_still_works(self):
        self.assertEqual(self.names(category_type='fertilizer'), ['DAP', 'Urea'])

    def test_multiple_categories(self):
        self.assertEqual(self.names(category_type='fertilizer,pesticide'), ['DAP', 'Neem Spray', 'Urea'])

    def test_multiple_brands(self):
        self.assertEqual(self.names(brand=f'{self.iffco.id},{self.bayer.id}'), ['DAP', 'Neem Spray', 'Urea'])
        self.assertEqual(self.names(brand=self.bayer.id), ['Neem Spray'])

    def test_price_range(self):
        self.assertEqual(self.names(min_price=200, max_price=500), ['Neem Spray', 'Urea'])

    def test_rating_and_above(self):
        self.assertEqual(self.names(min_rating=4), ['Urea'])
        self.assertEqual(self.names(min_rating=3), ['DAP', 'Urea'])

    def test_discount_is_computed_from_mrp(self):
        # Urea 10% off, Neem 50% off, Seeds ~6% off, DAP 0%
        self.assertEqual(self.names(min_discount=10), ['Neem Spray', 'Urea'])
        self.assertEqual(self.names(min_discount=50), ['Neem Spray'])

    def test_offers_only_below_mrp(self):
        self.assertEqual(self.names(offers='true'), ['Neem Spray', 'Onion Seeds', 'Urea'])

    def test_availability(self):
        self.assertEqual(self.names(in_stock='true'), ['Neem Spray', 'Onion Seeds', 'Urea'])
        self.assertEqual(self.names(in_stock='false'), ['DAP'])

    def test_free_delivery_and_organic(self):
        self.assertEqual(self.names(free_delivery='true'), ['Urea'])
        self.assertEqual(self.names(organic='true'), ['Neem Spray'])

    def test_pack_unit_multi(self):
        self.assertEqual(self.names(unit='litre,kg'), ['Neem Spray', 'Onion Seeds'])

    def test_district_multi(self):
        self.assertEqual(self.names(district='Pune'), ['DAP', 'Urea'])
        self.assertEqual(self.names(district='Pune,Nashik'), ['DAP', 'Neem Spray', 'Onion Seeds', 'Urea'])

    def test_new_arrivals(self):
        self.assertEqual(self.names(new_arrivals=30), ['DAP', 'Neem Spray', 'Urea'])
        self.assertEqual(len(self.names(new_arrivals=60)), 4)

    def test_filters_combine(self):
        self.assertEqual(
            self.names(category_type='fertilizer,pesticide', min_discount=10, in_stock='true', min_rating=3),
            ['Urea'])

    def test_inactive_products_hidden(self):
        Product.objects.filter(pk=self.urea.pk).update(is_active=False)
        self.assertNotIn('Urea', self.names())


class FilterOptionsTests(TestCase):
    def test_options_only_list_what_exists(self):
        seller = User.objects.create_user(
            email='s@example.com', password='x', full_name='S', role='seller', district='Pune')
        cat = Category.objects.create(name='Fertilizer', slug='fert', category_type='fertilizer')
        Category.objects.create(name='Seeds', slug='seeds', category_type='seeds')  # no products
        used = Brand.objects.create(name='IFFCO')
        Brand.objects.create(name='Unused')
        Product.objects.create(seller=seller, category=cat, brand=used, name='Urea', description='d',
                               image='x.png', price=100, mrp=120, stock=1, unit='bag')
        Product.objects.create(seller=seller, category=cat, brand=used, name='Hidden', description='d',
                               image='x.png', price=900, mrp=900, stock=1, unit='drum', is_active=False)

        response = APIClient().get('/api/products/filter-options/')
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual([c['value'] for c in data['categories']], ['fertilizer'])
        self.assertEqual([b['name'] for b in data['brands']], ['IFFCO'])
        self.assertEqual([u['value'] for u in data['units']], ['bag'])
        self.assertEqual([d['value'] for d in data['districts']], ['Pune'])
        self.assertEqual(data['price'], {'min': 100.0, 'max': 100.0})


class SoldOutListingTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        seller = User.objects.create_user(email='s@example.com', password='x', full_name='S', role='seller')
        cat = Category.objects.create(name='Fertilizer', slug='fert', category_type='fertilizer')

        def make(name, price, stock, **kw):
            return Product.objects.create(seller=seller, category=cat, name=name, description='d',
                                          image='x.png', price=price, mrp=price, stock=stock, **kw)

        # Newest first by default: Gone (sold out) is the newest, then Cheap, then Dear
        cls.dear = make('Dear', 900, 4)
        cls.cheap = make('Cheap', 100, 7)
        cls.gone = make('Gone', 50, 0, is_featured=True)
        cls.also_gone = make('AlsoGone', 60, 0)
        now = timezone.now()
        for offset, product in enumerate([cls.dear, cls.cheap, cls.also_gone, cls.gone]):
            Product.objects.filter(pk=product.pk).update(created_at=now - timedelta(days=10 - offset))
        cls.featured = make('Featured', 10, 3, is_featured=True)

    def names(self, **params):
        response = APIClient().get(URL, params)
        self.assertEqual(response.status_code, 200)
        return [p['name'] for p in response.data['results']]

    def test_sold_out_products_are_still_listed(self):
        self.assertEqual(len(self.names()), 5)
        flags = {p['name']: p['is_in_stock'] for p in APIClient().get(URL).data['results']}
        self.assertFalse(flags['Gone'])
        self.assertTrue(flags['Cheap'])

    def test_sold_out_come_last_with_default_ordering(self):
        # Newest first among the available ones, then the sold-out ones (also newest first)
        self.assertEqual(self.names(), ['Featured', 'Cheap', 'Dear', 'Gone', 'AlsoGone'])

    def test_sold_out_come_last_whatever_the_sort(self):
        # The sold-out Gone (₹50) would be cheapest, but must still come after the available ones
        self.assertEqual(self.names(ordering='price'), ['Featured', 'Cheap', 'Dear', 'Gone', 'AlsoGone'])
        self.assertEqual(self.names(ordering='-price'), ['Dear', 'Cheap', 'Featured', 'AlsoGone', 'Gone'])

    def test_availability_filter_can_still_isolate_sold_out(self):
        self.assertEqual(sorted(self.names(in_stock='false')), ['AlsoGone', 'Gone'])

    def test_featured_list_also_puts_sold_out_last(self):
        response = APIClient().get('/api/products/featured/')
        self.assertEqual(response.status_code, 200)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        self.assertEqual([p['name'] for p in results], ['Featured', 'Gone'])


class BannerAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@example.com', password='adminpass', full_name='Admin User', role='admin', is_staff=True
        )
        self.farmer = User.objects.create_user(
            email='farmer@example.com', password='farmerpass', full_name='Farmer User', role='farmer'
        )
        self.banner1 = Banner.objects.create(
            title='Banner 1',
            subtitle='Offer 1',
            image='banners/b1.png',
            link_url='/products?category_type=fertilizer',
            order=1,
            is_active=True
        )
        self.banner2 = Banner.objects.create(
            title='Banner 2 Inactive',
            subtitle='Offer 2',
            image='banners/b2.png',
            link_url='/products',
            order=2,
            is_active=False
        )

    def test_public_banners_returns_only_active_ordered(self):
        res = self.client.get('/api/products/banners/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.banner1.id)
        self.assertEqual(res.data[0]['title'], 'Banner 1')

    def test_non_admin_cannot_access_admin_banners(self):
        self.client.force_authenticate(user=self.farmer)
        res = self.client.get('/api/products/admin/banners/')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_list_all_banners(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/products/admin/banners/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)

    def test_admin_can_upload_multiple_banners(self):
        self.client.force_authenticate(user=self.admin)
        img1 = SimpleUploadedFile('b1.jpg', b'image_bits_1', content_type='image/jpeg')
        img2 = SimpleUploadedFile('b2.jpg', b'image_bits_2', content_type='image/jpeg')
        res = self.client.post('/api/products/admin/banners/', {
            'images': [img1, img2],
            'title': 'Diwali Sale',
            'link_url': '/products?offers=true'
        }, format='multipart')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(res.data), 2)
        self.assertEqual(Banner.objects.count(), 4)

    def test_admin_can_patch_and_delete_banner(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(f'/api/products/admin/banners/{self.banner2.id}/', {
            'is_active': True,
            'title': 'Activated Banner'
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.banner2.refresh_from_db()
        self.assertTrue(self.banner2.is_active)
        self.assertEqual(self.banner2.title, 'Activated Banner')

        del_res = self.client.delete(f'/api/products/admin/banners/{self.banner2.id}/')
        self.assertEqual(del_res.status_code, 200)
        self.assertFalse(Banner.objects.filter(id=self.banner2.id).exists())


class ProductRestockNotifyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            email='seller_restock@test.com', password='password123', full_name='Krishi Kendra', role='seller'
        )
        self.farmer = User.objects.create_user(
            email='farmer_restock@test.com', password='password123', full_name='Ramesh Farmer', role='farmer'
        )
        self.category = Category.objects.create(name='Seeds', slug='seeds-restock', category_type='seeds')
        self.product = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name='Hybrid Onion Seeds 1kg',
            description='Top quality',
            price=250,
            mrp=300,
            stock=0, # Initially OUT OF STOCK
            unit='kg'
        )

    def test_notify_me_toggle_subscription(self):
        self.client.force_authenticate(user=self.farmer)

        # Initially not subscribed
        get_res = self.client.get(f'/api/products/{self.product.id}/notify-me/')
        self.assertEqual(get_res.status_code, 200)
        self.assertFalse(get_res.data['subscribed'])

        # Subscribe via POST
        post_res = self.client.post(f'/api/products/{self.product.id}/notify-me/')
        self.assertEqual(post_res.status_code, 200)
        self.assertTrue(post_res.data['subscribed'])

        # Check detail serializer includes is_notify_subscribed = True
        detail_res = self.client.get(f'/api/products/{self.product.id}/')
        self.assertEqual(detail_res.status_code, 200)
        self.assertFalse(detail_res.data['is_in_stock'])
        self.assertTrue(detail_res.data['is_notify_subscribed'])

        # Toggle unsubscribe by clicking again
        unsub_res = self.client.post(f'/api/products/{self.product.id}/notify-me/')
        self.assertEqual(unsub_res.status_code, 200)
        self.assertFalse(unsub_res.data['subscribed'])

        detail_res2 = self.client.get(f'/api/products/{self.product.id}/')
        self.assertFalse(detail_res2.data['is_notify_subscribed'])

    def test_restock_triggers_automatic_notification_to_subscribers(self):
        from notifications.models import Notification
        from products.models import ProductNotification

        self.client.force_authenticate(user=self.farmer)
        # Farmer clicks "Notify Me"
        self.client.post(f'/api/products/{self.product.id}/notify-me/')
        self.assertEqual(ProductNotification.objects.filter(user=self.farmer, product=self.product, is_notified=False).count(), 1)

        # Seller restocks the product from 0 to 20
        self.product.stock = 20
        self.product.save()

        # Check that back_in_stock notification was dispatched
        notif = Notification.objects.filter(user=self.farmer, notification_type='back_in_stock').first()
        self.assertIsNotNone(notif)
        self.assertIn('Hybrid Onion Seeds 1kg', notif.message)
        self.assertEqual(notif.order_id, self.product.id)

        # ProductNotification alert should now be marked is_notified=True
        alert = ProductNotification.objects.get(user=self.farmer, product=self.product)
        self.assertTrue(alert.is_notified)
        self.assertIsNotNone(alert.notified_at)

        # Subsequent product updates (e.g. price change or stock 20 -> 18) should NOT send duplicate restock notifications
        initial_notif_count = Notification.objects.filter(user=self.farmer, notification_type='back_in_stock').count()
        self.product.price = 240
        self.product.stock = 18
        self.product.save()
        self.assertEqual(Notification.objects.filter(user=self.farmer, notification_type='back_in_stock').count(), initial_notif_count)


class ProductWishlistTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            email='seller_wish@test.com', password='password123', full_name='Shop Wish', role='seller'
        )
        self.farmer = User.objects.create_user(
            email='farmer_wish@test.com', password='password123', full_name='Farmer Wish', role='farmer'
        )
        self.category = Category.objects.create(name='Fertilizer', slug='fert-wish', category_type='fertilizer')
        self.dap = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name='DAP Fertilizer 50kg',
            description='Phosphorus rich fertilizer',
            price=1350,
            mrp=1450,
            stock=100,
            unit='bag'
        )

    def test_toggle_wishlist_add_and_remove(self):
        self.client.force_authenticate(user=self.farmer)

        # Initially product is not wishlisted
        list_res = self.client.get('/api/products/')
        dap_data = next(p for p in list_res.data['results'] if p['id'] == self.dap.id)
        self.assertFalse(dap_data['is_wishlisted'])
        self.assertEqual(dap_data['description'], 'Phosphorus rich fertilizer')

        # Toggle add to wishlist
        toggle_res1 = self.client.post('/api/products/wishlist/toggle/', {'product_id': self.dap.id}, format='json')
        self.assertEqual(toggle_res1.status_code, 200)
        self.assertTrue(toggle_res1.data['in_wishlist'])

        # Now product is wishlisted in both list and detail
        list_res2 = self.client.get('/api/products/')
        dap_data2 = next(p for p in list_res2.data['results'] if p['id'] == self.dap.id)
        self.assertTrue(dap_data2['is_wishlisted'])

        detail_res = self.client.get(f'/api/products/{self.dap.id}/')
        self.assertTrue(detail_res.data['is_wishlisted'])

        # Toggle remove from wishlist
        toggle_res2 = self.client.post('/api/products/wishlist/toggle/', {'product_id': self.dap.id}, format='json')
        self.assertEqual(toggle_res2.status_code, 200)
        self.assertFalse(toggle_res2.data['in_wishlist'])

        # Wishlist should now be empty
        wish_list = self.client.get('/api/products/wishlist/')
        items = wish_list.data.get('results', wish_list.data)
        self.assertEqual(len(items), 0)

