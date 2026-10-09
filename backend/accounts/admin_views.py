from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from orders.models import Order
from products.models import Product

User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_staff or request.user.role == 'admin')


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_farmers = User.objects.filter(role='farmer').count()
        total_sellers = User.objects.filter(role='seller').count()
        pending_sellers = User.objects.filter(role='seller', is_approved=False).count()
        total_products = Product.objects.filter(is_active=True).count()
        total_orders = Order.objects.count()
        delivered = Order.objects.filter(status='delivered').count()
        pending_orders = Order.objects.filter(status='pending').count()
        total_revenue = Order.objects.filter(status='delivered').aggregate(total=Sum('total'))['total'] or 0
        recent_orders = Order.objects.order_by('-created_at').select_related('farmer', 'seller')[:10]

        return Response({
            'farmers': total_farmers,
            'sellers': total_sellers,
            'pending_sellers': pending_sellers,
            'products': total_products,
            'total_orders': total_orders,
            'delivered_orders': delivered,
            'pending_orders': pending_orders,
            'total_revenue': float(total_revenue),
            'recent_orders': [
                {
                    'id': o.id,
                    'order_number': o.order_number,
                    'farmer': o.farmer.full_name,
                    'seller': o.seller.seller_profile.shop_name if hasattr(o.seller, 'seller_profile') else o.seller.full_name,
                    'total': float(o.total),
                    'status': o.status,
                    'created_at': o.created_at.isoformat(),
                }
                for o in recent_orders
            ]
        })


class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        role = request.query_params.get('role', '')
        qs = User.objects.all()
        if role:
            qs = qs.filter(role=role)
        search = request.query_params.get('search', '')
        if search:
            qs = qs.filter(full_name__icontains=search) | qs.filter(email__icontains=search)

        users = qs.order_by('-created_at')[:100]
        return Response([{
            'id': u.id, 'full_name': u.full_name, 'email': u.email,
            'phone': u.phone, 'role': u.role, 'is_approved': u.is_approved,
            'is_active': u.is_active, 'village': u.village, 'district': u.district,
            'created_at': u.created_at.isoformat(),
            'shop_name': u.seller_profile.shop_name if hasattr(u, 'seller_profile') else None,
        } for u in users])


class AdminToggleUserView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, user_id):
        action = request.data.get('action')
        try:
            user = User.objects.get(id=user_id)
            if action == 'approve':
                user.is_approved = True
                user.save()
                msg = f'{user.full_name} approved'
            elif action == 'deactivate':
                user.is_active = False
                user.save()
                msg = f'{user.full_name} deactivated'
            elif action == 'activate':
                user.is_active = True
                user.save()
                msg = f'{user.full_name} activated'
            else:
                return Response({'error': 'Invalid action'}, status=400)
            return Response({'message': msg})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)


class AdminProductListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk=None):
        if pk is not None:
            try:
                p = Product.objects.get(id=pk)
                return Response({
                    'id': p.id, 'name': p.name, 'price': float(p.price),
                    'stock': p.stock, 'is_active': p.is_active, 'rating': float(p.rating),
                    'seller': p.seller.seller_profile.shop_name if hasattr(p.seller, 'seller_profile') else p.seller.full_name,
                    'category': p.category.name if p.category else '',
                    'created_at': p.created_at.isoformat(),
                })
            except Product.DoesNotExist:
                return Response({'error': 'Not found'}, status=404)

        products = Product.objects.all().select_related('seller', 'seller__seller_profile', 'category')[:200]
        return Response([{
            'id': p.id, 'name': p.name, 'price': float(p.price),
            'stock': p.stock, 'is_active': p.is_active, 'rating': float(p.rating),
            'seller': p.seller.seller_profile.shop_name if hasattr(p.seller, 'seller_profile') else p.seller.full_name,
            'category': p.category.name if p.category else '',
            'created_at': p.created_at.isoformat(),
        } for p in products])

    def patch(self, request, pk=None):
        product_id = pk or request.data.get('id') or request.data.get('product_id')
        if not product_id:
            return Response({'error': 'Product ID is required'}, status=400)
        try:
            product = Product.objects.get(id=product_id)
            product.is_active = request.data.get('is_active', product.is_active)
            product.save()
            return Response({'message': 'Product updated'})
        except Product.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
