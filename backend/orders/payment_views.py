"""
Payment views for the AgriMart payment system.
Handles payment initiation, status polling, verification, and seller analytics.
Delegates gateway integration logic to PaymentService.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum, Count, Q, Avg
from django.db.models.functions import TruncDate
from datetime import timedelta
import uuid
import random

from .models import Order, OrderItem, Invoice
from .payment_models import Payment
from .payment_service import PaymentService
from products.models import Product, Cart
from notifications.utils import send_notification

User = get_user_model()


class InitiatePaymentView(APIView):
    """
    Initiate a payment for checkout.
    Validates inventory stock and seller method permissions.
    - COD: Creates order immediately, payment status = pending.
    - Online/UPI Gateways: Creates Payment record, returns gateway checkout details.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'farmer':
            return Response({'error': 'Only farmers can make payments'}, status=403)

        data = request.data
        items_data = data.get('items', [])
        if not items_data:
            return Response({'error': 'No items in order'}, status=400)

        payment_method = data.get('payment_method', 'cod')
        delivery_address = data.get('delivery_address', '')
        delivery_phone = data.get('delivery_phone', '')

        if not delivery_address or not delivery_phone:
            return Response({'error': 'Delivery address and phone are required'}, status=400)

        # Validate products and calculate totals by seller
        products_by_seller = {}
        for item in items_data:
            try:
                product = Product.objects.get(id=item['product_id'], is_active=True)
                if product.stock < item['quantity']:
                    return Response({'error': f'{product.name} has insufficient stock'}, status=400)
                seller_id = product.seller_id
                if seller_id not in products_by_seller:
                    products_by_seller[seller_id] = []
                products_by_seller[seller_id].append({
                    'product_id': product.id,
                    'quantity': item['quantity'],
                    'price': float(product.price),
                    'name': product.name,
                })
            except Product.DoesNotExist:
                return Response({'error': f'Product {item["product_id"]} not found'}, status=404)

        results = []

        for seller_id, items in products_by_seller.items():
            seller = User.objects.get(id=seller_id)
            subtotal = sum(i['price'] * i['quantity'] for i in items)
            gst = subtotal * 0.05
            delivery_charge = 0 if subtotal > 500 else 50
            total = round(subtotal + gst + delivery_charge, 2)

            checkout_data = {
                'items': items,
                'delivery_address': delivery_address,
                'delivery_village': data.get('delivery_village', ''),
                'delivery_taluka': data.get('delivery_taluka', ''),
                'delivery_district': data.get('delivery_district', ''),
                'delivery_pincode': data.get('delivery_pincode', ''),
                'delivery_phone': delivery_phone,
                'notes': data.get('notes', ''),
                'subtotal': float(subtotal),
                'gst': float(gst),
                'delivery_charge': float(delivery_charge),
                'total': float(total),
            }

            # Enforce seller configuration settings
            seller_profile = getattr(seller, 'seller_profile', None)
            if payment_method == 'cod' and (not seller_profile or not seller_profile.cod_enabled):
                return Response({'error': f'Seller does not support Cash on Delivery'}, status=400)
            if payment_method == 'upi' and (not seller_profile or not seller_profile.upi_enabled):
                return Response({'error': f'Seller does not support UPI QR Code payments'}, status=400)
            if payment_method in ['razorpay', 'phonepe', 'cashfree', 'stripe']:
                has_legacy_toggles = (payment_method == 'razorpay' and seller_profile and seller_profile.razorpay_enabled)
                has_online_payments = (seller_profile and seller_profile.online_payments_enabled)
                if not (has_legacy_toggles or has_online_payments):
                    return Response({'error': f'Seller does not support Online Gateway payments'}, status=400)

            if payment_method == 'cod':
                # COD: Create order immediately
                order = self._create_order(
                    request.user, seller, checkout_data, 'cod', 'pending'
                )
                payment = Payment.objects.create(
                    order=order,
                    seller=seller,
                    farmer=request.user,
                    amount=total,
                    payment_method='cod',
                    gateway='manual',
                    status=Payment.PENDING,
                    checkout_data=checkout_data,
                )
                results.append({
                    'payment_id': payment.payment_id,
                    'order_number': order.order_number,
                    'order_id': order.id,
                    'status': 'confirmed',
                    'payment_method': 'cod',
                })
            else:
                # Online / UPI Gateway payment: dispatch via PaymentService
                service = PaymentService()
                payment, gateway_data = service.initiate_payment(
                    payment_method=payment_method,
                    seller=seller,
                    farmer=request.user,
                    amount=total,
                    checkout_data=checkout_data,
                    request=request
                )

                results.append({
                    'payment_id': payment.payment_id,
                    'status': 'awaiting_payment',
                    'payment_method': payment_method,
                    f'{payment_method}_data': gateway_data
                })

        # Clear cart for COD orders immediately
        if payment_method == 'cod':
            Cart.objects.filter(user=request.user).delete()

        return Response({
            'message': 'Payment initiated' if payment_method != 'cod' else 'Order placed successfully',
            'payments': results,
        }, status=201)

    def _create_order(self, farmer, seller, checkout_data, payment_method, payment_status):
        """Create an Order from checkout data."""
        order = Order.objects.create(
            farmer=farmer,
            seller=seller,
            status=Order.PENDING,
            payment_method=payment_method,
            payment_status=payment_status,
            subtotal=checkout_data['subtotal'],
            gst_amount=checkout_data['gst'],
            delivery_charge=checkout_data['delivery_charge'],
            total=checkout_data['total'],
            delivery_address=checkout_data['delivery_address'],
            delivery_village=checkout_data.get('delivery_village', ''),
            delivery_taluka=checkout_data.get('delivery_taluka', ''),
            delivery_district=checkout_data.get('delivery_district', ''),
            delivery_pincode=checkout_data.get('delivery_pincode', ''),
            delivery_phone=checkout_data['delivery_phone'],
            delivery_otp=str(random.randint(100000, 999999)),
            notes=checkout_data.get('notes', ''),
        )

        for item_data in checkout_data['items']:
            product = Product.objects.get(id=item_data['product_id'])
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item_data['quantity'],
            )
            product.stock -= item_data['quantity']
            product.save(update_fields=['stock'])

        # Notify seller
        send_notification(
            seller, 'new_order',
            f'New order #{order.order_number} received!',
            order.id
        )

        return order


class PaymentStatusView(APIView):
    """
    Poll payment status.
    Delegates validation and simulation/timeouts to PaymentService.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, payment_id):
        try:
            payment = Payment.objects.get(
                payment_id=payment_id,
                farmer=request.user,
            )
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found'}, status=404)

        # Run service layer check (handles progression, timeouts, and successful confirm tasks)
        service = PaymentService()
        service.check_payment_status(payment)

        response_data = {
            'payment_id': payment.payment_id,
            'status': payment.status,
            'payment_method': payment.payment_method,
            'amount': float(payment.amount),
            'created_at': payment.created_at.isoformat(),
        }

        if payment.status == Payment.PAID:
            response_data.update({
                'transaction_id': payment.transaction_id,
                'reference_number': payment.reference_number,
                'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
                'order_id': payment.order.id if payment.order else None,
                'order_number': payment.order.order_number if payment.order else None,
            })

        if payment.status in (Payment.FAILED, Payment.EXPIRED):
            response_data['error_message'] = payment.failure_reason or payment.metadata.get(
                'error_message', 'Payment failed or timed out. Please try again.'
            )

        return Response(response_data)


class PaymentVerifyView(APIView):
    """
    Gateway Callback and signature verification verification endpoint.
    Invokes PaymentService to verify signature HMAC and finalize details.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, payment_id):
        try:
            payment = Payment.objects.get(
                payment_id=payment_id,
                farmer=request.user,
            )
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found'}, status=404)

        if payment.status == Payment.PAID:
            return Response({
                'message': 'Payment already verified',
                'payment_id': payment.payment_id,
                'order_id': payment.order.id if payment.order else None,
                'order_number': payment.order.order_number if payment.order else None,
            })

        if payment.status == Payment.FAILED:
            return Response({'error': 'Payment failed. Please create a new payment session.'}, status=400)

        # Run verification through modular service layer
        service = PaymentService()
        success, order = service.verify_payment(payment, request.data)

        if success:
            return Response({
                'message': 'Payment verified successfully',
                'payment_id': payment.payment_id,
                'transaction_id': payment.transaction_id,
                'reference_number': payment.reference_number,
                'order_id': order.id if order else None,
                'order_number': order.order_number if order else None,
            })
        else:
            return Response({
                'error': payment.failure_reason or 'Payment verification failed'
            }, status=400)


class SellerPaymentSettingsView(APIView):
    """Get/update seller payment configuration settings."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can access payment settings'}, status=403)
        profile = self._get_profile(request.user)
        return Response({
            'shop_name': profile.shop_name,
            'shop_logo': request.build_absolute_uri(profile.shop_logo.url) if profile.shop_logo else None,
            'merchant_display_name': profile.merchant_display_name,
            'upi_id': profile.upi_id,
            'payment_phone': profile.payment_phone,
            'bank_account_name': profile.bank_account_name,
            'bank_account': profile.bank_account,
            'ifsc_code': profile.ifsc_code,
            'cod_enabled': profile.cod_enabled,
            'upi_enabled': profile.upi_enabled,
            'razorpay_enabled': profile.razorpay_enabled,
            
            # Online Payments credentials
            'online_payments_enabled': profile.online_payments_enabled,
            'razorpay_key_id': profile.razorpay_key_id,
            'razorpay_secret': profile.razorpay_secret,
            'phonepe_merchant_id': profile.phonepe_merchant_id,
            'cashfree_key_id': profile.cashfree_key_id,
            'cashfree_secret': profile.cashfree_secret,
        })

    def patch(self, request):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can update payment settings'}, status=403)
        profile = self._get_profile(request.user)

        allowed_fields = [
            'merchant_display_name', 'upi_id', 'payment_phone',
            'bank_account_name', 'bank_account', 'ifsc_code',
            'cod_enabled', 'upi_enabled', 'razorpay_enabled',
            
            # Online credentials Fields
            'online_payments_enabled', 'razorpay_key_id', 'razorpay_secret',
            'phonepe_merchant_id', 'cashfree_key_id', 'cashfree_secret'
        ]

        update_fields = []
        for field in allowed_fields:
            if field in request.data:
                setattr(profile, field, request.data[field])
                update_fields.append(field)

        if update_fields:
            profile.save(update_fields=update_fields)

        return Response({'message': 'Payment settings updated successfully'})

    def _get_profile(self, user):
        from accounts.models import SellerProfile
        try:
            return user.seller_profile
        except SellerProfile.DoesNotExist:
            return SellerProfile.objects.create(
                user=user, shop_name=user.full_name
            )


class PaymentAnalyticsView(APIView):
    """Seller payment analytics dashboard dataset."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can access payment analytics'}, status=403)

        payments = Payment.objects.filter(seller=request.user)
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timedelta(days=30)

        # Revenue stats
        today_revenue = payments.filter(
            status=Payment.PAID,
            paid_at__gte=today_start,
        ).aggregate(total=Sum('amount'))['total'] or 0

        monthly_revenue = payments.filter(
            status=Payment.PAID,
            paid_at__gte=thirty_days_ago,
        ).aggregate(total=Sum('amount'))['total'] or 0

        total_revenue = payments.filter(
            status=Payment.PAID,
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Average Order Value (AOV)
        average_order_value = payments.filter(
            status=Payment.PAID
        ).aggregate(avg=Avg('amount'))['avg'] or 0

        # Payment counts
        pending_count = payments.filter(
            status__in=[Payment.CREATED, Payment.PENDING, Payment.PROCESSING]
        ).count()
        completed_count = payments.filter(status=Payment.PAID).count()
        failed_count = payments.filter(status=Payment.FAILED).count()
        total_orders = Order.objects.filter(seller=request.user).count()

        # Payment method distribution
        method_dist = payments.filter(status=Payment.PAID).values(
            'payment_method'
        ).annotate(count=Count('id'), total=Sum('amount')).order_by('-count')

        method_labels = {
            'cod': 'Cash on Delivery', 
            'upi': 'UPI QR Code', 
            'razorpay': 'Razorpay',
            'phonepe': 'PhonePe Gateway',
            'cashfree': 'Cashfree Gateway',
            'stripe': 'Stripe'
        }
        payment_methods = [
            {
                'name': method_labels.get(m['payment_method'], m['payment_method'].upper()),
                'value': m['count'],
                'revenue': float(m['total'] or 0),
            }
            for m in method_dist
        ]

        # Daily revenue chart (last 30 days)
        daily_revenue = payments.filter(
            status=Payment.PAID,
            paid_at__gte=thirty_days_ago,
        ).annotate(
            date=TruncDate('paid_at')
        ).values('date').annotate(
            revenue=Sum('amount')
        ).order_by('date')

        revenue_chart = [
            {
                'name': d['date'].strftime('%d %b'),
                'revenue': float(d['revenue']),
            }
            for d in daily_revenue
        ]

        # Recent transactions
        recent = payments.order_by('-created_at')[:15]
        recent_transactions = [
            {
                'payment_id': p.payment_id,
                'transaction_id': p.transaction_id,
                'amount': float(p.amount),
                'payment_method': method_labels.get(p.payment_method, p.payment_method.upper()),
                'status': p.status,
                'created_at': p.created_at.isoformat(),
                'paid_at': p.paid_at.isoformat() if p.paid_at else None,
                'order_number': p.order.order_number if p.order else None,
            }
            for p in recent
        ]

        return Response({
            'today_revenue': float(today_revenue),
            'monthly_revenue': float(monthly_revenue),
            'total_revenue': float(total_revenue),
            'average_order_value': float(average_order_value),
            'pending_payments': pending_count,
            'completed_payments': completed_count,
            'failed_payments': failed_count,
            'total_orders': total_orders,
            'payment_methods': payment_methods,
            'revenue_chart': revenue_chart,
            'recent_transactions': recent_transactions,
        })
