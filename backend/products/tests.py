from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Brand, Category, Product

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
