from datetime import timedelta

from django.db.models import DecimalField, ExpressionWrapper, F
from django.utils import timezone
from django_filters import rest_framework as filters

from .models import Product


class CharInFilter(filters.BaseInFilter, filters.CharFilter):
    """?field=a,b,c  ->  field IN (a, b, c)"""


class NumberInFilter(filters.BaseInFilter, filters.NumberFilter):
    """?field=1,2,3  ->  field IN (1, 2, 3)"""


class ProductFilter(filters.FilterSet):
    # Price
    min_price = filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = filters.NumberFilter(field_name='price', lookup_expr='lte')

    # Multi-select facets (comma separated; a single value still works)
    category_type = CharInFilter(field_name='category__category_type', lookup_expr='in')
    brand = NumberInFilter(field_name='brand_id', lookup_expr='in')
    unit = CharInFilter(field_name='unit', lookup_expr='in')
    district = CharInFilter(field_name='seller__district', lookup_expr='in')

    category = filters.NumberFilter(field_name='category_id')
    seller = filters.NumberFilter(field_name='seller_id')
    taluka = filters.CharFilter(field_name='seller__taluka', lookup_expr='icontains')

    # Customer rating: 4 -> 4 stars & above
    min_rating = filters.NumberFilter(field_name='rating', lookup_expr='gte')

    # Discount: 20 -> 20% off or more (computed from MRP and selling price)
    min_discount = filters.NumberFilter(method='filter_min_discount')
    # Offers: only products selling below MRP
    offers = filters.BooleanFilter(method='filter_offers')

    # Availability / delivery / type
    in_stock = filters.BooleanFilter(field_name='stock', method='filter_in_stock')
    free_delivery = filters.BooleanFilter(field_name='has_free_delivery')
    organic = filters.BooleanFilter(field_name='is_organic')

    # New arrivals: listed within the last N days
    new_arrivals = filters.NumberFilter(method='filter_new_arrivals')

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset.filter(stock=0)

    def filter_min_discount(self, queryset, name, value):
        if value is None or value <= 0:
            return queryset
        discount = ExpressionWrapper(
            (F('mrp') - F('price')) * 100 / F('mrp'),
            output_field=DecimalField(max_digits=7, decimal_places=2),
        )
        return queryset.filter(mrp__gt=0).annotate(_discount_pct=discount).filter(_discount_pct__gte=value)

    def filter_offers(self, queryset, name, value):
        if value:
            return queryset.filter(mrp__gt=F('price'))
        return queryset

    def filter_new_arrivals(self, queryset, name, value):
        if value is None or value <= 0:
            return queryset
        return queryset.filter(created_at__gte=timezone.now() - timedelta(days=int(value)))

    class Meta:
        model = Product
        fields = ['min_price', 'max_price', 'category_type', 'in_stock', 'min_rating',
                  'free_delivery', 'organic', 'brand', 'category', 'seller', 'district',
                  'taluka', 'unit', 'min_discount', 'offers', 'new_arrivals']
