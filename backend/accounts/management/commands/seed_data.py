"""
Management command to seed the database with realistic demo data.
Run: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from products.models import Category, Brand, Product
from orders.models import Order, OrderItem
import random

User = get_user_model()

DISTRICTS = ['Nashik', 'Pune', 'Ahmednagar', 'Aurangabad', 'Jalgaon', 'Solapur', 'Kolhapur']
TALUKAS  = ['Sinnar', 'Igatpuri', 'Trimbakeshwar', 'Dindori', 'Niphad', 'Yeola', 'Chandwad']
VILLAGES = ['Ozar', 'Ghoti', 'Vinchur', 'Pimpalgaon', 'Savargaon', 'Rampur', 'Deolali', 'Wavi']

CATEGORIES = [
    ('Urea & Nitrogen', 'urea-nitrogen', 'fertilizer'),
    ('DAP Fertilizers', 'dap-fertilizers', 'fertilizer'),
    ('NPK Fertilizers', 'npk-fertilizers', 'fertilizer'),
    ('Organic Fertilizers', 'organic-fertilizers', 'organic'),
    ('Pesticides', 'pesticides', 'pesticide'),
    ('Fungicides', 'fungicides', 'fungicide'),
    ('Herbicides', 'herbicides', 'herbicide'),
    ('Seeds', 'seeds', 'seeds'),
]

BRANDS = ['IFFCO', 'Coromandel', 'UPL', 'Bayer', 'Syngenta', 'Rallis', 'Dhanuka', 'PI Industries']

PRODUCTS = [
    # (name, category_slug, price, mrp, unit, weight, description, is_organic, is_featured)
    ('Urea Fertilizer', 'urea-nitrogen', 280, 310, 'bag', '50kg', 'High quality urea with 46% nitrogen content. Best for all crops.', False, True),
    ('DAP (Diammonium Phosphate)', 'dap-fertilizers', 1350, 1450, 'bag', '50kg', 'Premium DAP with 18% N and 46% P2O5. Ideal for sowing time.', False, True),
    ('NPK 19:19:19', 'npk-fertilizers', 1200, 1350, 'bag', '25kg', 'Balanced NPK fertilizer. Suitable for all stages of crop growth.', False, True),
    ('NPK 12:32:16', 'npk-fertilizers', 1100, 1250, 'bag', '25kg', 'High phosphorus NPK for root development.', False, False),
    ('Vermicompost', 'organic-fertilizers', 450, 500, 'bag', '50kg', '100% organic vermicompost. Improves soil health naturally.', True, True),
    ('Neem Cake Fertilizer', 'organic-fertilizers', 320, 380, 'bag', '25kg', 'Natural neem cake. Organic nitrogen + pest repellent.', True, False),
    ('Chlorpyrifos 20% EC', 'pesticides', 420, 480, 'litre', '1L', 'Broad spectrum insecticide for soil and foliar application.', False, True),
    ('Imidacloprid 17.8% SL', 'pesticides', 380, 420, 'bottle', '500ml', 'Systemic insecticide for sucking pests. Highly effective.', False, False),
    ('Profenofos 50% EC', 'pesticides', 490, 540, 'litre', '1L', 'Contact and systemic insecticide. Effective on bollworms.', False, False),
    ('Mancozeb 75% WP', 'fungicides', 220, 260, 'packet', '500g', 'Broad spectrum fungicide for all foliar diseases.', False, True),
    ('Carbendazim 50% WP', 'fungicides', 290, 330, 'packet', '500g', 'Systemic fungicide. Controls wilt and collar rot.', False, False),
    ('Copper Oxychloride 50% WP', 'fungicides', 180, 220, 'packet', '500g', 'Protective fungicide and bactericide.', False, False),
    ('Glyphosate 41% SL', 'herbicides', 350, 400, 'litre', '1L', 'Non-selective herbicide. Effective on all types of weeds.', False, False),
    ('Atrazine 50% WP', 'herbicides', 240, 280, 'packet', '500g', 'Selective pre-emergence herbicide for maize and sorghum.', False, False),
    ('Tomato Hybrid Seeds F1', 'seeds', 580, 650, 'packet', '10g', 'High yielding tomato hybrid. Suitable for Maharashtra climate.', False, True),
    ('Onion Seeds Bhima Shakti', 'seeds', 420, 480, 'packet', '500g', 'Popular onion variety for Nashik region. High yield potential.', False, True),
]


class Command(BaseCommand):
    help = 'Seed database with demo data for AgroConnect'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Seeding database...'))

        # 1. Create superadmin
        if not User.objects.filter(email='admin@agroconnect.in').exists():
            User.objects.create_superuser(
                email='admin@agroconnect.in',
                password='admin123',
                full_name='Admin User',
                role='admin',
            )
            self.stdout.write(self.style.SUCCESS('✓ Admin created: admin@agroconnect.in / admin123'))

        # 2. Categories
        cat_map = {}
        for name, slug, ctype in CATEGORIES:
            cat, _ = Category.objects.get_or_create(
                slug=slug,
                defaults={'name': name, 'category_type': ctype, 'is_active': True}
            )
            cat_map[slug] = cat
        self.stdout.write(self.style.SUCCESS(f'✓ {len(cat_map)} categories created'))

        # 3. Brands
        brand_objs = []
        for b in BRANDS:
            brand, _ = Brand.objects.get_or_create(name=b, defaults={'is_active': True})
            brand_objs.append(brand)
        self.stdout.write(self.style.SUCCESS(f'✓ {len(brand_objs)} brands created'))

        # 4. Sellers (3 demo sellers around Nashik area)
        seller_data = [
            ('Ganesh Agro Center', 'ganesh@agroconnect.in', 'seller123', 'Ganesh Patil', '9876543210',
             20.0063, 73.7894, 'Sinnar', 'Sinnar', 'Nashik'),
            ('Mahadev Fertilizers', 'mahadev@agroconnect.in', 'seller123', 'Mahadev Shinde', '9876543211',
             20.0154, 73.8012, 'Ozar', 'Niphad', 'Nashik'),
            ('Krishna Agro Supplies', 'krishna@agroconnect.in', 'seller123', 'Krishna Jadhav', '9876543212',
             20.1234, 73.7456, 'Ghoti', 'Igatpuri', 'Nashik'),
        ]
        sellers = []
        for shop_name, email, pwd, full_name, phone, lat, lng, village, taluka, district in seller_data:
            if not User.objects.filter(email=email).exists():
                seller = User.objects.create_user(
                    email=email, password=pwd, full_name=full_name,
                    phone=phone, role='seller', is_approved=True,
                    latitude=lat, longitude=lng,
                    village=village, taluka=taluka, district=district,
                    address=f'{village}, {taluka}, {district}'
                )
                from accounts.models import SellerProfile
                SellerProfile.objects.create(user=seller, shop_name=shop_name, rating=random.uniform(3.5, 5.0))
                sellers.append(seller)
                self.stdout.write(f'  + Seller: {email} / {pwd}')
            else:
                sellers.append(User.objects.get(email=email))
        self.stdout.write(self.style.SUCCESS(f'✓ {len(sellers)} sellers ready'))

        # 5. Farmers
        farmer_data = [
            ('farmer@agroconnect.in', 'farmer123', 'Ramesh Farmer', '9876500001', 20.0100, 73.7900, 'Pimpalgaon', 'Niphad', 'Nashik'),
            ('suresh@agroconnect.in', 'farmer123', 'Suresh Mali', '9876500002', 20.0200, 73.8100, 'Savargaon', 'Sinnar', 'Nashik'),
        ]
        farmers = []
        for email, pwd, full_name, phone, lat, lng, village, taluka, district in farmer_data:
            if not User.objects.filter(email=email).exists():
                farmer = User.objects.create_user(
                    email=email, password=pwd, full_name=full_name,
                    phone=phone, role='farmer',
                    latitude=lat, longitude=lng,
                    village=village, taluka=taluka, district=district,
                )
                from accounts.models import FarmerProfile
                FarmerProfile.objects.create(user=farmer, land_area=5.0, crops_grown='Onion, Tomato, Wheat')
                farmers.append(farmer)
                self.stdout.write(f'  + Farmer: {email} / {pwd}')
            else:
                farmers.append(User.objects.get(email=email))
        self.stdout.write(self.style.SUCCESS(f'✓ {len(farmers)} farmers ready'))

        # 6. Delivery partner
        if not User.objects.filter(email='delivery@agroconnect.in').exists():
            User.objects.create_user(
                email='delivery@agroconnect.in', password='delivery123',
                full_name='Delivery Partner', phone='9876599999',
                role='delivery', village='Nashik', district='Nashik',
                latitude=20.0100, longitude=73.7800,
            )
            self.stdout.write(f'  + Delivery: delivery@agroconnect.in / delivery123')

        # 7. Products
        prod_count = 0
        for name, cat_slug, price, mrp, unit, weight, desc, is_organic, is_featured in PRODUCTS:
            seller = random.choice(sellers)
            cat = cat_map.get(cat_slug)
            brand = random.choice(brand_objs)
            if not Product.objects.filter(name=name, seller=seller).exists():
                Product.objects.create(
                    seller=seller, category=cat, brand=brand,
                    name=name, description=desc,
                    price=price, mrp=mrp,
                    discount_percent=round(((mrp - price) / mrp) * 100, 1),
                    stock=random.randint(10, 100),
                    unit=unit, weight=weight,
                    is_organic=is_organic, is_featured=is_featured,
                    has_free_delivery=(price > 500),
                    rating=round(random.uniform(3.5, 5.0), 1),
                    total_reviews=random.randint(5, 80),
                    is_active=True,
                )
                prod_count += 1
        self.stdout.write(self.style.SUCCESS(f'✓ {prod_count} products created'))

        self.stdout.write(self.style.SUCCESS('\n=== SEED COMPLETE ==='))
        self.stdout.write(self.style.SUCCESS('Demo login credentials:'))
        self.stdout.write('  Admin:    admin@agroconnect.in    / admin123')
        self.stdout.write('  Seller 1: ganesh@agroconnect.in   / seller123')
        self.stdout.write('  Seller 2: mahadev@agroconnect.in  / seller123')
        self.stdout.write('  Farmer:   farmer@agroconnect.in   / farmer123')
        self.stdout.write('  Delivery: delivery@agroconnect.in / delivery123')
        self.stdout.write(self.style.SUCCESS('\nRun: python manage.py runserver'))
