import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import Brand

BRANDS_BY_CATEGORY = {
    'seeds': [
        'Syngenta',
        'Namdhari Seeds',
        'Seminis',
        'East-West Seed',
        'Indo-American Hybrid Seeds',
        'VNR Seeds',
        'Nunhems',
        'Sarpan Seeds',
        'UPL',
        'Mahyco',
        'Known-You Seed',
        'Urja Seeds',
        'Ashoka Seeds',
        'Advanta Seeds',
        'Iris Hybrid Seeds',
        'Sagar Biotech',
        'Vokkal Seeds',
        'Bejo Sheetal',
        'Farmson Biotech',
        'Semillas Fitó',
        'Sakata Seeds',
        'HyVeg',
        'Indo-US Biotech'
    ],
    'crop_protection': [
        'Bayer',
        'Syngenta',
        'BASF',
        'FMC',
        'Rallis',
        'Tapas',
        'Dhanuka',
        'Crystal Crop Protection',
        'UPL',
        'Corteva Agriscience',
        'Indofil Industries',
        'Sumitomo Chemical',
        'PI Industries',
        'Adama',
        'Barrix Agro Sciences',
        'IFFCO',
        'Aimco Pesticides',
        'BACF',
        'UAL (Utkarsh Agrochem)',
        'Kay Bee Bio-Organics',
        'Kan Biosys',
        'Essential Biosciences'
    ],
    'crop_nutrition': [
        'Multiplex Group',
        'Hifield-AG Chem',
        'Sea6 Energy',
        'Humate India',
        'Microbi Agrotech',
        'Geolife Agritech',
        'Tapas',
        'Otlas',
        'Vedagna',
        'Vijaya Agro Industries',
        'Amruth Organic',
        'Shamrock Overseas',
        'Anand Agro Care',
        'Vanproz Agrovet',
        'Agriplex',
        'T. Stanes & Company',
        'Rallis',
        'BioPrime AgriSolutions',
        'Infinite Biotech',
        'Bhumi Agro Industries',
        'Jaipur Bio Fertilizers',
        'Aimco Pesticides'
    ],
    'implements': [
        'Snap Export',
        'Niyo Farmtech',
        'Tapas',
        'Mitva',
        'Mipatex',
        'Sickle Innovations',
        'Tata Agrico',
        'Modish Tractoraurkisan (Balwaan)',
        'Balwaan Krishi',
        'KisanKraft',
        'Falcon Tools',
        'Honda Power',
        'Netafim',
        'Neptune Farming'
    ],
    'popular': [
        'Syngenta',
        'Bayer',
        'Excel Industries',
        'Janatha Agro Products',
        'Namdhari Seeds',
        'Geolife Agritech',
        'BASF',
        'Tapas',
        'Vijaya Agro Industries',
        'VNR Seeds',
        'Vanproz Agrovet',
        'Sarpan Seeds',
        'UAL (Utkarsh Agrochem)',
        'Kan Biosys',
        'Katyayani Organics'
    ]
}

# Aggregate all groups per brand
brand_group_map = {}
for category, brand_list in BRANDS_BY_CATEGORY.items():
    for name in brand_list:
        clean_name = name.strip()
        if clean_name not in brand_group_map:
            brand_group_map[clean_name] = set()
        brand_group_map[clean_name].add(category)

created_count = 0
updated_count = 0

for brand_name, groups in brand_group_map.items():
    group_str = ','.join(sorted(groups))
    # Check if brand already exists by exact name or similar
    existing = Brand.objects.filter(name__iexact=brand_name).first()
    if existing:
        current_groups = set(g.strip() for g in existing.category_group.split(',') if g.strip())
        merged = current_groups.union(groups)
        existing.category_group = ','.join(sorted(merged))
        existing.is_active = True
        existing.save()
        updated_count += 1
    else:
        Brand.objects.create(
            name=brand_name,
            category_group=group_str,
            is_active=True
        )
        created_count += 1

print(f"Total Unique Brands Processed: {len(brand_group_map)}")
print(f"Created New Brands: {created_count}")
print(f"Updated Existing Brands: {updated_count}")
print(f"Total Brands in DB Now: {Brand.objects.count()}")

# Summary count by category
for cat in ['seeds', 'crop_protection', 'crop_nutrition', 'implements', 'popular']:
    c = Brand.objects.filter(category_group__icontains=cat).count()
    print(f"  - {cat.upper()}: {c} brands")
