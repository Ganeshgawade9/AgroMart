import os
import django
from decimal import Decimal
from PIL import Image

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import Brand, Category, Product
from django.contrib.auth import get_user_model

User = get_user_model()

MEDIA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'media', 'products')
os.makedirs(MEDIA_DIR, exist_ok=True)
BRAIN_DIR = r"C:\Users\ganes\.gemini\antigravity-ide\brain\09d22570-b7ae-4fe8-b7ea-55041d68d923"

def copy_and_resize(source_path, target_filename, target_size=(480, 600)):
    target_path = os.path.join(MEDIA_DIR, target_filename)
    if os.path.exists(source_path):
        img = Image.open(source_path)
        img = img.convert('RGB')
        # Center-crop or fit to 480x600 with white background padding
        target_w, target_h = target_size
        img.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
        final_img = Image.new('RGB', target_size, (255, 255, 255))
        offset_x = (target_w - img.width) // 2
        offset_y = (target_h - img.height) // 2
        final_img.paste(img, (offset_x, offset_y))
        final_img.save(target_path, 'WEBP', quality=90)
        print(f"Saved: {target_filename} (480x600)")
        return f"products/{target_filename}"
    else:
        print(f"Source not found: {source_path}")
        return None

# Resize generated seed images
image_mapping = {
    'syngenta_saaho_tomato_480x600.webp': os.path.join(BRAIN_DIR, 'syngenta_saaho_tomato_1792745230611.jpg'),
    'seminis_abhilash_tomato_480x600.webp': os.path.join(BRAIN_DIR, 'seminis_abhilash_tomato_1792745254839.jpg'),
    'advanta_raadhika_bhindi_480x600.webp': os.path.join(BRAIN_DIR, 'advanta_raadhika_bhindi_1792745283900.jpg'),
    'namdhari_ns295_watermelon_480x600.webp': os.path.join(BRAIN_DIR, 'namdhari_ns295_watermelon_1792745305552.jpg'),
    'vnr_212_brinjal_480x600.webp': os.path.join(BRAIN_DIR, 'vnr_212_brinjal_1792745325223.jpg'),
    'vnr_krish_cucumber_480x600.webp': os.path.join(BRAIN_DIR, 'vnr_krish_cucumber_1792745348741.jpg'),
    'syngenta_sugar75_sweetcorn_480x600.webp': os.path.join(BRAIN_DIR, 'syngenta_sugar75_sweetcorn_1792745370687.jpg'),
    'namdhari_surabhi_coriander_480x600.webp': os.path.join(BRAIN_DIR, 'namdhari_surabhi_coriander_1792745399103.jpg'),
    'syngenta_royalbullet_chilli_480x600.webp': os.path.join(BRAIN_DIR, 'syngenta_royalbullet_chilli_1792745425312.jpg'),
    'kalash_redchief_onion_480x600.webp': os.path.join(BRAIN_DIR, 'kalash_redchief_onion_1792745454646.jpg'),
    'kaveri_kph467_maize_480x600.webp': os.path.join(BRAIN_DIR, 'kaveri_kph467_maize_1792745476242.jpg'),
    'rasi_rch659_cotton_480x600.webp': os.path.join(BRAIN_DIR, 'rasi_rch659_cotton_1792745499244.jpg'),
    'mahyco_tejaswini_chilli_480x600.webp': os.path.join(BRAIN_DIR, 'mahyco_tejaswini_chilli_1792745522260.jpg'),
}

img_paths = {}
for target_name, src in image_mapping.items():
    res = copy_and_resize(src, target_name)
    if res:
        img_paths[target_name] = res

# 1. Brands from BigHaat
bighaat_brands = [
    'Syngenta', 'Bayer', 'Seminis', 'Advanta Seeds', 'Namdhari Seeds',
    'Mahyco', 'VNR Seeds', 'Kaveri Seeds', 'Rasi Seeds', 'Kalash Seeds',
    'Nunhems', 'East-West Seed', 'UPL', 'Coromandel', 'Dhanuka', 'IFFCO'
]

brand_objs = {}
for b_name in bighaat_brands:
    b, _ = Brand.objects.get_or_create(name=b_name, defaults={'is_active': True})
    brand_objs[b_name] = b
print(f"Ensured {len(brand_objs)} Brands.")

# 2. Seeds Category
seeds_cat, _ = Category.objects.get_or_create(
    category_type='seeds',
    defaults={
        'name': 'Seeds',
        'slug': 'seeds',
        'description': 'High yielding hybrid vegetable, cereal, oilseed and field crop seeds from top brands'
    }
)
seeds_cat.name = 'Seeds'
seeds_cat.is_active = True
seeds_cat.save()

# Get sellers
sellers = list(User.objects.filter(role='seller').order_by('id'))
if not sellers:
    raise Exception("No sellers found!")

s1 = sellers[0] # Ganesh Patil (Pune)
s2 = sellers[1] if len(sellers) > 1 else s1 # Krishna Jadhav
s3 = sellers[2] if len(sellers) > 2 else s1 # Mahadev Shinde
s4 = sellers[3] if len(sellers) > 3 else s1 # Ajay

# Fix product 16 (Onion Seeds Bhima Shakti)
try:
    p16 = Product.objects.get(id=16)
    p16.category = seeds_cat
    p16.brand = brand_objs.get('Kalash Seeds') or brand_objs.get('Seminis')
    if not p16.description or len(p16.description) < 10:
        p16.description = "Gentex Bhima Shakti is an exceptional late Kharif and Rabi hybrid onion seed variety. Produces uniform dark red, globe-shaped bulbs with superior skin retention and long storability (5-6 months)."
    p16.ingredients = "Genetic Purity: 99% min, Physical Purity: 98% min, Germination: 75% min, Moisture: 8% max"
    p16.usage_instructions = "Seed rate: 3-4 kg/acre. Raise seedlings in nursery beds for 6-7 weeks before transplanting into main field with 15x10 cm spacing."
    p16.save()
    print("Fixed Product 16: Category & Brand assigned.")
except Product.DoesNotExist:
    pass

# Seed Products Definitions from BigHaat
products_data = [
    {
        'name': 'Syngenta Saaho TO 3251 F1 Hybrid Tomato Seeds',
        'brand': brand_objs['Syngenta'],
        'seller': s1,
        'image': img_paths.get('syngenta_saaho_tomato_480x600.webp', 'products/syngenta_saaho_tomato_480x600.webp'),
        'price': Decimal('1059.00'),
        'mrp': Decimal('1299.00'),
        'discount_percent': Decimal('18.00'),
        'stock': 45,
        'unit': 'packet',
        'weight': '10g (approx. 3,500 seeds)',
        'rating': Decimal('4.8'),
        'total_reviews': 94,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Syngenta Saaho TO 3251 is one of India's highest yielding F1 hybrid tomato seeds. Determinate vigorous plant with deep red, firm, oblong fruits (90-100g) having superior shelf life and robust resistance to Tomato Leaf Curl Virus (ToLCV). Highly recommended for commercial fresh market and long-distance transportation.",
        'ingredients': "Hybrid Tomato Seeds F1. Germination: 85% min, Physical Purity: 98% min, Genetic Purity: 99% min, Treated with Thiram.",
        'usage_instructions': "Seed Rate: 50-60 grams per acre. Raise seedlings in raised nursery beds or pro-trays with coco peat. Transplant 25-30 day old seedlings in ridges and furrows with 90x45 cm spacing. First harvest starts around 65-70 days after transplanting."
    },
    {
        'name': 'Seminis Abhilash Hybrid Tomato Seeds',
        'brand': brand_objs['Seminis'],
        'seller': s2,
        'image': img_paths.get('seminis_abhilash_tomato_480x600.webp', 'products/seminis_abhilash_tomato_480x600.webp'),
        'price': Decimal('744.00'),
        'mrp': Decimal('950.00'),
        'discount_percent': Decimal('22.00'),
        'stock': 38,
        'unit': 'packet',
        'weight': '10g',
        'rating': Decimal('4.9'),
        'total_reviews': 128,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Seminis Abhilash is India's benchmark semi-determinate hybrid tomato variety. Produces attractive uniform deep red round fruits weighing 80-100 grams. Features excellent fruit firmness, thick pericarp, and resistance to Fusarium wilt and early blight. Outstanding market acceptance across Indian mandis.",
        'ingredients': "High Purity Hybrid Tomato F1 Seeds. Germination: 85% min, Genetic Purity: 99% min, Treated with chemical seed dressing.",
        'usage_instructions': "Seed Rate: 60-70 grams per acre. Sow seeds in pro-trays and transplant at 30 days. Maintain spacing of 3.5 ft x 1.5 ft. Staking is recommended for maximum harvest potential."
    },
    {
        'name': 'Advanta Raadhika F1 Hybrid Bhindi (Okra) Seeds',
        'brand': brand_objs['Advanta Seeds'],
        'seller': s3,
        'image': img_paths.get('advanta_raadhika_bhindi_480x600.webp', 'products/advanta_raadhika_bhindi_480x600.webp'),
        'price': Decimal('1480.00'),
        'mrp': Decimal('1750.00'),
        'discount_percent': Decimal('15.00'),
        'stock': 50,
        'unit': 'packet',
        'weight': '100g',
        'rating': Decimal('4.9'),
        'total_reviews': 142,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Advanta Raadhika is the undisputed #1 hybrid bhindi (ladyfinger/okra) variety in India. Vigorous plant type with short internodes and 2-4 strong branches. Yields dark green, attractive 5-ridged smooth tender fruits with exceptional tolerance to Yellow Vein Mosaic Virus (YVMV) and Enation Leaf Curl Virus (ELCV).",
        'ingredients': "Certified Hybrid Okra (Abelmoschus esculentus) Seeds. Purity: 99%, Germination: 80% min. Treated with Thiram/Captan.",
        'usage_instructions': "Seed Rate: 3-4 kg per acre for Kharif, 4-5 kg per acre for Summer. Direct sowing in lines 45-60 cm apart with plant-to-plant distance of 15-20 cm. First picking starts 45-48 days after sowing."
    },
    {
        'name': 'Namdhari NS 295 Hybrid Watermelon Seeds',
        'brand': brand_objs['Namdhari Seeds'],
        'seller': s1,
        'image': img_paths.get('namdhari_ns295_watermelon_480x600.webp', 'products/namdhari_ns295_watermelon_480x600.webp'),
        'price': Decimal('410.00'),
        'mrp': Decimal('540.00'),
        'discount_percent': Decimal('24.00'),
        'stock': 32,
        'unit': 'packet',
        'weight': '50g',
        'rating': Decimal('4.7'),
        'total_reviews': 86,
        'is_featured': True,
        'has_free_delivery': False,
        'description': "Namdhari NS 295 is an outstanding high-yielding hybrid watermelon variety. Features dark green rind with light green stripes and attractive deep red, granular, highly sweet flesh (TSS 12-13%). Fruits are oblong-round weighing 8-12 kg with a tough rind that protects against cracking during transit.",
        'ingredients': "F1 Hybrid Watermelon Seeds. Germination: 80% min, Purity: 98% min, Genetic Purity: 99% min.",
        'usage_instructions': "Seed Rate: 300-400 grams per acre. Sow on raised beds or channels spaced 2-2.5 meters apart with 60 cm between plants. Harvest maturity is reached in 80-85 days after sowing."
    },
    {
        'name': 'VNR 212 F1 Hybrid Brinjal (Eggplant) Seeds',
        'brand': brand_objs['VNR Seeds'],
        'seller': s4,
        'image': img_paths.get('vnr_212_brinjal_480x600.webp', 'products/vnr_212_brinjal_480x600.webp'),
        'price': Decimal('218.00'),
        'mrp': Decimal('260.00'),
        'discount_percent': Decimal('16.00'),
        'stock': 60,
        'unit': 'packet',
        'weight': '10g',
        'rating': Decimal('4.8'),
        'total_reviews': 77,
        'is_featured': False,
        'has_free_delivery': False,
        'description': "VNR 212 is a premier green round brinjal hybrid famous for its attractive light green fruits with prominent purple-green calyx. High continuous fruit setting with very few soft seeds and succulent tender flesh that melts when cooked. Highly tolerant to bacterial wilt and phomopsis blight.",
        'ingredients': "F1 Hybrid Brinjal Seeds. Germination: 80% min, Purity: 98% min. Non-toxic fungicide treated.",
        'usage_instructions': "Seed Rate: 80-100 grams per acre. Sow in nursery and transplant healthy 30-35 days old seedlings. Spacing: 90 cm row-to-row, 60 cm plant-to-plant. Regular picking starts 55-60 days after transplant."
    },
    {
        'name': 'VNR Krish F1 Hybrid Cucumber Seeds',
        'brand': brand_objs['VNR Seeds'],
        'seller': s2,
        'image': img_paths.get('vnr_krish_cucumber_480x600.webp', 'products/vnr_krish_cucumber_480x600.webp'),
        'price': Decimal('412.00'),
        'mrp': Decimal('520.00'),
        'discount_percent': Decimal('21.00'),
        'stock': 28,
        'unit': 'packet',
        'weight': '10g',
        'rating': Decimal('4.6'),
        'total_reviews': 53,
        'is_featured': False,
        'has_free_delivery': False,
        'description': "VNR Krish F1 is an early, highly prolific hybrid cucumber seed variety. Produces crisp, straight cylindrical dark green fruits (18-22 cm long) with smooth skin and small seed cavity. Excellent crunch and sweetness, highly preferred for fresh market salads and hotels.",
        'ingredients': "Hybrid Cucumber (Cucumis sativus) F1 Seeds. Germination: 80% min, Purity: 99% min.",
        'usage_instructions': "Seed Rate: 400-500 grams per acre. Direct sow in beds or pits spaced 1.5 meters apart with 45 cm intra-row spacing. Trellising on net or bamboo significantly increases fruit quality and yield."
    },
    {
        'name': 'Syngenta Sugar 75 Sweet Corn Hybrid Seeds',
        'brand': brand_objs['Syngenta'],
        'seller': s1,
        'image': img_paths.get('syngenta_sugar75_sweetcorn_480x600.webp', 'products/syngenta_sugar75_sweetcorn_480x600.webp'),
        'price': Decimal('2959.00'),
        'mrp': Decimal('3850.00'),
        'discount_percent': Decimal('23.00'),
        'stock': 25,
        'unit': 'packet',
        'weight': '1kg',
        'rating': Decimal('4.9'),
        'total_reviews': 112,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Syngenta Sugar 75 is India's gold standard hybrid sweet corn seed. Long, uniform cylindrical cobs (8-9 inches) packed with bright golden-yellow tender kernels having exceptional sweetness (TSS 14-16%). High cob tip filling with tight husk protection against birds and earworms.",
        'ingredients': "Hybrid Sweet Corn (Zea mays saccharata) Seeds. Germination: 85% min, Purity: 99% min, Treated with Cruiser/Thiram.",
        'usage_instructions': "Seed Rate: 3-4 kg per acre. Sow at a depth of 2.5-3 cm on ridges spaced 60 cm apart with 20 cm between plants. Harvest tender green cobs when silk turns brown around 72-78 days."
    },
    {
        'name': 'Namdhari Surabhi Coriander (Dhaniya) Seeds',
        'brand': brand_objs['Namdhari Seeds'],
        'seller': s3,
        'image': img_paths.get('namdhari_surabhi_coriander_480x600.webp', 'products/namdhari_surabhi_coriander_480x600.webp'),
        'price': Decimal('249.00'),
        'mrp': Decimal('320.00'),
        'discount_percent': Decimal('22.00'),
        'stock': 70,
        'unit': 'packet',
        'weight': '500g',
        'rating': Decimal('4.7'),
        'total_reviews': 65,
        'is_featured': False,
        'has_free_delivery': False,
        'description': "Namdhari Surabhi is a premier multi-cut commercial coriander variety. Features vigorous, bushy growth with broad, dark green leaves radiating rich pleasant aroma. Excellent heat tolerance and slow bolting nature, allowing 3 to 4 sequential cuttings for high farm profitability.",
        'ingredients': "Clean Selected Coriander (Coriandrum sativum) Seeds. Purity: 98% min, Germination: 75% min.",
        'usage_instructions': "Seed Rate: 8-10 kg per acre (crush seeds gently into two halves before sowing for rapid emergence). Broadcast or drill in rows 20 cm apart. First cutting ready in 35-40 days."
    },
    {
        'name': 'Syngenta Royal Bullet (HPH 5531) Hot Pepper Chilli Seeds',
        'brand': brand_objs['Syngenta'],
        'seller': s2,
        'image': img_paths.get('syngenta_royalbullet_chilli_480x600.webp', 'products/syngenta_royalbullet_chilli_480x600.webp'),
        'price': Decimal('818.00'),
        'mrp': Decimal('990.00'),
        'discount_percent': Decimal('17.00'),
        'stock': 40,
        'unit': 'packet',
        'weight': '1500 seeds (~10g)',
        'rating': Decimal('4.8'),
        'total_reviews': 79,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Syngenta Royal Bullet (HPH 5531) is an aggressive, high-yielding hybrid hot pepper chilli variety. Features dark green, smooth, erect fruits turning glossy dark red upon maturity. High heat level (SHU ~60,000-70,000) with remarkable tolerance to sucking pests and leaf curl viruses.",
        'ingredients': "F1 Hybrid Hot Chilli Seeds. Germination: 80% min, Purity: 98% min. Thiram treated.",
        'usage_instructions': "Seed Rate: 60-80 grams per acre. Raise seedlings in nursery for 35 days. Transplant on paired rows (90-60 x 45 cm). Continues productive bearing up to 180-210 days."
    },
    {
        'name': 'Mahyco Tejaswini F1 Hybrid Chilli Seeds',
        'brand': brand_objs['Mahyco'],
        'seller': s4,
        'image': img_paths.get('mahyco_tejaswini_chilli_480x600.webp', 'products/mahyco_tejaswini_chilli_480x600.webp'),
        'price': Decimal('485.00'),
        'mrp': Decimal('580.00'),
        'discount_percent': Decimal('16.00'),
        'stock': 44,
        'unit': 'packet',
        'weight': '10g',
        'rating': Decimal('4.7'),
        'total_reviews': 58,
        'is_featured': False,
        'has_free_delivery': False,
        'description': "Mahyco Tejaswini F1 is an early and highly prolific Indian hot pepper hybrid. Produces thin, shiny, light green pungent chillies (7-8 cm) that mature into fiery bright red pods. Equally outstanding for fresh green market and dry red chilli processing.",
        'ingredients': "Certified F1 Hybrid Chilli Seeds. Purity: 98% min, Germination: 80% min.",
        'usage_instructions': "Seed Rate: 80-100 grams per acre. Nursery sowing recommended. Transplant at 4 weeks. First green chilli harvest starts 50-55 days post transplanting."
    },
    {
        'name': 'Kalash Red Chief F1 Hybrid Onion Seeds',
        'brand': brand_objs['Kalash Seeds'],
        'seller': s1,
        'image': img_paths.get('kalash_redchief_onion_480x600.webp', 'products/kalash_redchief_onion_480x600.webp'),
        'price': Decimal('1650.00'),
        'mrp': Decimal('1980.00'),
        'discount_percent': Decimal('17.00'),
        'stock': 35,
        'unit': 'tin',
        'weight': '500g',
        'rating': Decimal('4.8'),
        'total_reviews': 91,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Kalash Red Chief is a premium dark red globe-shaped hybrid onion seed variety. Highly uniform bulbs weighing 110-130 grams with thin tight necks, multi-layered bright red skin, and low pungency. Remarkable storability for 4-5 months without sprouting or weight loss.",
        'ingredients': "Hybrid Onion (Allium cepa) Seeds. Germination: 75% min, Genetic Purity: 99% min, Physical Purity: 98% min.",
        'usage_instructions': "Seed Rate: 3-4 kg per acre. Sow in raised nursery beds in May-June (Kharif) or Oct-Nov (Rabi). Transplant 45-day-old seedlings with 15x10 cm spacing in flat beds."
    },
    {
        'name': 'Kaveri KPH 467 Hybrid Maize (Corn) Seeds',
        'brand': brand_objs['Kaveri Seeds'],
        'seller': s3,
        'image': img_paths.get('kaveri_kph467_maize_480x600.webp', 'products/kaveri_kph467_maize_480x600.webp'),
        'price': Decimal('920.00'),
        'mrp': Decimal('1100.00'),
        'discount_percent': Decimal('16.00'),
        'stock': 55,
        'unit': 'bag',
        'weight': '4kg',
        'rating': Decimal('4.8'),
        'total_reviews': 104,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Kaveri KPH 467 is a champion high-yielding yellow-orange flint grain hybrid field corn. Vigorous sturdy plants with deep root system, strong green fodder retention up to harvest, and exceptional stay-green trait. Heavy test weight kernels with high starch value.",
        'ingredients': "Certified Hybrid Maize (Zea mays L.) Seeds. Germination: 90% min, Purity: 99% min.",
        'usage_instructions': "Seed Rate: 7-8 kg per acre (2 bags). Plant in ridges and furrows 60 cm apart with 20 cm spacing between plants. Maturity: 105-110 days."
    },
    {
        'name': 'Rasi RCH 659 BG II Hybrid Cotton Seeds',
        'brand': brand_objs['Rasi Seeds'],
        'seller': s4,
        'image': img_paths.get('rasi_rch659_cotton_480x600.webp', 'products/rasi_rch659_cotton_480x600.webp'),
        'price': Decimal('864.00'),
        'mrp': Decimal('950.00'),
        'discount_percent': Decimal('9.00'),
        'stock': 80,
        'unit': 'packet',
        'weight': '475g (450g BG II + 25g Non-Bt Refugia)',
        'rating': Decimal('4.9'),
        'total_reviews': 175,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Rasi RCH 659 BG II is India's most popular and trusted Bollgard II hybrid cotton seed. Big boll size (5-5.5 grams) with easy fluffy opening and high ginning outturn (36-38%). Built-in biotechnology resistance to American, Spotted, and Pink bollworms with high sucking pest tolerance.",
        'ingredients': "GEAC Approved Hybrid Cotton Seeds (Bollgard II Cry1Ac & Cry2Ab proteins) + Non-Bt Pigeon pea/Cotton refugia.",
        'usage_instructions': "Seed Rate: 1-2 packets per acre. Sow with spacing of 3-4 feet row-to-row and 1.5-2 feet plant-to-plant after arrival of monsoon showers. Maintain refugia boundary around field."
    }
]

created_count = 0
updated_count = 0

for data in products_data:
    name = data['name']
    defaults = {
        'category': seeds_cat,
        'brand': data['brand'],
        'seller': data['seller'],
        'price': data['price'],
        'mrp': data['mrp'],
        'discount_percent': data['discount_percent'],
        'stock': data['stock'],
        'unit': data['unit'],
        'weight': data['weight'],
        'rating': data['rating'],
        'total_reviews': data['total_reviews'],
        'is_featured': data['is_featured'],
        'has_free_delivery': data['has_free_delivery'],
        'is_active': True,
        'description': data['description'],
        'ingredients': data['ingredients'],
        'usage_instructions': data['usage_instructions'],
    }
    if data.get('image'):
        defaults['image'] = data['image']

    prod, created = Product.objects.update_or_create(
        name=name,
        defaults=defaults
    )
    if created:
        created_count += 1
        print(f"Created Product: {name} (Brand: {data['brand'].name})")
    else:
        updated_count += 1
        print(f"Updated Product: {name} (Brand: {data['brand'].name})")

print(f"\nCompleted! Created {created_count} new seeds products, updated {updated_count}.")
print(f"Total seeds in DB now: {Product.objects.filter(category=seeds_cat).count()}")
