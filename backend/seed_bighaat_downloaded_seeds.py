import os
import sys
import django
from decimal import Decimal
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"d:\MY_PROJECTS\agroconnect\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import Brand, Category, Product
from accounts.models import User

SRC_DIR = r"C:\Users\ganes\Downloads\Buy Best-Quality Seeds Online _ Starting from ₹20 _ BigHaat"
MEDIA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'media', 'products')
os.makedirs(MEDIA_DIR, exist_ok=True)

def process_packaging_image(source_filename, target_filename, target_size=(480, 600)):
    source_path = os.path.join(SRC_DIR, source_filename)
    target_path = os.path.join(MEDIA_DIR, target_filename)
    
    if not os.path.exists(source_path):
        print(f"Warning: Source not found: {source_path}")
        return None
        
    try:
        img = Image.open(source_path)
        img = img.convert('RGB')
        
        target_w, target_h = target_size
        img.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Pure crisp white background canvas
        canvas = Image.new('RGB', target_size, (255, 255, 255))
        offset_x = (target_w - img.width) // 2
        offset_y = (target_h - img.height) // 2
        canvas.paste(img, (offset_x, offset_y))
        
        canvas.save(target_path, 'WEBP', quality=92)
        print(f"Processed: {target_filename} (480x600)")
        return f"products/{target_filename}"
    except Exception as e:
        print(f"Error processing {source_filename}: {e}")
        return None

# Ensure Seeds category exists
category, _ = Category.objects.get_or_create(
    category_type='seeds',
    defaults={
        'name': 'Seeds',
        'slug': 'seeds',
        'description': 'Certified high-yielding hybrid and open-pollinated vegetable, field crop, and flower seeds.',
        'is_active': True
    }
)

# Get active sellers
sellers = list(User.objects.filter(role=User.SELLER))
if not sellers:
    print("Error: No seller user found!")
    sys.exit(1)

# Assign products across sellers
seller_ganesh = next((s for s in sellers if 'ganesh' in s.email), sellers[0])
seller_krishna = next((s for s in sellers if 'krishna' in s.email), sellers[0])
seller_mahadev = next((s for s in sellers if 'mahadev' in s.email), sellers[0])

SEED_PRODUCTS = [
    # 1. Sagar Biotech
    {
        'brand': 'Sagar Biotech',
        'name': 'Sagar King Plus F1 Hybrid Watermelon Seeds',
        'src': 'imgi_4564_sagar-king-plus-f1-watermelon-file-17105.png',
        'img_name': 'sagar_king_plus_watermelon_480x600.webp',
        'mrp': Decimal('650.00'),
        'price': Decimal('520.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 85,
        'rating': Decimal('4.8'),
        'total_reviews': 94,
        'is_featured': True,
        'seller': seller_ganesh,
        'description': 'Sagar King Plus is an outstanding high-yielding hybrid watermelon variety. Features oblong fruits with dark black-green rind, deep crimson red flesh, extremely sweet with 12-13% TSS sugar content. Excellent keeping quality and transportability for long-distance markets. Maturity in 75-80 days from sowing.',
        'usage': 'Seed rate: 300-400 g/acre. Spacing: 2m x 0.5m. Best for spring-summer and early kharif sowing.'
    },
    {
        'brand': 'Sagar Biotech',
        'name': 'Sagar Sneha 75 F1 Hybrid Bitter Gourd Seeds',
        'src': 'imgi_4610_sagar-sneha-75-f1-bitter-gourd-file-17135.png',
        'img_name': 'sagar_sneha_75_bitter_gourd_480x600.webp',
        'mrp': Decimal('480.00'),
        'price': Decimal('384.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 60,
        'rating': Decimal('4.7'),
        'total_reviews': 58,
        'is_featured': False,
        'seller': seller_krishna,
        'description': 'Sagar Sneha 75 produces attractive dark green, continuous spined fruits of length 20-25 cm with thick flesh. High female flower ratio with early picking starting 45-50 days after sowing. Highly tolerant to downy mildew and fruit fly infestations.',
        'usage': 'Seed rate: 800g - 1 kg/acre. Spacing: 1.5m x 0.6m on trellis system.'
    },
    {
        'brand': 'Sagar Biotech',
        'name': 'Sagar Pushpa F1 Hybrid Tomato Seeds',
        'src': 'imgi_4026_sagar-pushpa-f1-tomato-seeds-file-21060.png',
        'img_name': 'sagar_pushpa_f1_tomato_480x600.webp',
        'mrp': Decimal('690.00'),
        'price': Decimal('550.00'),
        'unit': '10g (approx. 3,500 seeds)',
        'weight': '10g',
        'stock': 70,
        'rating': Decimal('4.6'),
        'total_reviews': 42,
        'is_featured': False,
        'seller': seller_ganesh,
        'description': 'Determinate hybrid tomato with vigorous foliage and heavy fruit setting. Deep red, square-round firm fruits weighing 90-110g. High tolerance to Tomato Leaf Curl Virus (ToLCV) and Bacterial Wilt. First picking in 65-70 days after transplanting.',
        'usage': 'Seed rate: 50-60 g/acre nursery. Transplanting at 3-4 leaf stage.'
    },
    {
        'brand': 'Sagar Biotech',
        'name': 'Sagar Royal Orange F1 Hybrid Marigold Seeds',
        'src': 'imgi_4586_sagar-royal-orange-f1-marigold-file-17182.png',
        'img_name': 'sagar_royal_orange_marigold_480x600.webp',
        'mrp': Decimal('550.00'),
        'price': Decimal('440.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 95,
        'rating': Decimal('4.9'),
        'total_reviews': 112,
        'is_featured': True,
        'seller': seller_mahadev,
        'description': 'Premium African marigold hybrid producing dense, ball-shaped bright orange flowers with diameter 8-10 cm. Sturdy stems and prolonged flowering period of 60-70 days. Ideal for garlands, festive decorations, and profitable commercial flower farming.',
        'usage': 'Nursery sowing followed by transplanting at 45cm x 45cm spacing.'
    },
    
    # 2. Indo-American Hybrid Seeds
    {
        'brand': 'Indo-American Hybrid Seeds',
        'name': 'IAHS Indam Mumtaz F1 Hybrid Capsicum Seeds',
        'src': 'imgi_2462_IAHS-Capsicum-Indam-Mumtaz-Seeds-21553.jpg',
        'img_name': 'iahs_indam_mumtaz_capsicum_480x600.webp',
        'mrp': Decimal('750.00'),
        'price': Decimal('599.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 55,
        'rating': Decimal('4.8'),
        'total_reviews': 83,
        'is_featured': True,
        'seller': seller_krishna,
        'description': 'Indam Mumtaz is an exceptional green bell pepper/capsicum hybrid suitable for open field and polyhouse cultivation. Blocky 3-4 lobed fruits with thick pericarp, dark lustrous green color turning red at maturity. Average fruit weight 150-180g with prolonged shelf life.',
        'usage': 'Seed rate: 80-100 g/acre. Nursery raising for 30 days before transplanting.'
    },
    {
        'brand': 'Indo-American Hybrid Seeds',
        'name': 'IAHS Indam 2154 F1 Hybrid Chilli Seeds',
        'src': 'imgi_2463_IAHS-Chilli-Indam-2154-Seeds-21552.jpg',
        'img_name': 'iahs_indam_2154_chilli_480x600.webp',
        'mrp': Decimal('590.00'),
        'price': Decimal('470.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 65,
        'rating': Decimal('4.7'),
        'total_reviews': 67,
        'is_featured': False,
        'seller': seller_ganesh,
        'description': 'High pungency, dual-purpose (green and dry) hybrid chilli from Indo-American. Shiny dark green fruits, 9-11 cm in length with wrinkled skin and high capsaicin content. Tolerant to sucking pests and chilli leaf curl.',
        'usage': 'Seed rate: 70-80 g/acre. Spacing: 60cm x 45cm.'
    },
    {
        'brand': 'Indo-American Hybrid Seeds',
        'name': 'IAHS Marvel Gold F1 Marigold Seeds',
        'src': 'imgi_3913_iahs-marigold-marvel-gold-file-17706.png',
        'img_name': 'iahs_marvel_gold_marigold_480x600.webp',
        'mrp': Decimal('490.00'),
        'price': Decimal('390.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 80,
        'rating': Decimal('4.8'),
        'total_reviews': 54,
        'is_featured': False,
        'seller': seller_mahadev,
        'description': 'Indo-American Marvel Gold features golden-yellow globular blooms with outstanding flower firmness and long shelf life. Uniform plant canopy reaching 60-70 cm height. First harvest within 55 days from transplanting.',
        'usage': 'Transplant 25-day-old healthy seedlings at 45cm x 45cm.'
    },

    # 3. Urja Seeds
    {
        'brand': 'Urja Seeds',
        'name': 'Urja Himshikha F1 Hybrid Tomato Seeds',
        'src': 'imgi_3689_urja-tomato-f1-himshikha-file-15825.png',
        'img_name': 'urja_himshikha_tomato_480x600.webp',
        'mrp': Decimal('420.00'),
        'price': Decimal('335.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 75,
        'rating': Decimal('4.6'),
        'total_reviews': 49,
        'is_featured': False,
        'seller': seller_ganesh,
        'description': 'Semi-determinate hybrid tomato variety engineered for superior heat tolerance and prolonged fruiting. Produces glossy red, firm fruits weighing 80-100g with excellent shelf life for long-distance transport. Ideal for Kharif and Rabi.',
        'usage': 'Seed rate: 60-80 g/acre. First picking in 65-70 days.'
    },
    {
        'brand': 'Urja Seeds',
        'name': 'Urja Sadabhar Chilli Seeds',
        'src': 'imgi_3682_urja-chilli-sadabhar-file-15835.png',
        'img_name': 'urja_sadabhar_chilli_480x600.webp',
        'mrp': Decimal('280.00'),
        'price': Decimal('220.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 120,
        'rating': Decimal('4.7'),
        'total_reviews': 91,
        'is_featured': True,
        'seller': seller_krishna,
        'description': 'Continuous bearing hot pepper variety suitable for all-season cultivation. Produces attractive upright clusters of light green to fiery red chillies with high pungency and disease tolerance. High yield with low input costs.',
        'usage': 'Sowing round the year. Transplant at 45cm x 45cm.'
    },
    {
        'brand': 'Urja Seeds',
        'name': 'Urja Monika Pole Beans Seeds',
        'src': 'imgi_3665_urja-pole-beans-monika-file-15630.png',
        'img_name': 'urja_monika_pole_beans_480x600.webp',
        'mrp': Decimal('320.00'),
        'price': Decimal('255.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 90,
        'rating': Decimal('4.7'),
        'total_reviews': 38,
        'is_featured': False,
        'seller': seller_mahadev,
        'description': 'High-yielding vigorous climber pole bean variety producing straight, round, stringless tender green pods of length 20-25 cm. Exceptional tenderness and sweet taste. Harvest continues up to 75-80 days with multiple pickings.',
        'usage': 'Seed rate: 10-12 kg/acre. Support with bower or trellising bamboo sticks.'
    },
    {
        'brand': 'Urja Seeds',
        'name': 'Urja Superball F1 Hybrid Cabbage Seeds',
        'src': 'imgi_3684_urja-cabbage-f1-superball-file-15839.png',
        'img_name': 'urja_superball_cabbage_480x600.webp',
        'mrp': Decimal('450.00'),
        'price': Decimal('360.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 65,
        'rating': Decimal('4.5'),
        'total_reviews': 31,
        'is_featured': False,
        'seller': seller_ganesh,
        'description': 'Compact, uniform, round-headed cabbage hybrid with crisp bluish-green wrapper leaves and tight interior. Heads weigh 1.2 to 1.6 kg with field holding capacity of 20-25 days without bursting. Ready in 60-65 days.',
        'usage': 'Transplant 25-day-old seedlings at 45cm x 45cm spacing.'
    },
    {
        'brand': 'Urja Seeds',
        'name': 'Urja Imported DDR Beetroot Seeds',
        'src': 'imgi_3687_urja-beetroot-ddr-imported-file-15833.png',
        'img_name': 'urja_ddr_beetroot_480x600.webp',
        'mrp': Decimal('380.00'),
        'price': Decimal('299.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 110,
        'rating': Decimal('4.8'),
        'total_reviews': 77,
        'is_featured': False,
        'seller': seller_krishna,
        'description': 'Imported Detroit Dark Red (DDR) beetroot selection. Uniform globe-shaped roots with smooth crown, rich blood-red internal flesh without white zoning, and high betanin content. Maturity in 55-60 days.',
        'usage': 'Direct sowing on ridges. Seed rate: 3-4 kg/acre.'
    },
    {
        'brand': 'Urja Seeds',
        'name': 'Urja Red Cosmo Onion Seeds',
        'src': 'imgi_3562_urja-red-cosmo-onion-seeds-file-14317.png',
        'img_name': 'urja_red_cosmo_onion_480x600.webp',
        'mrp': Decimal('550.00'),
        'price': Decimal('440.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 85,
        'rating': Decimal('4.9'),
        'total_reviews': 120,
        'is_featured': True,
        'seller': seller_ganesh,
        'description': 'Late Kharif and Rabi hybrid onion with flattish-globe shape and attractive deep red skin with tight neck. Renowned for low bolting percentage, high bulb pungency, and exceptional storage life of 5-6 months without sprouting.',
        'usage': 'Nursery raising in October-November. Transplanting after 40-45 days.'
    },

    # 4. VNR Seeds
    {
        'brand': 'VNR Seeds',
        'name': 'VNR 145 F1 Hybrid Hot Pepper Chilli Seeds',
        'src': 'imgi_3095_vnr-145-chilli-seeds-file-1961.webp',
        'img_name': 'vnr_145_chilli_480x600.webp',
        'mrp': Decimal('850.00'),
        'price': Decimal('699.00'),
        'unit': '10g (approx. 1,500 seeds)',
        'weight': '10g',
        'stock': 90,
        'rating': Decimal('4.9'),
        'total_reviews': 165,
        'is_featured': True,
        'seller': seller_ganesh,
        'description': 'VNR 145 is a benchmark hot pepper hybrid with prolific fruiting habit. Deep dark green, glossy, smooth chillies of 8-9 cm with intense pungency (SHU 60,000+). Widely favored by farmers for premium fresh green market sales.',
        'usage': 'Transplant 30-35 day seedlings. Spacing: 75cm x 45cm.'
    },
    {
        'brand': 'VNR Seeds',
        'name': 'VNR 3348 F1 Hybrid Tomato Seeds',
        'src': 'imgi_3194_vnr-3348-tomato-file-4186.jpg',
        'img_name': 'vnr_3348_tomato_480x600.webp',
        'mrp': Decimal('890.00'),
        'price': Decimal('749.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 70,
        'rating': Decimal('4.8'),
        'total_reviews': 88,
        'is_featured': False,
        'seller': seller_krishna,
        'description': 'Square-round, highly uniform indeterminate tomato hybrid from VNR. Thick fruit pericarp, excellent red color, fruit weight 90-100g. Remarkable resistance to TYLCV and early blight with strong sturdiness.',
        'usage': 'Transplant with staking. First harvest at 65-70 days.'
    },
    {
        'brand': 'VNR Seeds',
        'name': 'VNR 22 F1 Hybrid Bitter Gourd Seeds',
        'src': 'imgi_4296_vnr-22-bitter-gourd-file-3078.jpg',
        'img_name': 'vnr_22_bitter_gourd_480x600.webp',
        'mrp': Decimal('620.00'),
        'price': Decimal('495.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 80,
        'rating': Decimal('4.7'),
        'total_reviews': 73,
        'is_featured': False,
        'seller': seller_mahadev,
        'description': 'Medium-long (18-20 cm) dark green bitter gourd with dense prickles and high flesh thickness. Early harvesting begins 45 days after sowing with uniform picking cycles. Excellent consumer market preference.',
        'usage': 'Trellis cultivation recommended. Sowing in January-March or June-July.'
    },
    {
        'brand': 'VNR Seeds',
        'name': 'VNR 125 F1 Hybrid Brinjal Seeds',
        'src': 'imgi_4245_vnr-125-brinjal-file-6246.webp',
        'img_name': 'vnr_125_brinjal_480x600.webp',
        'mrp': Decimal('490.00'),
        'price': Decimal('399.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 65,
        'rating': Decimal('4.6'),
        'total_reviews': 52,
        'is_featured': False,
        'seller': seller_ganesh,
        'description': 'Attractive round-oval purple fruits with white stripes and green calyx. Fruit weight 90-110g with minimal seediness and soft texture when cooked. High tolerance to Little Leaf and Shoot Borer.',
        'usage': 'Seed rate: 100g/acre. First picking at 55-60 days.'
    },

    # 5. Nunhems
    {
        'brand': 'Nunhems',
        'name': 'Nunhems US 6001 F1 Hybrid Ridge Gourd Seeds',
        'src': 'imgi_4247_us-6001-ridgegourd-seeds-file-1397.jpg',
        'img_name': 'nunhems_us6001_ridge_gourd_480x600.webp',
        'mrp': Decimal('680.00'),
        'price': Decimal('540.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 100,
        'rating': Decimal('4.9'),
        'total_reviews': 142,
        'is_featured': True,
        'seller': seller_ganesh,
        'description': 'Nunhems US 6001 is India\'s premier hybrid ridge gourd variety. Straight, tender, dark green ribbed fruits measuring 40-45 cm in length. High yield, prolific branching, and tolerance to Downy Mildew.',
        'usage': 'Seed rate: 800g/acre. Train on wire trellis for straight, blemish-free fruits.'
    },
    {
        'brand': 'Nunhems',
        'name': 'Nunhems Maxion F1 Hybrid Watermelon Seeds',
        'src': 'imgi_3692_fb-maxion-f1-hybrid-watermelon-file-15688.png',
        'img_name': 'nunhems_maxion_watermelon_480x600.webp',
        'mrp': Decimal('720.00'),
        'price': Decimal('580.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 75,
        'rating': Decimal('4.8'),
        'total_reviews': 89,
        'is_featured': False,
        'seller': seller_krishna,
        'description': 'Black icebox hybrid watermelon with shiny dark rind and crisp, granular deep red flesh. High sugar content (Brix 12.5%) with small seed cavity. Fruit weight 3.5-5.0 kg with excellent transportability.',
        'usage': 'Seed rate: 350-400 g/acre. Harvest at 70-75 days.'
    },
    {
        'brand': 'Nunhems',
        'name': 'Nunhems US 1315 F1 Hybrid Bitter Gourd Seeds',
        'src': 'imgi_3185_us-1315-bitter-gourd-seeds-1315-file-12089.jpg',
        'img_name': 'nunhems_us1315_bitter_gourd_480x600.webp',
        'mrp': Decimal('590.00'),
        'price': Decimal('470.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 60,
        'rating': Decimal('4.7'),
        'total_reviews': 64,
        'is_featured': False,
        'seller': seller_mahadev,
        'description': 'Leading commercial bitter gourd hybrid producing spindle-shaped, shiny green fruits with sharp continuous ridges. Fruit length 18-22 cm, average weight 100-130g. High yield with quick regeneration.',
        'usage': 'Direct seeding at 1.8m x 0.6m spacing with trellis.'
    },

    # 6. Vokkal Seeds
    {
        'brand': 'Vokkal Seeds',
        'name': 'Vokkal Seeds Meghana French Beans Seeds',
        'src': 'imgi_4178_vokkal-seeds-french-beans-meghana-french-bean-seeds-1.png',
        'img_name': 'vokkal_meghana_french_beans_480x600.webp',
        'mrp': Decimal('380.00'),
        'price': Decimal('299.00'),
        'unit': '100g',
        'weight': '100g',
        'stock': 90,
        'rating': Decimal('4.7'),
        'total_reviews': 45,
        'is_featured': False,
        'seller': seller_ganesh,
        'description': 'Meghana is a premium bush bean variety from Vokkal Seeds. Stringless, straight, round green pods measuring 14-16 cm with slow seed maturity. High yield potential with picking starting at 45 days after sowing.',
        'usage': 'Seed rate: 25-30 kg/acre. Spacing: 30cm x 15cm.'
    },
    {
        'brand': 'Vokkal Seeds',
        'name': 'Vokkal Seeds Menaka French Beans Seeds',
        'src': 'imgi_4186_vokkal-seeds-beans-menaka-french-bean-seeds-1.png',
        'img_name': 'vokkal_menaka_french_beans_480x600.webp',
        'mrp': Decimal('390.00'),
        'price': Decimal('310.00'),
        'unit': '100g',
        'weight': '100g',
        'stock': 85,
        'rating': Decimal('4.6'),
        'total_reviews': 39,
        'is_featured': False,
        'seller': seller_krishna,
        'description': 'Vigorous bush type French bean yielding tender, fleshy, stringless green pods. High disease resistance to Bean Common Mosaic Virus (BCMV) and rust. Suitable for all major vegetable growing belts.',
        'usage': 'Sow during Rabi and late Kharif.'
    },

    # 7. Mahyco
    {
        'brand': 'Mahyco',
        'name': 'Mahyco Hari Rani F1 Hybrid Cabbage Seeds',
        'src': 'imgi_3308_cabbage-mahyco-hari-rani-file-55.png',
        'img_name': 'mahyco_hari_rani_cabbage_480x600.webp',
        'mrp': Decimal('490.00'),
        'price': Decimal('390.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 70,
        'rating': Decimal('4.8'),
        'total_reviews': 76,
        'is_featured': True,
        'seller': seller_ganesh,
        'description': 'Mahyco Hari Rani is an early maturing flat-round cabbage hybrid (60-65 days). Heads are compact, bluish-green, weighing 1.25 to 1.5 kg with excellent field holding capacity and resistance to black rot.',
        'usage': 'Nursery sowing in August-November. Transplant at 45cm x 45cm.'
    },
    {
        'brand': 'Mahyco',
        'name': 'Mahyco Mahy-9 F1 Hybrid Brinjal Seeds',
        'src': 'imgi_4010_mahy-9-hybrid-brinjal-seeds-file-20864.png',
        'img_name': 'mahyco_mahy9_brinjal_480x600.webp',
        'mrp': Decimal('450.00'),
        'price': Decimal('360.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 80,
        'rating': Decimal('4.7'),
        'total_reviews': 58,
        'is_featured': False,
        'seller': seller_mahadev,
        'description': 'High-yielding oval-round eggplant hybrid with deep purple gloss and green calyx. Fruit weight 80-100g with tender white flesh and low bitterness. Prolific continuous bearer throughout the season.',
        'usage': 'First harvest at 50-55 days after transplanting.'
    },

    # 8. Sarpan Seeds
    {
        'brand': 'Sarpan Seeds',
        'name': 'Sarpan Airavat F1 Hybrid Bhendi Okra Seeds',
        'src': 'imgi_3572_sarpan-airavat-f1-hybrid-bhendi-seeds-file-15003.png',
        'img_name': 'sarpan_airavat_bhendi_480x600.webp',
        'mrp': Decimal('420.00'),
        'price': Decimal('330.00'),
        'unit': '100g',
        'weight': '100g',
        'stock': 110,
        'rating': Decimal('4.8'),
        'total_reviews': 105,
        'is_featured': True,
        'seller': seller_ganesh,
        'description': 'Dark green, 5-ridged, tender and slender okra pods with short internodes and high branching. Extremely tolerant to Yellow Vein Mosaic Virus (YVMV) and Enation Leaf Curl Virus (ELCV). High market acceptance.',
        'usage': 'Seed rate: 3-4 kg/acre. Sowing in Kharif and summer.'
    },
    {
        'brand': 'Sarpan Seeds',
        'name': 'Sarpan SO-22 High Yield Onion Seeds',
        'src': 'imgi_3656_sarpan-so-22-onion-seeds-file-14465.png',
        'img_name': 'sarpan_so22_onion_480x600.webp',
        'mrp': Decimal('580.00'),
        'price': Decimal('460.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 95,
        'rating': Decimal('4.8'),
        'total_reviews': 92,
        'is_featured': False,
        'seller': seller_krishna,
        'description': 'Light red to pinkish-red globe-shaped onion bulbs with tight skin layers and medium pungency. Highly resistant to thrips and purple blotch. Superb storage quality for up to 6 months without rotting.',
        'usage': 'Rabi sowing. Seed rate: 3-4 kg/acre.'
    },

    # 9. Advanta Seeds
    {
        'brand': 'Advanta Seeds',
        'name': 'Advanta Jumbo Super Multi-Cut Forage Grass Seeds',
        'src': 'imgi_4300_advanta-jumbo-super-seeds-file-11446.jpg',
        'img_name': 'advanta_jumbo_super_forage_480x600.webp',
        'mrp': Decimal('450.00'),
        'price': Decimal('360.00'),
        'unit': '1 kg',
        'weight': '1 kg',
        'stock': 130,
        'rating': Decimal('4.9'),
        'total_reviews': 148,
        'is_featured': True,
        'seller': seller_mahadev,
        'description': 'High nutritive value multi-cut sorghum sudan grass forage seed from Advanta. High crude protein (10-12%), sweet juicy thin stems, excellent tillering giving 4-5 cuts per year for dairy cattle.',
        'usage': 'Seed rate: 8-10 kg/acre. First cut at 45-50 days, subsequent cuts every 30 days.'
    },

    # 10. Iris Hybrid Seeds
    {
        'brand': 'Iris Hybrid Seeds',
        'name': 'Iris IHS-786 F1 Hybrid Orange Marigold Seeds',
        'src': 'imgi_4590_iris-marigold-orange-ihs-786-3.png',
        'img_name': 'iris_ihs786_orange_marigold_480x600.webp',
        'mrp': Decimal('520.00'),
        'price': Decimal('415.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 75,
        'rating': Decimal('4.7'),
        'total_reviews': 61,
        'is_featured': False,
        'seller': seller_ganesh,
        'description': 'Deep orange, fully double, ball-type compact flowers with 9-11 cm diameter. Compact plant architecture with uniform canopy. Superb flower weight and petal density for long shelf life and decoration.',
        'usage': 'Transplant seedlings at 45cm x 45cm.'
    },

    # 11. Farmson Biotech
    {
        'brand': 'Farmson Biotech',
        'name': 'Farmson FB Jalapeno 2020 Hot Pepper Seeds',
        'src': 'imgi_3375_farmson-fb-jalapeno2020-seeds-file-10958.png',
        'img_name': 'farmson_fb_jalapeno_2020_480x600.webp',
        'mrp': Decimal('650.00'),
        'price': Decimal('520.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 50,
        'rating': Decimal('4.8'),
        'total_reviews': 34,
        'is_featured': False,
        'seller': seller_krishna,
        'description': 'Premium Jalapeno hot pepper hybrid producing blunt, conical dark green thick-walled fruits with characteristic netting. Highly prized for pickling, salsa processing, and fresh gourmet markets.',
        'usage': 'Transplant 30-day seedlings. Yield up to 10-12 tons/acre.'
    },
    {
        'brand': 'Farmson Biotech',
        'name': 'Farmson Royal Red F1 Hybrid Watermelon Seeds',
        'src': 'imgi_3472_farmson-biotech-royal-red-rr-f1-hybrid-watermelon-seeds-file-12251.png',
        'img_name': 'farmson_royal_red_watermelon_480x600.webp',
        'mrp': Decimal('620.00'),
        'price': Decimal('495.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 85,
        'rating': Decimal('4.7'),
        'total_reviews': 59,
        'is_featured': False,
        'seller': seller_ganesh,
        'description': 'Oblong hybrid watermelon with dark green rind and distinct blackish stripes. Flesh is intensely red, crisp, juicy with 12-13% TSS sweetness. Average weight 8-10 kg per fruit with durable skin.',
        'usage': 'Seed rate: 300g/acre. Harvest at 80-85 days.'
    },

    # 12. Indo-US Biotech
    {
        'brand': 'Indo-US Biotech',
        'name': 'Indo-US Cumin 99 Research Jeera Seeds',
        'src': 'imgi_3963_indo-us-cumin-99-file-20690.png',
        'img_name': 'indous_cumin_99_jeera_480x600.webp',
        'mrp': Decimal('750.00'),
        'price': Decimal('599.00'),
        'unit': '1 kg',
        'weight': '1 kg',
        'stock': 120,
        'rating': Decimal('4.9'),
        'total_reviews': 130,
        'is_featured': True,
        'seller': seller_mahadev,
        'description': 'High-grade research variety cumin (Jeera) seed with high volatile oil content (3.5-4.0%) and bold grain size. High resistance to Fusarium wilt and powdery mildew. Maturity in 100-105 days.',
        'usage': 'Seed rate: 5-6 kg/acre. Sowing in November-December.'
    },

    # 13. Ashoka Seeds
    {
        'brand': 'Ashoka Seeds',
        'name': 'Ashoka AFA-5 Multi-Cut Coriander Dhaniya Seeds',
        'src': 'imgi_4032_ashoka-afa-5-coriander-seeds-file-20906.png',
        'img_name': 'ashoka_afa5_coriander_480x600.webp',
        'mrp': Decimal('380.00'),
        'price': Decimal('299.00'),
        'unit': '500g',
        'weight': '500g',
        'stock': 150,
        'rating': Decimal('4.8'),
        'total_reviews': 140,
        'is_featured': True,
        'seller': seller_ganesh,
        'description': 'Ashoka AFA-5 is a multi-cut coriander variety with lush broad dark green leaves and pleasant intense aroma. Regrows vigorously giving 3-4 harvests. Late bolting even during high summer temperatures.',
        'usage': 'Seed rate: 8-10 kg/acre. Split seed before sowing.'
    },

    # 14. UPL
    {
        'brand': 'UPL',
        'name': 'UPL Advanta Sugargraze Sweet Sorghum Forage Seeds',
        'src': 'imgi_4208_upl-sugargraze-forage-file-2145.webp',
        'img_name': 'upl_sugargraze_forage_480x600.webp',
        'mrp': Decimal('490.00'),
        'price': Decimal('399.00'),
        'unit': '1 kg',
        'weight': '1 kg',
        'stock': 140,
        'rating': Decimal('4.8'),
        'total_reviews': 115,
        'is_featured': True,
        'seller': seller_krishna,
        'description': 'Sweet sorghum forage hybrid with high sugar content (Brix 16-18%) and juicy palatability for dairy cattle. Drought tolerant, fast-growing reaching 8-10 feet in 60-70 days. Exceptionally high green fodder biomass.',
        'usage': 'Seed rate: 4-5 kg/acre. Cut at 50% flowering stage.'
    },

    # 15. East-West Seed
    {
        'brand': 'East-West Seed',
        'name': 'East-West Naga F1 Hybrid Ridge Gourd Seeds',
        'src': 'imgi_1556_eastwest-naga-ridge-gourd-seeds-file-2064.jpg',
        'img_name': 'eastwest_naga_ridge_gourd_480x600.webp',
        'mrp': Decimal('540.00'),
        'price': Decimal('430.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 70,
        'rating': Decimal('4.7'),
        'total_reviews': 53,
        'is_featured': False,
        'seller': seller_ganesh,
        'description': 'High-yielding vigorous hybrid ridge gourd with shiny dark green, straight cylindrical fruits of 35-40 cm length. Early harvesting at 40-45 days with uniform fruiting and high heat tolerance.',
        'usage': 'Direct seeding on raised beds with drip and trellis.'
    },
    {
        'brand': 'East-West Seed',
        'name': 'East-West Ulka F1 Hot Pepper Chilli Seeds',
        'src': 'imgi_1675_hot-pepper-ulka-f1-eastwest-file-68.jpg',
        'img_name': 'eastwest_ulka_chilli_480x600.webp',
        'mrp': Decimal('580.00'),
        'price': Decimal('460.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 65,
        'rating': Decimal('4.7'),
        'total_reviews': 48,
        'is_featured': False,
        'seller': seller_mahadev,
        'description': 'East-West Ulka is an erect-bearing pungent hybrid chilli. Dark green fruits turning bright glossy red on ripening. High firmness, long shelf life, and resistance to anthracnose fruit rot.',
        'usage': 'Transplant 30-day seedlings. Sowing in June-July and October.'
    },

    # 16. Known-You Seed
    {
        'brand': 'Known-You Seed',
        'name': 'Known-You Red Lady 786 Hybrid Papaya Seeds',
        'src': 'imgi_4205_red-lady-papaya-knownyou-seeds-file-62.jpg',
        'img_name': 'knownyou_red_lady_papaya_480x600.webp',
        'mrp': Decimal('850.00'),
        'price': Decimal('699.00'),
        'unit': '10g (approx. 650 seeds)',
        'weight': '10g',
        'stock': 85,
        'rating': Decimal('4.9'),
        'total_reviews': 180,
        'is_featured': True,
        'seller': seller_ganesh,
        'description': 'World famous gynodioecious hybrid papaya from Known-You. Early, vigorous bearing at 80 cm height. Oblong fruits with thick reddish-orange sweet flesh (13-14% Brix). Tolerant to Papaya Ring Spot Virus (PRSV).',
        'usage': 'Seed rate: 20-25 g/acre. Plant spacing: 2m x 2m.'
    },

    # 17. Seminis
    {
        'brand': 'Seminis',
        'name': 'Seminis Apoorva F1 Hybrid Watermelon Seeds',
        'src': 'imgi_4238_watermelon-seminis-apoorva-seeds-file-359.webp',
        'img_name': 'seminis_apoorva_watermelon_480x600.webp',
        'mrp': Decimal('680.00'),
        'price': Decimal('540.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 90,
        'rating': Decimal('4.8'),
        'total_reviews': 95,
        'is_featured': False,
        'seller': seller_krishna,
        'description': 'Apoorva is Seminis\'s flagship icebox watermelon hybrid. Dark greenish-black rind with deep red, fine-textured crispy flesh. Sweetness reaches 12-13% Brix. Fruit weight 3-5 kg with small seed cavity.',
        'usage': 'Direct sowing on mulch bed with drip irrigation.'
    },

    # 18. Namdhari Seeds
    {
        'brand': 'Namdhari Seeds',
        'name': 'Namdhari NS 1101 F1 Hybrid Chilli Seeds',
        'src': 'imgi_3119_namdhari-chilli-ns-1101-file-1213.jpg',
        'img_name': 'namdhari_ns1101_chilli_480x600.webp',
        'mrp': Decimal('620.00'),
        'price': Decimal('495.00'),
        'unit': '10g',
        'weight': '10g',
        'stock': 105,
        'rating': Decimal('4.8'),
        'total_reviews': 110,
        'is_featured': True,
        'seller': seller_ganesh,
        'description': 'Heavy yielding hybrid chilli with shiny dark green fruits of 8-10 cm length, moderate to high pungency, and high firmness. Early picking starts 65-70 days after transplanting with good transport ability.',
        'usage': 'Seed rate: 80g/acre. Nursery raising for 30 days.'
    },

    # 19. Syngenta
    {
        'brand': 'Syngenta',
        'name': 'Syngenta Abhinav F1 Hybrid Tomato Seeds',
        'src': 'imgi_3145_syngenta-abhinav-tomato-seeds-file-1458.webp',
        'img_name': 'syngenta_abhinav_tomato_480x600.webp',
        'mrp': Decimal('850.00'),
        'price': Decimal('699.00'),
        'unit': '10g (approx. 3,500 seeds)',
        'weight': '10g',
        'stock': 120,
        'rating': Decimal('4.9'),
        'total_reviews': 175,
        'is_featured': True,
        'seller': seller_ganesh,
        'description': 'Syngenta Abhinav is a determinate hybrid tomato renowned for deep red, firm, flat-round fruits of 80-100g. Excellent heat tolerance and good fruit setting in Kharif and Rabi. High resistance to ToLCV and fruit cracking.',
        'usage': 'Transplant 25-day seedlings. Sowing in June-July and October-November.'
    },

    # 20. Semillas Fitó
    {
        'brand': 'Semillas Fitó',
        'name': 'Semillas Fitó Leader Hybrid Squash Seeds',
        'src': 'imgi_4437_fito-leader-file-1430.webp',
        'img_name': 'fito_leader_squash_480x600.webp',
        'mrp': Decimal('490.00'),
        'price': Decimal('390.00'),
        'unit': '50g',
        'weight': '50g',
        'stock': 60,
        'rating': Decimal('4.6'),
        'total_reviews': 32,
        'is_featured': False,
        'seller': seller_mahadev,
        'description': 'Uniform, cylindrical, light green summer squash with delicate white speckles. Bushy open plant architecture for easy harvesting. High yield and tolerance to Zucchini Yellow Mosaic Virus (ZYMV).',
        'usage': 'Direct seeding at 1m x 0.6m. First pick at 40-45 days.'
    }
]

print(f"\nProcessing {len(SEED_PRODUCTS)} seed products with real BigHaat packaging images...")
added_count = 0
updated_count = 0

for item in SEED_PRODUCTS:
    # 1. Process packaging image to 480x600 WEBP
    rel_image_path = process_packaging_image(item['src'], item['img_name'])
    if not rel_image_path:
        print(f"Skipping {item['name']} due to missing image.")
        continue
        
    # 2. Get or create Brand
    brand_obj, b_created = Brand.objects.get_or_create(
        name=item['brand'],
        defaults={'category_group': 'seeds', 'is_active': True}
    )
    if 'seeds' not in brand_obj.category_group:
        brand_obj.category_group = (brand_obj.category_group + ',seeds').strip(',')
        brand_obj.save()
        
    # 3. Calculate discount percentage
    discount_pct = round(((item['mrp'] - item['price']) / item['mrp']) * 100, 2)
    
    # 4. Create or update Product
    prod, created = Product.objects.update_or_create(
        name=item['name'],
        defaults={
            'seller': item['seller'],
            'category': category,
            'brand': brand_obj,
            'description': item['description'],
            'usage_instructions': item['usage'],
            'image': rel_image_path,
            'price': item['price'],
            'mrp': item['mrp'],
            'discount_percent': discount_pct,
            'stock': item['stock'],
            'unit': item['unit'],
            'weight': item['weight'],
            'rating': item['rating'],
            'total_reviews': item['total_reviews'],
            'is_active': True,
            'is_featured': item.get('is_featured', False),
            'has_free_delivery': item['price'] >= 300,
        }
    )
    
    if created:
        added_count += 1
        print(f"  [CREATED] {prod.name} -> Rs {prod.price} ({prod.brand.name})")
    else:
        updated_count += 1
        print(f"  [UPDATED] {prod.name} -> Rs {prod.price} ({prod.brand.name})")

print(f"\nDone! Created: {added_count}, Updated: {updated_count}. Total Seed Products in DB: {Product.objects.filter(category=category).count()}")
