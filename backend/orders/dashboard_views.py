from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth, TruncWeek
from .models import Order
from products.models import Product

class SellerDashboardStatsView(APIView):
    """
    Returns comprehensive dashboard stats for a seller:
    Total products, Active products, Out of stock products,
    Total orders, Pending, Delivered, Cancelled,
    Total Revenue, Monthly Revenue, Total Customers.
    Also returns chart data: Monthly Sales, Weekly Orders, Categories, Top Products.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can access dashboard stats'}, status=403)
            
        user = request.user
        
        # Product Stats
        products = Product.objects.filter(seller=user)
        total_products = products.count()
        active_products = products.filter(is_active=True).count()
        out_of_stock = products.filter(stock=0).count()
        
        # Order Stats
        orders = Order.objects.filter(seller=user)
        total_orders = orders.count()
        pending_orders = orders.filter(status=Order.PENDING).count()
        delivered_orders = orders.filter(status=Order.DELIVERED)
        delivered_count = delivered_orders.count()
        cancelled_orders = orders.filter(status=Order.CANCELLED).count()
        
        # Revenue Stats
        total_revenue = delivered_orders.aggregate(total=Sum('total'))['total'] or 0
        
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        monthly_revenue = delivered_orders.filter(delivered_at__gte=thirty_days_ago).aggregate(total=Sum('total'))['total'] or 0
        
        # Customer Stats
        total_customers = orders.values('farmer').distinct().count()
        
        # --- Charts Data ---
        
        # 1. Monthly Sales (Revenue over the last 6 months)
        six_months_ago = now - timedelta(days=180)
        monthly_sales_qs = delivered_orders.filter(delivered_at__gte=six_months_ago)\
            .annotate(month=TruncMonth('delivered_at'))\
            .values('month')\
            .annotate(revenue=Sum('total'))\
            .order_by('month')
            
        monthly_sales = [
            {'name': item['month'].strftime('%b %Y'), 'revenue': float(item['revenue'])}
            for item in monthly_sales_qs
        ]
        
        # 2. Weekly Orders (Order count over the last 8 weeks)
        eight_weeks_ago = now - timedelta(weeks=8)
        weekly_orders_qs = orders.filter(created_at__gte=eight_weeks_ago)\
            .annotate(week=TruncWeek('created_at'))\
            .values('week')\
            .annotate(count=Count('id'))\
            .order_by('week')
            
        weekly_orders = [
            {'name': item['week'].strftime('%d %b'), 'orders': item['count']}
            for item in weekly_orders_qs
        ]
        
        # 3. Product Categories (Count of products per category)
        categories_qs = products.values('category__name')\
            .annotate(value=Count('id'))\
            .order_by('-value')
            
        product_categories = [
            {'name': item['category__name'] or 'Uncategorized', 'value': item['value']}
            for item in categories_qs if item['value'] > 0
        ]
        
        # 4. Top Selling Products (By quantity sold)
        from .models import OrderItem
        top_products_qs = OrderItem.objects.filter(order__seller=user, order__status=Order.DELIVERED)\
            .values('product_name')\
            .annotate(sold=Sum('quantity'))\
            .order_by('-sold')[:5]
            
        top_products = [
            {'name': item['product_name'], 'sold': item['sold']}
            for item in top_products_qs
        ]
        
        return Response({
            'stats': {
                'total_products': total_products,
                'active_products': active_products,
                'out_of_stock': out_of_stock,
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'delivered_orders': delivered_count,
                'cancelled_orders': cancelled_orders,
                'total_revenue': float(total_revenue),
                'monthly_revenue': float(monthly_revenue),
                'total_customers': total_customers,
            },
            'charts': {
                'monthly_sales': monthly_sales,
                'weekly_orders': weekly_orders,
                'product_categories': product_categories,
                'top_products': top_products,
            }
        })
