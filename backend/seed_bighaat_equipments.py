import os
import django
import io
import urllib.request
from decimal import Decimal
from PIL import Image

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import Brand, Category, Product
from django.contrib.auth import get_user_model

User = get_user_model()

MEDIA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'media', 'products')
os.makedirs(MEDIA_DIR, exist_ok=True)

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def download_and_resize(url, target_filename, target_size=(480, 600)):
    target_path = os.path.join(MEDIA_DIR, target_filename)
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as r:
            data = r.read()
            img = Image.open(io.BytesIO(data))
            img = img.convert('RGB')
            target_w, target_h = target_size
            img.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
            final_img = Image.new('RGB', target_size, (255, 255, 255))
            offset_x = (target_w - img.width) // 2
            offset_y = (target_h - img.height) // 2
            final_img.paste(img, (offset_x, offset_y))
            final_img.save(target_path, 'WEBP', quality=90)
            print(f"Downloaded & Saved: {target_filename} (480x600)")
            return f"products/{target_filename}"
    except Exception as e:
        print(f"Error downloading {target_filename} ({url}): {e}")
        return None

# 1. Ensure Equipment Category
equipment_cat, _ = Category.objects.get_or_create(
    category_type='equipment',
    defaults={
        'name': 'Equipment',
        'slug': 'agricultural-equipment',
        'description': 'Advanced agricultural machinery, power implements, farming tools, accessories, and precision irrigation systems'
    }
)
equipment_cat.name = 'Equipment'
equipment_cat.is_active = True
equipment_cat.save()
print(f"Equipment Category: ID {equipment_cat.id}, Name: {equipment_cat.name}")

# 2. Ensure Brands from BigHaat
equipment_brands = [
    'Balwaan Krishi', 'KisanKraft', 'Tapas', 'Mipatex',
    'Falcon Tools', 'Honda Power', 'Netafim', 'Neptune Farming'
]
brand_objs = {}
for b_name in equipment_brands:
    b, _ = Brand.objects.get_or_create(name=b_name, defaults={'is_active': True})
    brand_objs[b_name] = b
print(f"Ensured {len(brand_objs)} Equipment Brands.")

# 3. Get Sellers
sellers = list(User.objects.filter(role='seller').order_by('id'))
if not sellers:
    raise Exception("No sellers found!")

s1 = sellers[0] # Ganesh Patil (Pune)
s2 = sellers[1] if len(sellers) > 1 else s1 # Krishna Jadhav
s3 = sellers[2] if len(sellers) > 2 else s1 # Mahadev Shinde
s4 = sellers[3] if len(sellers) > 3 else s1 # Ajay

# 4. Product Definitions (25 Items across the 4 BigHaat columns)
equipments_data = [
    # --- COLUMN 1: IMPLEMENTS ---
    {
        'key': 'balwaan_battery_sprayer',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/balwaan-bs-22d-double-motor-battery-sprayer-12x12-implements-file-11371.jpg?v=1737446297',
        'target_file': 'balwaan_bs22d_double_motor_sprayer_480x600.webp',
        'name': 'Balwaan BS-22D Double Motor Knapsack Battery Sprayer (12V 12Ah, 16L)',
        'brand': brand_objs['Balwaan Krishi'],
        'seller': s1,
        'price': Decimal('3650.00'),
        'mrp': Decimal('4800.00'),
        'discount_percent': Decimal('24.00'),
        'stock': 35,
        'unit': 'piece',
        'weight': '16 Litre Tank (6.8 kg)',
        'rating': Decimal('4.9'),
        'total_reviews': 240,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Balwaan BS-22D Krishi is a heavy-duty double motor battery-operated knapsack agricultural sprayer designed for spraying pesticides, fungicides, and liquid foliar fertilizers. Features dual high-pressure diaphragm pumps delivering up to 100 PSI pressure, heavy-duty 12V 12Ah dry battery, stainless steel telescopic lance, and 4 interchangeable brass nozzles.",
        'ingredients': "High Density Polyethylene (HDPE) UV stabilized 16L tank, Dual 12V Diaphragm Pumps (100 PSI / 4.5 LPM discharge), 12V 12Ah Rechargeable Lead-Acid Battery, SS Telescopic Lance.",
        'usage_instructions': "Charge battery for 6-8 hours before first use (gives 25-30 tanks per charge). Select single or double motor switch as required. Clean tank and nozzles with fresh water after each chemical spray session."
    },
    {
        'key': 'kisankraft_brush_cutter',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/brush-cutter-kk-bc-8640-file-2629.jpg?v=1737428997',
        'target_file': 'kisankraft_kk_bc_8640_brush_cutter_480x600.webp',
        'name': 'KisanKraft KK-BC-8640 4-Stroke 35cc Sidepack Brush Cutter & Crop Harvester',
        'brand': brand_objs['KisanKraft'],
        'seller': s2,
        'price': Decimal('12999.00'),
        'mrp': Decimal('16500.00'),
        'discount_percent': Decimal('21.00'),
        'stock': 20,
        'unit': 'piece',
        'weight': '35cc (8.5 kg)',
        'rating': Decimal('4.8'),
        'total_reviews': 185,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "KisanKraft KK-BC-8640 is an advanced 4-stroke 35cc petrol brush cutter designed for multi-crop harvesting (paddy, wheat, fodder) and tough farm weed clearing. Powered by a fuel-efficient 4-stroke engine (no petrol-oil mixing required). Comes with 80T carbide tipped circular blade, 3T steel grass blade, tap & go nylon trimmer, and paddy guard attachment.",
        'ingredients': "4-Stroke OHV Air-Cooled Petrol Engine (35.8cc, 1.0 kW / 1.3 HP @ 7000 RPM), Solid Steel Drive Shaft, Ergonomic Bike Handles with Throttle Safety Lock.",
        'usage_instructions': "Fill pure petrol in fuel tank and 20W40 engine oil in oil sump (do not mix oil in fuel). Attach 80T blade with paddy guard for crop harvesting or nylon line for orchard trimming. Wear safety goggles and boots during operation."
    },
    {
        'key': 'balwaan_power_weeder_tiller',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/balwaan-7-hp-agricultural-power-weeder-bp-700-implements-file-11380.jpg?v=1737446322',
        'target_file': 'balwaan_bp700_7hp_power_weeder_tiller_480x600.webp',
        'name': 'Balwaan BP-700 7HP Heavy Duty Petrol Agricultural Power Weeder & Tiller',
        'brand': brand_objs['Balwaan Krishi'],
        'seller': s3,
        'price': Decimal('32500.00'),
        'mrp': Decimal('42000.00'),
        'discount_percent': Decimal('23.00'),
        'stock': 12,
        'unit': 'piece',
        'weight': '7 HP Engine (85 kg)',
        'rating': Decimal('4.9'),
        'total_reviews': 114,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Balwaan BP-700 is a powerful 7 HP 4-stroke agricultural power weeder and rotary cultivator engineered for primary and secondary tillage, inter-row de-weeding in cotton, sugarcane, banana, and vegetables. Features heavy-duty direct gear-drive transmission (2 Forward + 1 Reverse), adjustable tilling width (24 to 42 inches), and 32 hardened carbon-steel rotary blades.",
        'ingredients': "7.0 HP 212cc 4-Stroke Commercial Petrol Engine, Cast Iron Gearbox with Oil Bath Clutch, 32 High-Carbon Rotary Tiller Blades, 4.00-8 Heavy Traction Tyres.",
        'usage_instructions': "Check 4-stroke engine oil (10W30/20W40) and 80W90 gear oil levels before operating. Use forward gears for weeding and rotary tilling; use reverse gear for tight field headland turns. Cultivates up to 1 acre in 2-2.5 hours."
    },
    {
        'key': 'balwaan_chaff_cutter',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/Reserved_ImageAttachment__13___ProductImage1_32___a05c90e498ad4203b3607f7e8aeb826c_1___1.png?v=1750160574',
        'target_file': 'balwaan_ch300_chaff_cutter_480x600.webp',
        'name': 'Balwaan CH-300 Electric Chaff Cutter Machine with 3HP Motor & Gear System',
        'brand': brand_objs['Balwaan Krishi'],
        'seller': s1,
        'price': Decimal('26900.00'),
        'mrp': Decimal('34500.00'),
        'discount_percent': Decimal('22.00'),
        'stock': 15,
        'unit': 'piece',
        'weight': '3 HP Motor (72 kg)',
        'rating': Decimal('4.8'),
        'total_reviews': 98,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Balwaan CH-300 is a high-capacity electric chaff cutter designed for dairy and livestock farmers. Efficiently chops dry and green fodder (maize stalks, bajra, napier grass, sugarcane tops, hay) into uniform cattle feed sizes (10-15 mm) at a rapid output capacity of 600-800 kg/hour. Equipped with a copper-wound 3HP single-phase motor and a 4-blade high-speed cutter head.",
        'ingredients': "3.0 HP 220V 100% Copper Single Phase Electric Motor, 4 Manganese Steel Forged Cutter Blades, Reinforced Heavy Gauge Steel Hopper & Feeding Rollers.",
        'usage_instructions': "Plug into 16A single-phase power outlet with MCB protection. Feed fodder steadily into the hopper. Lubricate gear mechanism and grease bearings weekly for smooth vibration-free operation."
    },
    {
        'key': 'rudra_solar_dryer',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/rudra-solar-dryer-2-5kg-file-14825.png',
        'target_file': 'rudra_solar_dryer_food_dehydrator_480x600.webp',
        'name': 'Rudra Agri Solar Tunnel Dryer & High Efficiency Food Dehydrator',
        'brand': brand_objs['Tapas'],
        'seller': s4,
        'price': Decimal('8999.00'),
        'mrp': Decimal('11500.00'),
        'discount_percent': Decimal('22.00'),
        'stock': 18,
        'unit': 'piece',
        'weight': 'Solar Food Dehydrator (15 kg)',
        'rating': Decimal('4.7'),
        'total_reviews': 54,
        'is_featured': False,
        'has_free_delivery': True,
        'description': "Rudra Agri Solar Tunnel Dryer is an eco-friendly solar dehydrator designed for hygienic drying of post-harvest agricultural produce: red chillies, turmeric, ginger, grapes/raisins, moringa leaves, seeds, and vegetables. Features multi-wall UV stabilized polycarbonate glazing that traps infrared solar radiation, maintaining temperature between 45-65°C with solar ventilation fans.",
        'ingredients': "Anodized Powder-Coated Aluminum Frame, Multiwall UV Polycarbonate Sheet, Stainless Steel SS304 Food-Grade Drying Trays, 12V Solar Exhaust Fan with Panel.",
        'usage_instructions': "Place in open sunlight facing south. Spread washed/sliced produce uniformly on food-grade SS mesh trays. Polycarbonate glazing accelerates drying time by 60% compared to open-air sun drying while preventing dust and insect contamination."
    },
    {
        'key': 'agrotech_rice_mill',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/Reserved_ImageAttachment__13___ProductImage1_32___5d5ce2785ae24c4eaee248611acfe577_1___1.png',
        'target_file': 'agrotech_combined_mini_rice_mill_480x600.webp',
        'name': 'AgroTech Combined Mini Rice Mill & Flour Grinder Machine (3HP Motor)',
        'brand': brand_objs['KisanKraft'],
        'seller': s2,
        'price': Decimal('28500.00'),
        'mrp': Decimal('36000.00'),
        'discount_percent': Decimal('21.00'),
        'stock': 10,
        'unit': 'piece',
        'weight': '3 HP Electric (78 kg)',
        'rating': Decimal('4.9'),
        'total_reviews': 76,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "AgroTech 2-in-1 Combined Mini Rice Mill and Flour Pulverizer allows farmers to mill raw paddy into clean, polished white rice while grinding grains, maize, and spices on the reverse side. Powered by a heavy-duty 3 HP single-phase motor with a milling capacity of 150-200 kg paddy per hour and 95% head rice recovery with low broken percentage.",
        'ingredients': "Alloy Steel Hulling Shaft, Emery Roller Polisher, 3 HP 2800 RPM Copper Motor, Dual Hopper for Paddy and Flour Milling, Dust Separation Cyclone.",
        'usage_instructions': "Connect to 230V 16A domestic/agricultural power. Adjust hulling clearance lever according to paddy grain variety (Basmati/Kolam/IR64). Empty husk collection bag periodically."
    },
    {
        'key': 'balwaan_earth_auger',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/samrat-earth-auger-with-foldable-trolley-with-8inch-bit-68cc-seat68-file-14962.png',
        'target_file': 'balwaan_68cc_earth_auger_trolley_480x600.webp',
        'name': 'Balwaan 68cc Petrol Earth Auger Post Hole Digger with Foldable Trolley (8-Inch Bit)',
        'brand': brand_objs['Balwaan Krishi'],
        'seller': s1,
        'price': Decimal('14800.00'),
        'mrp': Decimal('18900.00'),
        'discount_percent': Decimal('22.00'),
        'stock': 22,
        'unit': 'piece',
        'weight': '68cc Engine with Trolley (22 kg)',
        'rating': Decimal('4.8'),
        'total_reviews': 89,
        'is_featured': False,
        'has_free_delivery': True,
        'description': "Balwaan 68cc trolley-mounted petrol earth auger allows single-operator effortless drilling of deep plantation pits, orchard tree planting (mango, guava, pomegranate), solar panel mounting, and boundary fencing holes. Ergonomic trolley design absorbs all rotational vibration, allowing one person to dig up to 50-60 holes per hour up to 3 feet depth.",
        'ingredients': "68cc 2-Stroke High Torque Petrol Engine (2.8 HP), Foldable Pneumatic-Wheeled Heavy Tubular Trolley, 8-Inch x 800mm High Carbon Alloy Steel Spiral Drill Bit.",
        'usage_instructions': "Mix 2T engine oil with petrol in 1:25 ratio. Position trolley over marked hole spot and depress throttle lever smoothly. Digs through hard soil, gravel, and clay in under 45 seconds."
    },
    {
        'key': 'vgt_power_reaper',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/vgt-power-reaper-2fd-honda-5-hp-petrol-file-11554.jpg',
        'target_file': 'vgt_power_reaper_honda_5hp_480x600.webp',
        'name': 'VGT 2FD Walking Power Reaper 5HP Petrol (Paddy, Wheat & Soybean Harvester)',
        'brand': brand_objs['Honda Power'],
        'seller': s3,
        'price': Decimal('89000.00'),
        'mrp': Decimal('110000.00'),
        'discount_percent': Decimal('19.00'),
        'stock': 6,
        'unit': 'piece',
        'weight': '5 HP Petrol Harvester (115 kg)',
        'rating': Decimal('4.9'),
        'total_reviews': 62,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "VGT 2FD walking self-propelled power reaper powered by Honda GX200 5.0 HP petrol engine. Reaps and neatly windrows paddy, wheat, barley, soybean, and fodder crops in neat rows on the right side for easy bundling. Cuts 1 acre of crop in 45-60 minutes at a low cutting height of 2-3 inches from ground level, eliminating harvest labor bottlenecks.",
        'ingredients': "Honda GX200 4-Stroke Commercial Engine (5.0 HP), Heavy Duty Cutter Bar with Serrated High Speed Knife Blades, Star Wheel Conveyor Conveying Lug Belts, Lugged Agri Wheels.",
        'usage_instructions': "Operate when crop grain moisture is between 15-20%. Adjust cutter height lever to 2-3 inches above ground. Harvest at walking pace for uniform swath laying."
    },
    {
        'key': 'balwaan_chainsaw',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/balwaan-cs-560-22-inches-chainsaw-file-21245.png',
        'target_file': 'balwaan_cs560_petrol_chainsaw_480x600.webp',
        'name': 'Balwaan CS-560 56cc Heavy Duty Petrol Chainsaw with 22-Inch Guide Bar',
        'brand': brand_objs['Balwaan Krishi'],
        'seller': s2,
        'price': Decimal('7850.00'),
        'mrp': Decimal('9990.00'),
        'discount_percent': Decimal('21.00'),
        'stock': 28,
        'unit': 'piece',
        'weight': '56cc Engine (6.8 kg)',
        'rating': Decimal('4.7'),
        'total_reviews': 130,
        'is_featured': False,
        'has_free_delivery': True,
        'description': "Balwaan CS-560 is a professional 56cc 2-stroke petrol chainsaw with a 22-inch high-grade alloy guide bar and titanium carbide chain. Built for farm tree pruning, orchard management, firewood cutting, and clearing fallen storm timber. Features an automatic chain oiler, quick chain tensioner, anti-vibration damping system, and rapid inertia kickback chain brake.",
        'ingredients': "56cc 2.4 kW Air-Cooled 2-Stroke Petrol Engine, 22-Inch Laser-Hardened Guide Bar, High-Tensile 0.325 Pitch Saw Chain, Magnesium Alloy Crankcase.",
        'usage_instructions': "Use 1:25 ratio 2T oil-petrol mixture for fuel and SAE 30 oil in automatic chain lubrication tank. Engage inertia chain brake when starting or moving between trees."
    },
    {
        'key': 'electric_sugarcane_machine',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/crop-10-electric-sugarcane-juice-machine-file-11544.jpg',
        'target_file': 'crop10_electric_sugarcane_crusher_480x600.webp',
        'name': 'Crop-10 Commercial Electric Sugarcane Juice Crusher Machine (1.5HP Motor)',
        'brand': brand_objs['Tapas'],
        'seller': s4,
        'price': Decimal('38000.00'),
        'mrp': Decimal('48000.00'),
        'discount_percent': Decimal('21.00'),
        'stock': 8,
        'unit': 'piece',
        'weight': '1.5 HP Motor (65 kg)',
        'rating': Decimal('4.8'),
        'total_reviews': 45,
        'is_featured': False,
        'has_free_delivery': True,
        'description': "Crop-10 commercial stainless steel sugarcane crusher machine extracts 99% pure, fresh cane juice in a single pass. Features 3 food-grade SS304 grooved solid rollers, enclosed gearbox transmission, reverse switch for clearance, and a micro-mesh filter tray. Ideal for agricultural farm stands, village agritourism, and rural entrepreneurship.",
        'ingredients': "Full Food-Grade SS304 Stainless Steel Body and 3 Rollers, 1.5 HP Single Phase 100% Copper Gearbox Motor, Stainless Steel Filter Mesh and Tap.",
        'usage_instructions': "Operate on 220V power supply. Feed washed, peeled sugarcane stalks through roller entry. Single pass delivers complete juice extraction without re-feeding dry bagasse."
    },

    # --- COLUMN 2: AGRICULTURE TOOLS ---
    {
        'key': 'nursery_pro_trays',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/tray-1-file-281.jpg?v=1737427094',
        'target_file': 'seedling_nursery_pro_trays_pack50_480x600.webp',
        'name': 'Seedling Nursery Pro-Trays (Pack of 50 Trays, 98 Cavities) & Coco Peat Block',
        'brand': brand_objs['Tapas'],
        'seller': s1,
        'price': Decimal('799.00'),
        'mrp': Decimal('1150.00'),
        'discount_percent': Decimal('31.00'),
        'stock': 65,
        'unit': 'pack',
        'weight': 'Pack of 50 Trays + 5kg Coco Peat',
        'rating': Decimal('4.9'),
        'total_reviews': 168,
        'is_featured': True,
        'has_free_delivery': False,
        'description': "Professional nursery seed germination seedling kit containing 50 heavy-duty reusable 98-cavity pro-trays and one 5kg washed low-EC coco peat expansion block. Designed for raising high-value vegetable seedlings (tomato, chilli, capsicum, cabbage, onion) with 100% root ball preservation and zero root shock during field transplanting.",
        'ingredients': "Virgin UV-Stabilized Flexible Polypropylene Plastic (0.8mm thickness), 98 Deep Inverted Pyramid Cavities with Bottom Drainage Hole, Low-EC (<0.5 mS/cm) Washed Coco Peat.",
        'usage_instructions': "Hydrate 5kg coco peat block with 25L water to yield 70-75L substrate. Fill cavities, sow 1 hybrid seed per cell at 0.5 cm depth, and water gently with a fine rose spray can."
    },
    {
        'key': 'dharati_fruit_harvester',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/dharati-mango-harvester-fruit-plucker-file-15582.png?v=1737452218',
        'target_file': 'dharati_fruit_harvester_plucker_480x600.webp',
        'name': 'Dharati Telescopic Mango & Fruit Harvester / Plucker with Cotton Net (12ft Reach)',
        'brand': brand_objs['Falcon Tools'],
        'seller': s2,
        'price': Decimal('649.00'),
        'mrp': Decimal('899.00'),
        'discount_percent': Decimal('28.00'),
        'stock': 55,
        'unit': 'piece',
        'weight': 'Telescopic Plucker (1.2 kg)',
        'rating': Decimal('4.7'),
        'total_reviews': 115,
        'is_featured': False,
        'has_free_delivery': False,
        'description': "Dharati telescopic fruit harvester and plucker tool allows ground-level harvesting of mangoes, guavas, oranges, pomegranates, and apples without bruising or fruit fall damage. Features dual razor-sharp stainless steel harvesting teeth and a deep, soft cotton cushion net pocket that holds up to 4-5 fruits per pick.",
        'ingredients': "Lightweight Extruded Aluminum Telescopic Pole (expands from 6ft to 12ft), Carbon Steel Razor Cutting V-Blade, 100% Heavy-Duty Cotton Net Bag.",
        'usage_instructions': "Hook stem of fruit between cutting teeth and gently pull backwards. The cut stem releases fruit smoothly into the padded net below, maintaining the natural fruit bloom and stalk."
    },
    {
        'key': 'hectare_pruning_secateur',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/hectare-precision-garden-pruning-secateur-anvil-pruner-upto-12mm-file-17306.png',
        'target_file': 'hectare_pruning_secateur_cutter_480x600.webp',
        'name': 'Hectare Precision Garden Pruning Secateur & Anvil Branch Cutter (SK-5 Steel)',
        'brand': brand_objs['Falcon Tools'],
        'seller': s3,
        'price': Decimal('425.00'),
        'mrp': Decimal('599.00'),
        'discount_percent': Decimal('29.00'),
        'stock': 70,
        'unit': 'piece',
        'weight': 'Hand Secateur (240g)',
        'rating': Decimal('4.8'),
        'total_reviews': 195,
        'is_featured': True,
        'has_free_delivery': False,
        'description': "Hectare professional heavy-duty bypass pruning secateur made from Japanese SK-5 high carbon hardened tool steel. Cuts clean through tree branches, rose stems, grapevines, pomegranate suckers, and vegetable shoots up to 20mm diameter without tearing plant bark. Ergonomic non-slip aluminum grips with safety thumb lock.",
        'ingredients': "Teflon-Coated SK-5 High Carbon Alloy Steel Blade, Forged Aluminum Alloy Body, High Tensile Volute Spring, Ergonomic PVC Non-Slip Grip.",
        'usage_instructions': "Position branch deep into cutter jaw near pivot for maximum leverage and clean 45-degree angle cut. Wipe blade clean and oil pivot joint after pruning orchard plants."
    },
    {
        'key': 'seedling_transplanter',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/vegetable-seedling-transplanter-vt33-file-2727.jpg',
        'target_file': 'vt33_seedling_transplanter_tool_480x600.webp',
        'name': 'VT-33 Single-Man Manual Vegetable Seedling Transplanter Tool (Stainless Steel)',
        'brand': brand_objs['Tapas'],
        'seller': s4,
        'price': Decimal('1350.00'),
        'mrp': Decimal('1850.00'),
        'discount_percent': Decimal('27.00'),
        'stock': 40,
        'unit': 'piece',
        'weight': 'Stainless Steel Tool (2.1 kg)',
        'rating': Decimal('4.8'),
        'total_reviews': 82,
        'is_featured': False,
        'has_free_delivery': True,
        'description': "VT-33 manual stand-up vegetable seedling transplanter allows a single farmer to transplant seedlings (tomato, chilli, brinjal, onion, cabbage) directly through plastic mulch into soil without bending. Replaces 4-5 farm laborers while preventing back pain. Sharp three-beak stainless steel tip punctures mulch and creates perfect depth planting pocket.",
        'ingredients': "Rustproof High-Grade SS304 Stainless Steel Tube (3-inch diameter x 92 cm height), Ergonomic Dual Trigger Release Handle, Hardened Steel Duckbill Beak.",
        'usage_instructions': "Hold tool upright, pierce plastic mulch and soil with beak, drop seedling down the funnel tube, squeeze release lever to open beak, and lift tool up while gently pressing soil with foot."
    },

    # --- COLUMN 3: ACCESSORIES ---
    {
        'key': 'shelter_hdpe_tarpaulin',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/shelter-regular-hdpe-tarpaulins-black-250-gsm-file-17673.png',
        'target_file': 'shelter_hdpe_tarpaulin_250gsm_480x600.webp',
        'name': 'Shelter Heavy Duty Multi-Layer Waterproof HDPE Tarpaulin Sheet (250 GSM, 24x18 ft)',
        'brand': brand_objs['Mipatex'],
        'seller': s1,
        'price': Decimal('2850.00'),
        'mrp': Decimal('3800.00'),
        'discount_percent': Decimal('25.00'),
        'stock': 45,
        'unit': 'piece',
        'weight': '24ft x 18ft (250 GSM, 9.8 kg)',
        'rating': Decimal('4.9'),
        'total_reviews': 210,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Shelter 250 GSM 100% waterproof virgin HDPE tarpaulin sheet (tirpal) with multi-layer UV stabilization. Ideal for grain protection, onion/cotton drying yards, cattle shed roofs, tractor coverings, and hay protection against heavy monsoon rains. Features heat-sealed ultrasonic hemmed borders with aluminum rustproof eyelets every 3 feet.",
        'ingredients': "100% Virgin High Density Polyethylene (HDPE) Woven Fabric, Dual Laminated LDPE Waterproof Film Coating with 3% Masterbatch UV Stabilizer, Reinforced Aluminum Eyelets.",
        'usage_instructions': "Secure tarpaulin through eyelets using elastic bungee cords or nylon ropes. Ensure slight slope when covering grain mounds so rainwater drains off quickly without pooling."
    },
    {
        'key': 'silver_black_mulch_film',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/daimond-tarpaulin-mulching-sheet-silver-black-mulch-width-4-ft-length-600-m-25-mic-file-4331.jpg',
        'target_file': 'silver_black_mulch_film_25mic_400m_480x600.webp',
        'name': 'Mipatex UV Stabilized Silver & Black Agricultural Mulching Film (25 Micron, 4ft x 400m)',
        'brand': brand_objs['Mipatex'],
        'seller': s3,
        'price': Decimal('1799.00'),
        'mrp': Decimal('2350.00'),
        'discount_percent': Decimal('23.00'),
        'stock': 50,
        'unit': 'roll',
        'weight': '4ft x 400m Roll (25 Micron, 14 kg)',
        'rating': Decimal('4.9'),
        'total_reviews': 188,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Mipatex 25-micron silver and black agricultural mulching film roll. Silver top side reflects 30% solar radiation onto crop canopy to deter aphids and thrips while cooling root zones; black underside blocks 100% sunlight to completely prevent weed growth and reduce irrigation water loss by 40-50%. Boosts crop yields by 25-35%.",
        'ingredients': "Co-extruded Multi-layer Virgin LLDPE Polyethylene with High Performance UV Stabilizers and Carbon Black Pigments.",
        'usage_instructions': "Lay over raised garden or field beds with silver side facing upward and black side facing soil. Anchor edges with soil along the bed flanks before punching planting holes."
    },
    {
        'key': 'green_agro_shade_net',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/anil-packaging-garden-shade-net-50-shade-net-file-12270.jpg',
        'target_file': 'anil_agro_shade_net_50pct_3x50m_480x600.webp',
        'name': 'Anil Packaging 50% UV Stabilized Green Agro Shade Net (3m x 50m Roll)',
        'brand': brand_objs['Mipatex'],
        'seller': s2,
        'price': Decimal('2450.00'),
        'mrp': Decimal('3200.00'),
        'discount_percent': Decimal('23.00'),
        'stock': 35,
        'unit': 'roll',
        'weight': '3m x 50m Roll (150 sq.m, 16 kg)',
        'rating': Decimal('4.8'),
        'total_reviews': 95,
        'is_featured': False,
        'has_free_delivery': True,
        'description': "Premium 50% shading green agricultural net woven from 100% virgin HDPE monofilament tape with UV stabilizers. Protects plant nurseries, vegetable polyhouses, floriculture, and vermicompost pits from scorching summer heat, hail storms, strong winds, and bird attacks while ensuring optimal photosynthetic light diffusion.",
        'ingredients': "Virgin UV Treated High Density Polyethylene (HDPE) Monofilament Knitted Raschel Fabric, 50% Shade Factor, Tear-Resistant Lockstitch Knit.",
        'usage_instructions': "Fasten to bamboo, iron GI pipe, or cable supports using nylon clips or binding wire. Keeps nursery environment 4-6°C cooler during extreme summer heatwaves."
    },
    {
        'key': 'sticky_pheromone_traps',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/sk-agrotech-yellow-sticky-insect-trap-6-x-8-inch-file-16848.png',
        'target_file': 'sk_agrotech_yellow_sticky_pheromone_traps_480x600.webp',
        'name': 'SK Agrotech Yellow Sticky Traps & Fruit Fly Pheromone Lure Kit (Pack of 25)',
        'brand': brand_objs['Tapas'],
        'seller': s4,
        'price': Decimal('349.00'),
        'mrp': Decimal('480.00'),
        'discount_percent': Decimal('27.00'),
        'stock': 90,
        'unit': 'pack',
        'weight': 'Pack of 25 Traps + Ties',
        'rating': Decimal('4.8'),
        'total_reviews': 142,
        'is_featured': True,
        'has_free_delivery': False,
        'description': "Chemical-free organic pest monitoring and mass trapping kit. Includes 25 bright wavelength yellow sticky sheets coated on both sides with non-toxic waterproof insect glue to attract and capture whiteflies, aphids, thrips, and leaf miners, plus 2 fruit fly pheromone funnel traps with Bactrocera dorsalis lures.",
        'ingredients': "Recyclable Polypropylene Sheet (6x8 inch), UV-Resistant Non-Drip Polybutene Hot Melt Adhesive, Pheromone Attractant Septa Lures.",
        'usage_instructions': "Hang yellow sticky traps 6 inches above crop canopy at a rate of 10-15 traps per acre. Hang fruit fly funnel traps in tree foliage at chest height (4-6 traps per acre)."
    },
    {
        'key': 'farmer_safety_ppe_kit',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/bighaat-brand-tapas-farmer-safety-kit-file-8016.jpg',
        'target_file': 'tapas_farmer_chemical_spraying_safety_kit_480x600.webp',
        'name': 'Tapas Farmer Chemical Spraying PPE Safety Kit (Mask, Goggles, Gloves & Apron)',
        'brand': brand_objs['Tapas'],
        'seller': s1,
        'price': Decimal('299.00'),
        'mrp': Decimal('450.00'),
        'discount_percent': Decimal('33.00'),
        'stock': 120,
        'unit': 'set',
        'weight': 'Complete 5-Piece Safety Set (380g)',
        'rating': Decimal('4.9'),
        'total_reviews': 178,
        'is_featured': True,
        'has_free_delivery': False,
        'description': "Essential protective safety equipment kit designed specifically for Indian farmers and spray operators applying chemical pesticides, insecticides, and weedicides. Protects against skin dermal toxicity, inhalation of poisonous vapors, and eye irritation during field spraying.",
        'ingredients': "N95 Dual-Cartridge Activated Carbon Gas Respirator Mask, Anti-Fog Clear Polycarbonate Goggles, Chemical-Resistant Nitrile Heavy Gloves, Heavy Duty Waterproof PVC Apron.",
        'usage_instructions': "Wear all components before mixing and spraying chemicals in the field. Wash gloves and goggles with clean running water after spraying. Store respirator mask in dry pouch."
    },
    {
        'key': 'radhe_solar_farm_torch',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/radhe-agri-360-rotating-single-face-light-with-5200mah-rechargeable-battery-torch-1.png',
        'target_file': 'radhe_solar_farm_torch_lantern_480x600.webp',
        'name': 'Radhe Agri 360° Solar LED Emergency Farm Torch & Lantern (5200mAh Battery)',
        'brand': brand_objs['Tapas'],
        'seller': s2,
        'price': Decimal('899.00'),
        'mrp': Decimal('1299.00'),
        'discount_percent': Decimal('31.00'),
        'stock': 60,
        'unit': 'piece',
        'weight': 'Rechargeable Torch (620g)',
        'rating': Decimal('4.8'),
        'total_reviews': 106,
        'is_featured': False,
        'has_free_delivery': False,
        'description': "Heavy-duty dual-function long-range searchlight and 360-degree lantern designed for night irrigation, field patrolling, and power-cut emergencies. Equipped with a 20W high-power laser beam casting illumination up to 1.5 km distance, solar charging panel, USB mobile power bank, and 12-hour continuous battery backup.",
        'ingredients': "Impact-Resistant ABS Body, 20W Cree XML-T6 Laser LED + COB Side Floodlight, 5200mAh Lithium-ion Cell, Inbuilt Monocrystalline Solar Panel + USB Type-C Port.",
        'usage_instructions': "Charge via solar panel during the day or using 5V mobile charger (3-4 hours). Toggle button for long searchlight beam or side floodlight mode for night field watering."
    },
    {
        'key': 'floating_crop_cover',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/crop-cover-file-2864.jpg?v=1737436192',
        'target_file': 'mipatex_floating_crop_cover_17gsm_480x600.webp',
        'name': 'Mipatex Non-Woven Polypropylene Floating Row Crop Cover (17 GSM, 3m x 100m)',
        'brand': brand_objs['Mipatex'],
        'seller': s3,
        'price': Decimal('1550.00'),
        'mrp': Decimal('2100.00'),
        'discount_percent': Decimal('26.00'),
        'stock': 40,
        'unit': 'roll',
        'weight': '3m x 100m Roll (17 GSM, 5.5 kg)',
        'rating': Decimal('4.7'),
        'total_reviews': 71,
        'is_featured': False,
        'has_free_delivery': True,
        'description': "Mipatex 17 GSM ultra-lightweight spunbond non-woven crop fleece cover. Laid directly over crops like watermelon, muskmelon, strawberry, and vegetables without stakes. Allows 85% sunlight, rainwater, and air to pass while creating a microclimate that prevents frost damage, insect pest entry (whiteflies/leaf miners), and wind damage.",
        'ingredients': "100% Virgin Spunbond Non-Woven Polypropylene (17 GSM) with 2-Year UV Anti-Degradation Additives.",
        'usage_instructions': "Lay loosely over seedbeds immediately after sowing or transplanting, allowing extra slack for plant growth. Anchor borders with soil or pegs. Remove during flowering for bee pollination."
    },

    # --- COLUMN 4: IRRIGATION ---
    {
        'key': 'lapeta_laser_spray_pipe',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/laser-spray-laser-punched-water-spray-system-file-5205.jpg',
        'target_file': 'laser_spray_lapeta_hose_pipe_2_5inch_480x600.webp',
        'name': 'Mipatex Laser Punched Flexible Lapeta Rain Irrigation Hose Pipe (2.5 Inch, 60m)',
        'brand': brand_objs['Mipatex'],
        'seller': s1,
        'price': Decimal('1150.00'),
        'mrp': Decimal('1600.00'),
        'discount_percent': Decimal('28.00'),
        'stock': 55,
        'unit': 'roll',
        'weight': '2.5 Inch x 60m Roll (8.5 kg)',
        'rating': Decimal('4.8'),
        'total_reviews': 135,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Mipatex laser punched rain spray lapeta pipe generates uniform micro-jet rain showers spanning 10-15 feet on either side under low operating water pressure (1-2 kg/cm²). Ideal for groundnut, onion, garlic, wheat, leafy greens, and pulses. Lightweight flexible design allows effortless rolling and moving between fields.",
        'ingredients': "Virgin Multi-Layer LLDPE Polymer with High Burst Pressure (3 bar), Precision Laser-Drilled Tri-Hole Patterns, UV Stabilized Coating.",
        'usage_instructions': "Connect to delivery pump outlet using camlock or hose clamp. Unroll flat along plant rows. Operates directly on low pressure, providing deep soaking rain effect without eroding topsoil."
    },
    {
        'key': 'balwaan_water_pump',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/balwaan-agriculture-water-pump-set-wp22r-file-15437.png',
        'target_file': 'balwaan_wp22r_2hp_water_pump_480x600.webp',
        'name': 'Balwaan WP-22R 2HP High Pressure Agricultural Monobloc Water Pump Set',
        'brand': brand_objs['Balwaan Krishi'],
        'seller': s2,
        'price': Decimal('8990.00'),
        'mrp': Decimal('12000.00'),
        'discount_percent': Decimal('25.00'),
        'stock': 25,
        'unit': 'piece',
        'weight': '2.0 HP Pump Set (18 kg)',
        'rating': Decimal('4.9'),
        'total_reviews': 118,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Balwaan WP-22R is a high-performance 2.0 HP single-phase centrifugal monobloc agricultural water pump designed for open well, river, canal, and farm pond water lifting. Features 2-inch suction and discharge delivery ports delivering up to 30,000 Litres/Hour discharge with a 28-meter head. 100% pure copper winding with thermal overload protection.",
        'ingredients': "Heavy Cast Iron Pump Casing, High-Grade Gunmetal Impeller, 2.0 HP 2880 RPM Copper-Wound Electric Motor, Mechanical Carbon-Ceramic Seal.",
        'usage_instructions': "Prime pump casing fully with water before initial startup. Connect 2-inch suction hose with non-return foot valve. Operates smoothly on 180V-240V rural single-phase voltages."
    },
    {
        'key': 'netafim_sprinkler_kit',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/netafim-flexi-sprinkler-kit-2x50m-5n-1800-file-13121.webp',
        'target_file': 'netafim_flexi_sprinkler_kit_480x600.webp',
        'name': 'Netafim Flexi Overhead Agricultural Sprinkler Kit (2x50m, 5 Stand Assemblies)',
        'brand': brand_objs['Netafim'],
        'seller': s3,
        'price': Decimal('4290.00'),
        'mrp': Decimal('5500.00'),
        'discount_percent': Decimal('22.00'),
        'stock': 30,
        'unit': 'set',
        'weight': '5-Nozzle Sprinkler Kit (12 kg)',
        'rating': Decimal('4.9'),
        'total_reviews': 94,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Netafim Flexi Sprinkler Kit is an all-in-one ready-to-assemble overhead irrigation system for field crops, vegetables, and pastures. Covers 1/2 acre area with 5 precision rotating impact sprinklers mounted on quick-connect metal risers and flexible 2x50m lateral tubing. Ensures 90% water distribution uniformity and cuts power/water usage by 40%.",
        'ingredients': "5 High-Efficiency Rotating Impact Sprinklers (10-12m wetting radius each), 100m Flexible UV Treated Lateral Tubing, 5 Metal Riser Stakes and Connectors.",
        'usage_instructions': "Lay lateral lines spaced 10 meters apart, plug in metal risers, and connect to water main with 2-2.5 kg/cm² pressure. Provides gentle, soaking rain droplet distribution."
    },
    {
        'key': 'mipatex_inline_drip_kit',
        'img_url': 'https://cdn.shopify.com/s/files/1/0722/2059/files/mipatex-inline-drip-irrigation-pipe-dripper-at-each-40cm-4-litre-water-discharge-per-hour-1-file-5586.jpg',
        'target_file': 'mipatex_inline_drip_kit_500plants_480x600.webp',
        'name': 'Mipatex Gravity-Fed Inline Drip Irrigation Kit for 500 Plants (Complete System)',
        'brand': brand_objs['Mipatex'],
        'seller': s4,
        'price': Decimal('2499.00'),
        'mrp': Decimal('3400.00'),
        'discount_percent': Decimal('26.00'),
        'stock': 45,
        'unit': 'set',
        'weight': '500-Plant Drip Kit (11 kg)',
        'rating': Decimal('4.8'),
        'total_reviews': 156,
        'is_featured': True,
        'has_free_delivery': True,
        'description': "Mipatex complete inline drip irrigation kit designed for 500 vegetable, orchard, or cash crop plants (1/4 acre). Includes 250 meters of 16mm inline drip tubing with pre-spaced pressure-compensating drippers (40cm spacing, 4 LPH discharge), screen disc filter, venture fertilizer injector, ball valves, end caps, and joiners.",
        'ingredients': "16mm Virgin LLDPE Drip Pipe (250m) with Clog-Resistant Cylindrical Drippers, 3/4 Inch Screen Filter, Venturi Injector, Complete Barbed Fittings Set.",
        'usage_instructions': "Connect mainline to water tank or pump through the provided screen filter. Run inline tubes along crop rows. Flush system before capping ends to purge pipe debris."
    }
]

created_count = 0
updated_count = 0

for item in equipments_data:
    target_file = item['target_file']
    img_rel_path = download_and_resize(item['img_url'], target_file)
    if not img_rel_path:
        img_rel_path = f"products/{target_file}"

    defaults = {
        'category': equipment_cat,
        'brand': item['brand'],
        'seller': item['seller'],
        'price': item['price'],
        'mrp': item['mrp'],
        'discount_percent': item['discount_percent'],
        'stock': item['stock'],
        'unit': item['unit'],
        'weight': item['weight'],
        'rating': item['rating'],
        'total_reviews': item['total_reviews'],
        'is_featured': item['is_featured'],
        'has_free_delivery': item['has_free_delivery'],
        'is_active': True,
        'description': item['description'],
        'ingredients': item['ingredients'],
        'usage_instructions': item['usage_instructions'],
        'image': img_rel_path
    }

    prod, created = Product.objects.update_or_create(
        name=item['name'],
        defaults=defaults
    )
    if created:
        created_count += 1
        print(f"Created Equipment: {item['name']} (Brand: {item['brand'].name})")
    else:
        updated_count += 1
        print(f"Updated Equipment: {item['name']} (Brand: {item['brand'].name})")

print(f"\n==========================================")
print(f"Equipment Seeding Complete!")
print(f"Created: {created_count}, Updated: {updated_count}")
print(f"Total Equipment in DB: {Product.objects.filter(category=equipment_cat).count()}")
print(f"==========================================")
