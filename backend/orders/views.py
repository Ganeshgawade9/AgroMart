from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
import random
from .models import Order, OrderItem, Invoice
from .serializers import OrderCreateSerializer, OrderListSerializer, OrderDetailSerializer, DeliveryOrderSerializer
from . import dispatch
from . import otp as otp_service
from .stock import restore_stock
from products.models import Product, Cart
from notifications.utils import send_notification

User = get_user_model()


def generate_order_invoice(order):
    """Helper to generate and save ReportLab invoice PDF dynamically on payment completion/delivery."""
    from django.core.files.base import ContentFile
    from .invoice import generate_invoice_pdf
    if not Invoice.objects.filter(order=order).exists():
        invoice_number = f"INV-{timezone.now().year}-{order.id:04d}"
        invoice = Invoice.objects.create(
            order=order,
            invoice_number=invoice_number
        )
        try:
            pdf_data = generate_invoice_pdf(order)
            invoice.pdf_file.save(f"invoice_{order.order_number}.pdf", ContentFile(pdf_data), save=True)
        except Exception as e:
            print(f"Error generating invoice PDF: {e}")
        
        send_notification(
            order.farmer, 'payment',
            f'Invoice {invoice_number} has been generated for your order #{order.order_number}.',
            order.id
        )



class PlaceOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        items_data = data['items']
        if not items_data:
            return Response({'error': 'No items in order'}, status=400)

        # Validate all products and group by seller
        products_by_seller = {}
        for item in items_data:
            try:
                product = Product.objects.get(id=item['product_id'], is_active=True)
                if product.stock < item['quantity']:
                    return Response({'error': f'{product.name} has insufficient stock'}, status=400)
                seller_id = product.seller_id
                if seller_id not in products_by_seller:
                    products_by_seller[seller_id] = []
                products_by_seller[seller_id].append({'product': product, 'quantity': item['quantity']})
            except Product.DoesNotExist:
                return Response({'error': f'Product {item["product_id"]} not found'}, status=404)

        orders_created = []
        for seller_id, items in products_by_seller.items():
            seller = User.objects.get(id=seller_id)
            subtotal = sum(float(i['product'].price) * i['quantity'] for i in items)
            gst = subtotal * 0.05
            delivery_charge = 0 if subtotal > 500 else 50
            total = subtotal + gst + delivery_charge

            order = Order.objects.create(
                farmer=request.user,
                seller=seller,
                status=Order.PENDING,
                payment_method=data['payment_method'],
                subtotal=subtotal,
                gst_amount=gst,
                delivery_charge=delivery_charge,
                total=total,
                delivery_address=data['delivery_address'],
                delivery_village=data.get('delivery_village', ''),
                delivery_taluka=data.get('delivery_taluka', ''),
                delivery_district=data.get('delivery_district', ''),
                delivery_pincode=data.get('delivery_pincode', ''),
                delivery_phone=data['delivery_phone'],
                delivery_latitude=data.get('delivery_latitude'),
                delivery_longitude=data.get('delivery_longitude'),
                delivery_otp=str(random.randint(100000, 999999)),
                notes=data.get('notes', ''),
            )

            for item in items:
                OrderItem.objects.create(order=order, product=item['product'], quantity=item['quantity'])
                item['product'].stock -= item['quantity']
                item['product'].save(update_fields=['stock'])

            # Notify seller
            send_notification(seller, 'new_order', f'New order #{order.order_number} received!', order.id)
            orders_created.append(order.order_number)

        # Clear cart
        Cart.objects.filter(user=request.user).delete()

        return Response({
            'message': 'Order placed successfully',
            'orders': orders_created,
        }, status=status.HTTP_201_CREATED)


class FarmerOrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(farmer=self.request.user)


class SellerOrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status')
        qs = Order.objects.filter(seller=self.request.user)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'farmer':
            return Order.objects.filter(farmer=user)
        elif user.role == 'seller':
            return Order.objects.filter(seller=user)
        elif user.role == 'delivery':
            return Order.objects.filter(delivery_partner=user)
        return Order.objects.none()


class UpdateOrderStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        try:
            if request.user.role == 'seller':
                order = Order.objects.get(id=order_id, seller=request.user)
            elif request.user.role == 'delivery':
                order = Order.objects.get(id=order_id, delivery_partner=request.user)
            else:
                return Response({'error': 'Not authorized'}, status=403)

            new_status = request.data.get('status')
            valid_transitions = {
                Order.PENDING: [Order.ACCEPTED, Order.CANCELLED],
                Order.ACCEPTED: [Order.PACKED],
                Order.PACKED: [Order.OUT_FOR_DELIVERY],
                Order.OUT_FOR_DELIVERY: [Order.DELIVERED],
            }

            if new_status not in valid_transitions.get(order.status, []):
                return Response({'error': f'Cannot transition from {order.status} to {new_status}'}, status=400)

            if new_status == Order.OUT_FOR_DELIVERY and order.delivery_partner_id:
                # Handing the order to a rider needs the pickup OTP, which only the rider enters
                return Response({'error': 'The delivery partner must confirm pickup with the pickup OTP.'}, status=400)

            order.status = new_status
            if new_status == Order.DELIVERED:
                ok, error = otp_service.check_otp(order, otp_service.DELIVERY, request.data.get('otp'))
                if not ok:
                    return Response({'error': error}, status=400)
                order.delivered_at = timezone.now()
                order.payment_status = 'paid' if order.payment_method == Order.COD else order.payment_status

            if new_status == Order.ACCEPTED:
                try:
                    prep = int(request.data.get('prep_minutes', order.estimated_prep_minutes))
                    order.estimated_prep_minutes = min(max(prep, 5), 240)
                except (TypeError, ValueError):
                    pass

            order.save()
            send_notification(order.farmer, 'order_update', f'Your order #{order.order_number} is now {order.get_status_display()}', order.id)

            # Delivery dispatch: find a rider while the shop prepares the order
            if new_status == Order.ACCEPTED:
                dispatch.start_dispatch(order)
            elif new_status == Order.PACKED:
                # OTP the rider must quote when collecting the order (SMS to the seller)
                otp_service.send_otp(order, otp_service.PICKUP, regenerate=True)
                if order.delivery_partner_id:
                    send_notification(order.delivery_partner, 'order_update',
                                      f'Order #{order.order_number} is packed and ready for pickup.', order.id)
                else:
                    dispatch.retry_unassigned(order)
            elif new_status == Order.OUT_FOR_DELIVERY:
                # Seller delivering without a rider: farmer still gets the delivery OTP
                otp_service.send_otp(order, otp_service.DELIVERY)
            elif new_status == Order.CANCELLED:
                dispatch.cancel_open_offers(order)
                # The order reserved stock when it was placed; give it back
                restore_stock(order)
            return Response({'message': f'Order status updated to {new_status}'})

        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)


class RazorpayCreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            import razorpay
            from django.conf import settings
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            amount = int(float(request.data.get('amount', 0)) * 100)  # paisa
            rz_order = client.order.create({'amount': amount, 'currency': 'INR', 'payment_capture': 1})
            return Response({'order_id': rz_order['id'], 'key': settings.RAZORPAY_KEY_ID})
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class DeliveryOrderListView(generics.ListAPIView):
    """Orders assigned to delivery partner."""
    serializer_class = DeliveryOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != 'delivery':
            return Order.objects.none()
        return (Order.objects.filter(delivery_partner=self.request.user)
                .select_related('farmer', 'seller', 'seller__seller_profile')
                .prefetch_related('items'))


class DeliveryUpdateStatusView(APIView):
    """Delivery partner marks order as delivered with OTP."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        if request.user.role != 'delivery':
            return Response({'error': 'Not authorized'}, status=403)
        try:
            order = Order.objects.get(id=order_id, delivery_partner=request.user, status=Order.OUT_FOR_DELIVERY)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found or not assigned to you'}, status=404)

        ok, error = otp_service.check_otp(order, otp_service.DELIVERY, request.data.get('otp'))
        if not ok:
            return Response({'error': error}, status=400)

        from django.utils import timezone
        order.status = Order.DELIVERED
        order.delivered_at = timezone.now()
        order.payment_status = 'paid'
        order.save()
        from notifications.utils import send_notification
        send_notification(order.farmer, 'order_update', f'Your order #{order.order_number} has been delivered!', order.id)
        send_notification(order.seller, 'order_update', f'Order #{order.order_number} delivered successfully.', order.id)
        return Response({'message': 'Order marked as delivered!'})


class AssignDeliveryView(APIView):
    """Seller assigns delivery partner to packed order."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        if request.user.role != 'seller':
            return Response({'error': 'Not authorized'}, status=403)
        delivery_partner_id = request.data.get('delivery_partner_id')
        try:
            order = Order.objects.get(id=order_id, seller=request.user, status=Order.PACKED)
            delivery_partner = User.objects.get(id=delivery_partner_id, role='delivery', is_active=True)
            dispatch.cancel_open_offers(order)
            order.delivery_partner = delivery_partner
            order.rider_assigned_at = timezone.now()
            order.save()
            if not order.pickup_otp:
                otp_service.send_otp(order, otp_service.PICKUP)
            send_notification = __import__('notifications.utils', fromlist=['send_notification']).send_notification
            send_notification(delivery_partner, 'new_order', f'New delivery assigned: Order #{order.order_number}', order.id)
            return Response({'message': f'Order assigned to {delivery_partner.full_name}. They must enter the pickup OTP to collect it.'})
        except (Order.DoesNotExist, User.DoesNotExist) as e:
            return Response({'error': str(e)}, status=404)
