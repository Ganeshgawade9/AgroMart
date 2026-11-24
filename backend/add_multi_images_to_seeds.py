import os
import sys
import django
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"d:\MY_PROJECTS\agroconnect\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import Product

SRC_DIR = r"C:\Users\ganes\Downloads\Buy Best-Quality Seeds Online _ Starting from ₹20 _ BigHaat"
MEDIA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'media', 'products')
os.makedirs(MEDIA_DIR, exist_ok=True)

def process_and_save(src_filename, target_filename, target_size=(480, 600)):
    src_path = os.path.join(SRC_DIR, src_filename)
    target_path = os.path.join(MEDIA_DIR, target_filename)
    
    if not os.path.exists(src_path):
        print(f"Warning: {src_filename} not found")
        return None
        
    try:
        img = Image.open(src_path)
        img = img.convert('RGB')
        
        target_w, target_h = target_size
        img.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
        
        canvas = Image.new('RGB', target_size, (255, 255, 255))
        offset_x = (target_w - img.width) // 2
        offset_y = (target_h - img.height) // 2
        canvas.paste(img, (offset_x, offset_y))
        
        canvas.save(target_path, 'WEBP', quality=92)
        return f"products/{target_filename}"
    except Exception as e:
        print(f"Error {src_filename}: {e}")
        return None

# Map products to their specific image2 and image3
MULTI_IMAGE_MAP = {
    # Sagar King Plus Watermelon
    'Sagar King Plus F1 Hybrid Watermelon Seeds': {
        'img2': ('imgi_4565_sagar-king-plus-f1-watermelon-2.png', 'sagar_king_plus_watermelon_angle2_480x600.webp'),
        'img3': ('imgi_3887_sagar-singham-f1-watermelon-1.png', 'sagar_king_plus_watermelon_produce_480x600.webp')
    },
    # Sagar Sneha 75 Bitter Gourd
    'Sagar Sneha 75 F1 Hybrid Bitter Gourd Seeds': {
        'img2': ('imgi_3708_vanita-bitter-gourd-green-gold-file-16279.png', 'sagar_sneha75_bitter_gourd_produce_480x600.webp'),
        'img3': ('imgi_3673_isp106-bitter-gourd-file-14742.png', 'sagar_sneha75_bitter_gourd_field_480x600.webp')
    },
    # Sagar Pushpa Tomato
    'Sagar Pushpa F1 Hybrid Tomato Seeds': {
        'img2': ('imgi_3901_sagar-shiva-f1-tomato-file-17142.png', 'sagar_pushpa_tomato_angle2_480x600.webp'),
        'img3': ('imgi_3427_fb-madhav-f1-tomato-seeds-round-red-file-9541.png', 'sagar_pushpa_tomato_produce_480x600.webp')
    },
    # Sagar Royal Orange Marigold
    'Sagar Royal Orange F1 Hybrid Marigold Seeds': {
        'img2': ('imgi_4587_sagar-yellow-karina-f1-marigold-file-17179.png', 'sagar_royal_orange_marigold_angle2_480x600.webp'),
        'img3': ('imgi_4586_sagar-royal-orange-f1-marigold-file-17182.png', 'sagar_royal_orange_marigold_field_480x600.webp')
    },
    # IAHS Indam Mumtaz Capsicum
    'IAHS Indam Mumtaz F1 Hybrid Capsicum Seeds': {
        'img2': ('imgi_4604_iris-hybrid-vegetable-seeds-green-capsicum-file-9365.jpg', 'iahs_mumtaz_capsicum_produce_480x600.webp'),
        'img3': ('imgi_3895_sagar-11-f1-capsicum-file-17130.png', 'iahs_mumtaz_capsicum_harvest_480x600.webp')
    },
    # IAHS Indam 2154 Chilli
    'IAHS Indam 2154 F1 Hybrid Chilli Seeds': {
        'img2': ('imgi_4023_sagar-1971-f1-chilli-seeds-file-21050.png', 'iahs_2154_chilli_produce_480x600.webp'),
        'img3': ('imgi_3117_yashaswaini-chilli-file-2313.png', 'iahs_2154_chilli_harvest_480x600.webp')
    },
    # IAHS Marvel Gold Marigold
    'IAHS Marvel Gold F1 Marigold Seeds': {
        'img2': ('imgi_4589_iris-marigold-orange-ihs-786-2.png', 'iahs_marvel_gold_marigold_angle2_480x600.webp'),
        'img3': ('imgi_4590_iris-marigold-orange-ihs-786-3.png', 'iahs_marvel_gold_marigold_bloom_480x600.webp')
    },
    # Urja Himshikha Tomato
    'Urja Himshikha F1 Hybrid Tomato Seeds': {
        'img2': ('imgi_3124_ns-4266-tomato-file-5319.png', 'urja_himshikha_tomato_vine_480x600.webp'),
        'img3': ('imgi_3427_fb-madhav-f1-tomato-seeds-round-red-file-9541.png', 'urja_himshikha_tomato_produce_480x600.webp')
    },
    # Urja Sadabhar Chilli
    'Urja Sadabhar Chilli Seeds': {
        'img2': ('imgi_4025_sagar-6405-f1-chilli-seeds-file-21054.png', 'urja_sadabhar_chilli_produce_480x600.webp'),
        'img3': ('imgi_4016_sagar-31-f1-chilli-seeds-file-21041.png', 'urja_sadabhar_chilli_harvest_480x600.webp')
    },
    # Urja Monika Pole Beans
    'Urja Monika Pole Beans Seeds': {
        'img2': ('imgi_4178_vokkal-seeds-french-beans-meghana-french-bean-seeds-1.png', 'urja_monika_beans_pods_480x600.webp'),
        'img3': ('imgi_3098_ande-yard-long-beans-file-5353.png', 'urja_monika_beans_harvest_480x600.webp')
    },
    # Urja Superball Cabbage
    'Urja Superball F1 Hybrid Cabbage Seeds': {
        'img2': ('imgi_3295_sungro-sunny-cabbage-file-10920.png', 'urja_superball_cabbage_head_480x600.webp'),
        'img3': ('imgi_3269_t-621-cabbage-f1-file-1738.png', 'urja_superball_cabbage_field_480x600.webp')
    },
    # Urja Imported DDR Beetroot
    'Urja Imported DDR Beetroot Seeds': {
        'img2': ('imgi_3587_farmson-fb-red-ball-beetroot-seeds-file-14149.png', 'urja_ddr_beetroot_produce_480x600.webp'),
        'img3': ('imgi_3649_urja-beetroot-ruby-queen-seeds-imported-file-14159.png', 'urja_ddr_beetroot_harvest_480x600.webp')
    },
    # Urja Red Cosmo Onion
    'Urja Red Cosmo Onion Seeds': {
        'img2': ('imgi_4571_gentex-bhima-shakti-onion-seeds-2.png', 'urja_red_cosmo_onion_bulbs_480x600.webp'),
        'img3': ('imgi_4572_gentex-bhima-shakti-onion-seeds-3.png', 'urja_red_cosmo_onion_sliced_480x600.webp')
    },
    # VNR 145 Chilli
    'VNR 145 F1 Hybrid Hot Pepper Chilli Seeds': {
        'img2': ('imgi_4020_sagar-jawa-f1-chilli-seeds-file-21048.png', 'vnr145_chilli_produce_480x600.webp'),
        'img3': ('imgi_3117_yashaswaini-chilli-file-2313.png', 'vnr145_chilli_harvest_480x600.webp')
    },
    # VNR 3348 Tomato
    'VNR 3348 F1 Hybrid Tomato Seeds': {
        'img2': ('imgi_3399_farmson-biotech-9350-f1-hybrid-tomato-seeds-big-round-and-red-file-12239.png', 'vnr3348_tomato_produce_480x600.webp'),
        'img3': ('imgi_3124_ns-4266-tomato-file-5319.png', 'vnr3348_tomato_vine_480x600.webp')
    },
    # VNR 22 Bitter Gourd
    'VNR 22 F1 Hybrid Bitter Gourd Seeds': {
        'img2': ('imgi_3708_vanita-bitter-gourd-green-gold-file-16279.png', 'vnr22_bitter_gourd_produce_480x600.webp'),
        'img3': ('imgi_3673_isp106-bitter-gourd-file-14742.png', 'vnr22_bitter_gourd_vine_480x600.webp')
    },
    # VNR 125 Brinjal
    'VNR 125 F1 Hybrid Brinjal Seeds': {
        'img2': ('imgi_4037_sagar-ravaya-f1-brinjal-seeds-file-20954.png', 'vnr125_brinjal_produce_480x600.webp'),
        'img3': ('imgi_3680_rudraksh-brinjal-f1-hera-file-15857.png', 'vnr125_brinjal_harvest_480x600.webp')
    },
    # Nunhems US 6001 Ridge Gourd
    'Nunhems US 6001 F1 Hybrid Ridge Gourd Seeds': {
        'img2': ('imgi_3432_ridge-gourd-fb-reva-file-10435.png', 'nunhems_us6001_ridge_gourd_produce_480x600.webp'),
        'img3': ('imgi_3382_ridge-gourd-fb-vindhya-file-10436.png', 'nunhems_us6001_ridge_gourd_trellis_480x600.webp')
    },
    # Nunhems Maxion Watermelon
    'Nunhems Maxion F1 Hybrid Watermelon Seeds': {
        'img2': ('imgi_4565_sagar-king-plus-f1-watermelon-2.png', 'nunhems_maxion_watermelon_angle2_480x600.webp'),
        'img3': ('imgi_4184_kwmh-1902-watermelon-seeds-1.png', 'nunhems_maxion_watermelon_produce_480x600.webp')
    },
    # Nunhems US 1315 Bitter Gourd
    'Nunhems US 1315 F1 Hybrid Bitter Gourd Seeds': {
        'img2': ('imgi_3708_vanita-bitter-gourd-green-gold-file-16279.png', 'nunhems_us1315_bitter_gourd_produce_480x600.webp'),
        'img3': ('imgi_4610_sagar-sneha-75-f1-bitter-gourd-file-17135.png', 'nunhems_us1315_bitter_gourd_harvest_480x600.webp')
    },
    # Vokkal Meghana French Beans
    'Vokkal Seeds Meghana French Beans Seeds': {
        'img2': ('imgi_4186_vokkal-seeds-beans-menaka-french-bean-seeds-1.png', 'vokkal_meghana_french_beans_angle2_480x600.webp'),
        'img3': ('imgi_3098_ande-yard-long-beans-file-5353.png', 'vokkal_meghana_french_beans_produce_480x600.webp')
    },
    # Vokkal Menaka French Beans
    'Vokkal Seeds Menaka French Beans Seeds': {
        'img2': ('imgi_4178_vokkal-seeds-french-beans-meghana-french-bean-seeds-1.png', 'vokkal_menaka_french_beans_angle2_480x600.webp'),
        'img3': ('imgi_4356_us-2-pole-beans-nz-file-2811.jpg', 'vokkal_menaka_french_beans_produce_480x600.webp')
    },
    # Mahyco Hari Rani Cabbage
    'Mahyco Hari Rani F1 Hybrid Cabbage Seeds': {
        'img2': ('imgi_3295_sungro-sunny-cabbage-file-10920.png', 'mahyco_hari_rani_cabbage_head_480x600.webp'),
        'img3': ('imgi_3269_t-621-cabbage-f1-file-1738.png', 'mahyco_hari_rani_cabbage_field_480x600.webp')
    },
    # Mahyco Mahy-9 Brinjal
    'Mahyco Mahy-9 F1 Hybrid Brinjal Seeds': {
        'img2': ('imgi_4037_sagar-ravaya-f1-brinjal-seeds-file-20954.png', 'mahyco_mahy9_brinjal_produce_480x600.webp'),
        'img3': ('imgi_3285_farmson-biotech-brinjal-seeds-fb-4070-file-10385.png', 'mahyco_mahy9_brinjal_harvest_480x600.webp')
    },
    # Sarpan Airavat Bhendi
    'Sarpan Airavat F1 Hybrid Bhendi Okra Seeds': {
        'img2': ('imgi_3579_sarpan-sok-160-f1-hybrid-bhendi-seeds-file-15004.png', 'sarpan_airavat_bhendi_angle2_480x600.webp'),
        'img3': ('imgi_4494_avantika-gold-bhendi-okra-file-4335.webp', 'sarpan_airavat_bhendi_produce_480x600.webp')
    },
    # Sarpan SO-22 Onion
    'Sarpan SO-22 High Yield Onion Seeds': {
        'img2': ('imgi_4571_gentex-bhima-shakti-onion-seeds-2.png', 'sarpan_so22_onion_bulbs_480x600.webp'),
        'img3': ('imgi_4572_gentex-bhima-shakti-onion-seeds-3.png', 'sarpan_so22_onion_sliced_480x600.webp')
    },
    # Advanta Jumbo Super Forage
    'Advanta Jumbo Super Multi-Cut Forage Grass Seeds': {
        'img2': ('imgi_4562_eureka-super-napier-grass-forage-seeds-2.png', 'advanta_jumbo_super_field_480x600.webp'),
        'img3': ('imgi_4563_eureka-super-napier-grass-forage-seeds-3.png', 'advanta_jumbo_super_harvest_480x600.webp')
    },
    # Iris IHS-786 Marigold
    'Iris IHS-786 F1 Hybrid Orange Marigold Seeds': {
        'img2': ('imgi_4588_iris-marigold-orange-ihs-786-1.png', 'iris_ihs786_marigold_angle1_480x600.webp'),
        'img3': ('imgi_4589_iris-marigold-orange-ihs-786-2.png', 'iris_ihs786_marigold_angle2_480x600.webp')
    },
    # Farmson FB Jalapeno 2020
    'Farmson FB Jalapeno 2020 Hot Pepper Seeds': {
        'img2': ('imgi_3404_farmson-biotech-red-capsicum-f1-hybrid-chilli-seeds-file-12234.png', 'farmson_jalapeno_produce_480x600.webp'),
        'img3': ('imgi_3385_farmson-biotech-yellow-capsicum-f1-hybrid-chilli-seeds-file-12235.png', 'farmson_jalapeno_harvest_480x600.webp')
    },
    # Farmson Royal Red Watermelon
    'Farmson Royal Red F1 Hybrid Watermelon Seeds': {
        'img2': ('imgi_4565_sagar-king-plus-f1-watermelon-2.png', 'farmson_royal_red_watermelon_angle2_480x600.webp'),
        'img3': ('imgi_3887_sagar-singham-f1-watermelon-1.png', 'farmson_royal_red_watermelon_produce_480x600.webp')
    },
    # Indo-US Cumin 99 Jeera
    'Indo-US Cumin 99 Research Jeera Seeds': {
        'img2': ('imgi_3961_indo-us-cumin-4-file-20687.jpg', 'indous_cumin99_grains_480x600.webp'),
        'img3': ('imgi_2376_indo-us-cumin-99-file-20690.png', 'indous_cumin99_crop_480x600.webp')
    },
    # Ashoka AFA-5 Coriander
    'Ashoka AFA-5 Multi-Cut Coriander Dhaniya Seeds': {
        'img2': ('imgi_3749_iris-imported-op-coriander-king-27-split-file-16514.jpg', 'ashoka_afa5_coriander_produce_480x600.webp'),
        'img3': ('imgi_3955_indo-us-coriander-999-file-20682.jpg', 'ashoka_afa5_coriander_field_480x600.webp')
    },
    # UPL Sugargraze Forage
    'UPL Advanta Sugargraze Sweet Sorghum Forage Seeds': {
        'img2': ('imgi_4562_eureka-super-napier-grass-forage-seeds-2.png', 'upl_sugargraze_field_480x600.webp'),
        'img3': ('imgi_4563_eureka-super-napier-grass-forage-seeds-3.png', 'upl_sugargraze_bundles_480x600.webp')
    },
    # East-West Naga Ridge Gourd
    'East-West Naga F1 Hybrid Ridge Gourd Seeds': {
        'img2': ('imgi_3432_ridge-gourd-fb-reva-file-10435.png', 'eastwest_naga_ridge_gourd_produce_480x600.webp'),
        'img3': ('imgi_3382_ridge-gourd-fb-vindhya-file-10436.png', 'eastwest_naga_ridge_gourd_trellis_480x600.webp')
    },
    # East-West Ulka Chilli
    'East-West Ulka F1 Hot Pepper Chilli Seeds': {
        'img2': ('imgi_4025_sagar-6405-f1-chilli-seeds-file-21054.png', 'eastwest_ulka_chilli_produce_480x600.webp'),
        'img3': ('imgi_3117_yashaswaini-chilli-file-2313.png', 'eastwest_ulka_chilli_harvest_480x600.webp')
    },
    # Known-You Red Lady 786 Papaya
    'Known-You Red Lady 786 Hybrid Papaya Seeds': {
        'img2': ('imgi_4569_iris-hybrid-fruit-seeds-papaya-red-lady-file-9286.jpg', 'knownyou_red_lady_papaya_halved_480x600.webp'),
        'img3': ('imgi_3520_urja-madhuri-papaya-seeds-file-14184.png', 'knownyou_red_lady_papaya_tree_480x600.webp')
    },
    # Seminis Apoorva Watermelon
    'Seminis Apoorva F1 Hybrid Watermelon Seeds': {
        'img2': ('imgi_4565_sagar-king-plus-f1-watermelon-2.png', 'seminis_apoorva_watermelon_angle2_480x600.webp'),
        'img3': ('imgi_4184_kwmh-1902-watermelon-seeds-1.png', 'seminis_apoorva_watermelon_produce_480x600.webp')
    },
    # Namdhari NS 1101 Chilli
    'Namdhari NS 1101 F1 Hybrid Chilli Seeds': {
        'img2': ('imgi_4020_sagar-jawa-f1-chilli-seeds-file-21048.png', 'namdhari_ns1101_chilli_produce_480x600.webp'),
        'img3': ('imgi_3117_yashaswaini-chilli-file-2313.png', 'namdhari_ns1101_chilli_harvest_480x600.webp')
    },
    # Syngenta Abhinav Tomato
    'Syngenta Abhinav F1 Hybrid Tomato Seeds': {
        'img2': ('imgi_3124_ns-4266-tomato-file-5319.png', 'syngenta_abhinav_tomato_vine_480x600.webp'),
        'img3': ('imgi_3427_fb-madhav-f1-tomato-seeds-round-red-file-9541.png', 'syngenta_abhinav_tomato_produce_480x600.webp')
    },
    # Semillas Fitó Leader Squash
    'Semillas Fitó Leader Hybrid Squash Seeds': {
        'img2': ('imgi_3741_iris-imported-op-squash-round-maan-file-16501.jpg', 'fito_leader_squash_produce_480x600.webp'),
        'img3': ('imgi_3155_squash-fito-1-file-101.webp', 'fito_leader_squash_field_480x600.webp')
    }
}

print(f"Applying multi-images (image2 and image3) to {len(MULTI_IMAGE_MAP)} seed products...")
updated = 0

for prod_name, images_info in MULTI_IMAGE_MAP.items():
    prod = Product.objects.filter(name=prod_name).first()
    if not prod:
        print(f"Product '{prod_name}' not found in DB.")
        continue
        
    src2, target2 = images_info['img2']
    src3, target3 = images_info['img3']
    
    img2_path = process_and_save(src2, target2)
    img3_path = process_and_save(src3, target3)
    
    if img2_path:
        prod.image2 = img2_path
    if img3_path:
        prod.image3 = img3_path
        
    prod.save()
    updated += 1
    print(f"  [UPDATED] {prod.name}: image2={prod.image2}, image3={prod.image3}")

print(f"\nCompleted! Updated {updated} products with multiple images (image, image2, image3).")
