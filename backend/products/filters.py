from django_filters import rest_framework as filters
from .models import Product


class ProductFilter(filters.FilterSet):
    min_price = filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = filters.NumberFilter(field_name='price', lookup_expr='lte')
    category_type = filters.CharFilter(field_name='category__category_type')
    in_stock = filters.BooleanFilter(field_name='stock', method='filter_in_stock')
    min_rating = filters.NumberFilter(field_name='rating', lookup_expr='gte')
    free_delivery = filters.BooleanFilter(field_name='has_free_delivery')
    organic = filters.BooleanFilter(field_name='is_organic')
    brand = filters.NumberFilter(field_name='brand_id')
    category = filters.NumberFilter(field_name='category_id')
    seller = filters.NumberFilter(field_name='seller_id')
    district = filters.CharFilter(field_name='seller__district', lookup_expr='icontains')
    taluka = filters.CharFilter(field_name='seller__taluka', lookup_expr='icontains')

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset.filter(stock=0)

    class Meta:
        model = Product
        fields = ['min_price', 'max_price', 'category_type', 'in_stock', 'min_rating',
                  'free_delivery', 'organic', 'brand', 'category', 'seller', 'district', 'taluka']
