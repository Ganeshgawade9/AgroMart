from django.core.management.base import BaseCommand
from django.utils.text import slugify
from products.models import Category


SEED_CATEGORIES = [
    ('Urea & Nitrogen',         'fertilizer', '🌾'),
    ('DAP Fertilizers',         'fertilizer', '🌾'),
    ('NPK Fertilizers',         'fertilizer', '🌾'),
    ('Organic Fertilizers',     'organic',    '🌿'),
    ('Pesticides',              'pesticide',  '🐛'),
    ('Herbicides',              'herbicide',  '🌱'),
    ('Fungicides',              'fungicide',  '🍄'),
    ('Seeds',                   'seeds',      '🌰'),
    ('Agricultural Equipment',  'equipment',  '🚜'),
]


class Command(BaseCommand):
    help = 'Seed all required product categories into the database'

    def handle(self, *args, **options):
        created_count = 0
        for name, cat_type, icon in SEED_CATEGORIES:
            # Use a unique slug by combining name + type to avoid slug conflicts
            slug = slugify(name)
            # Ensure slug uniqueness
            base_slug = slug
            counter = 1
            while Category.objects.filter(slug=slug).exclude(category_type=cat_type).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1

            obj, created = Category.objects.get_or_create(
                name=name,
                category_type=cat_type,
                defaults={'slug': slug, 'icon': icon, 'is_active': True},
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {obj.name} [{obj.category_type}]'))
            else:
                self.stdout.write(f'  Already exists: {obj.name} [{obj.category_type}]')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {created_count} new categories created, '
            f'{len(SEED_CATEGORIES) - created_count} already existed.'
        ))
