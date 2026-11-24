import os
import sys
import json
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import HomeCategory, Crop

HOME_CATEGORIES = [
    {
        'slug': 'offers',
        'name': 'Offers',
        'title_key': 'cat.offers',
        'default_image': '/categories/offers.png',
        'bg_color': '#d1fae5',
        'link_url': '/products?min_discount=10',
        'order': 1,
    },
    {
        'slug': 'urban_gardening',
        'name': 'Urban Gardening',
        'title_key': 'cat.urban_gardening',
        'default_image': '/categories/urban_gardening.png',
        'bg_color': '#cffafe',
        'link_url': '/products?category_type=organic',
        'order': 2,
    },
    {
        'slug': 'sprayers',
        'name': 'Sprayers',
        'title_key': 'cat.sprayers',
        'default_image': '/categories/sprayers.png',
        'bg_color': '#fed7aa',
        'link_url': '/products?category_type=equipment&search=sprayer',
        'order': 3,
    },
    {
        'slug': 'insecticides',
        'name': 'Insecticides',
        'title_key': 'cat.insecticides',
        'default_image': '/categories/insecticides.png',
        'bg_color': '#ccfbf1',
        'link_url': '/products?category_type=pesticide',
        'order': 4,
    },
    {
        'slug': 'herbicides',
        'name': 'Herbicides',
        'title_key': 'cat.herbicides',
        'default_image': '/categories/herbicides.png',
        'bg_color': '#fef08a',
        'link_url': '/products?category_type=herbicide',
        'order': 5,
    },
    {
        'slug': 'nutrients',
        'name': 'Nutrients',
        'title_key': 'cat.nutrients',
        'default_image': '/categories/nutrients.png',
        'bg_color': '#fbcfe8',
        'link_url': '/products?category_type=fertilizer',
        'order': 6,
    },
    {
        'slug': 'fungicides',
        'name': 'Fungicides',
        'title_key': 'cat.fungicides',
        'default_image': '/categories/fungicides.png',
        'bg_color': '#bfdbfe',
        'link_url': '/products?category_type=fungicide',
        'order': 7,
    },
    {
        'slug': 'vegetable_seeds',
        'name': 'Vegetable & Fruit Seeds',
        'title_key': 'cat.vegetable_seeds',
        'default_image': '/categories/vegetable_seeds.png',
        'bg_color': '#dcfce7',
        'link_url': '/products?category_type=seeds',
        'order': 8,
    },
    {
        'slug': 'growth_promoters',
        'name': 'Growth Promoters',
        'title_key': 'cat.growth_promoters',
        'default_image': '/categories/growth_promoters.png',
        'bg_color': '#e9d5ff',
        'link_url': '/products?category_type=organic',
        'order': 9,
    },
    {
        'slug': 'farm_machinery',
        'name': 'Farm Machinery',
        'title_key': 'cat.farm_machinery',
        'default_image': '/categories/farm_machinery.png',
        'bg_color': '#ecfccb',
        'link_url': '/products?category_type=equipment',
        'order': 10,
    },
    {
        'slug': 'flower_seeds',
        'name': 'Flower Seeds',
        'title_key': 'cat.flower_seeds',
        'default_image': '/categories/flower_seeds.png',
        'bg_color': '#ffedd5',
        'link_url': '/products?category_type=seeds&search=flower',
        'order': 11,
    },
    {
        'slug': 'animal_husbandry',
        'name': 'Animal Husbandry',
        'title_key': 'cat.animal_husbandry',
        'default_image': '/categories/animal_husbandry.png',
        'bg_color': '#fef9c3',
        'link_url': '/products?category_type=equipment&search=cutter',
        'order': 12,
    },
]

FEATURED_CROP_SLUGS = [
    'green_chilli', 'paddy', 'tomato', 'brinjal', 'cotton', 'beans',
    'cauliflower', 'bitter_gourd', 'okra', 'onion', 'maize', 'watermelon',
    'cabbage', 'groundnut_peanut', 'soybean', 'sugarcane', 'wheat', 'turmeric'
]

crops_json_path = r'C:\Users\ganes\.gemini\antigravity-ide\brain\09d22570-b7ae-4fe8-b7ea-55041d68d923\scratch\crops.json'
with open(crops_json_path, 'r', encoding='utf-8') as f:
    CROPS = json.load(f)

def run():
    print("Seeding Home Categories...")
    for item in HOME_CATEGORIES:
        obj, created = HomeCategory.objects.update_or_create(
            slug=item['slug'],
            defaults={
                'name': item['name'],
                'title_key': item['title_key'],
                'default_image': item['default_image'],
                'bg_color': item['bg_color'],
                'link_url': item['link_url'],
                'order': item['order'],
                'is_active': True,
            }
        )
        print(f"  {'Created' if created else 'Updated'}: {obj.name} (order {obj.order})")

    print("\nSeeding Crops...")
    for i, c in enumerate(CROPS):
        slug = c['slug']
        name = c['name']
        search_query = name.split(' (')[0]
        if 'chilli' in name.lower():
            search_query = 'Chilli'
        elif 'gram' in name.lower() and 'chick' in name.lower():
            search_query = 'Gram'

        is_feat = slug in FEATURED_CROP_SLUGS
        obj, created = Crop.objects.update_or_create(
            slug=slug,
            defaults={
                'name': name,
                'search_query': search_query,
                'default_image': c['image'],
                'order': i + 1,
                'is_featured': is_feat,
                'is_active': True,
            }
        )
        print(f"  {'Created' if created else 'Updated'} Crop: {obj.name}")

    print("\nDone seeding Home Categories and Crops!")

if __name__ == '__main__':
    run()
