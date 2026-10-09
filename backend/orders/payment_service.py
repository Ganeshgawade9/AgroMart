import uuid
import random
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from .payment_models import Payment

class BasePaymentGateway:
    """
    Interface for payment gateway integrations.
    Supports both real integrations and sandbox simulations.
    """
    def create_payment(self, payment, seller, farmer, amount, checkout_data, request=None):
        raise NotImplementedError

    def verify_payment(self, payment, data):
        raise NotImplementedError

    def check_status(self, payment):
        raise NotImplementedError


class UPIQRGateway(BasePaymentGateway):
    """
    UPI QR Code payment integration.
    Generates dynamic payment URIs referencing the seller's UPI ID,
    shop name, order amount, and transaction tracking.
    """
    def create_payment(self, payment, seller, farmer, amount, checkout_data, request=None):
        profile = getattr(seller, 'seller_profile', None)
        upi_id = profile.upi_id if profile and profile.upi_id else 'agrimart@demo'
        shop_name = profile.shop_name if profile else seller.full_name
        merchant_name = profile.merchant_display_name if profile and profile.merchant_display_name else shop_name
        
        shop_logo_url = ''
        if profile and profile.shop_logo:
            try:
                if request:
                    shop_logo_url = request.build_absolute_uri(profile.shop_logo.url)
                else:
                    shop_logo_url = profile.shop_logo.url
            except Exception:
                pass

        # Generate a valid UPI URI
        upi_uri = f"upi://pay?pa={upi_id}&pn={encode_url_param(merchant_name)}&am={amount}&tn={payment.payment_id}&cu=INR"
        
        payment.gateway = Payment.UPI_QR
        payment.status = Payment.CREATED
        payment.metadata.update({
            'upi_id': upi_id,
            'shop_name': shop_name,
            'merchant_name': merchant_name,
            'demo_verify_after': random.randint(10, 15),
        })
        payment.save()

        return {
            'upi_id': upi_id,
            'merchant_name': merchant_name,
            'shop_name': shop_name,
            'shop_logo': shop_logo_url,
            'amount': float(amount),
            'upi_uri': upi_uri,
        }

    def verify_payment(self, payment, data):
        # Auto-confirm in simulation sandbox
        now = timezone.now()
        payment.status = Payment.PAID
        payment.transaction_id = f"TXN{uuid.uuid4().hex[:10].upper()}"
        payment.reference_number = f"REF{random.randint(100000000, 999999999)}"
        payment.paid_at = now
        payment.save()
        return True

    def check_status(self, payment):
        if payment.status in (Payment.CREATED, Payment.PENDING, Payment.PROCESSING):
            elapsed = (timezone.now() - payment.created_at).total_seconds()
            demo_delay = payment.metadata.get('demo_verify_after', 12)

            if elapsed >= 300:  # 5 minutes session timeout
                payment.status = Payment.EXPIRED
                payment.failure_reason = 'Payment request expired after 5 minutes.'
                payment.save(update_fields=['status', 'failure_reason', 'updated_at'])
            elif elapsed >= demo_delay:
                self.verify_payment(payment, {})
            elif elapsed >= demo_delay * 0.75:
                payment.status = Payment.PROCESSING
                payment.save(update_fields=['status', 'updated_at'])
            elif elapsed >= demo_delay * 0.5:
                payment.status = Payment.PENDING
                payment.save(update_fields=['status', 'updated_at'])


class RazorpayGateway(BasePaymentGateway):
    """
    Razorpay integration supporting live integration if keys are provided by the seller,
    falling back to simulated sandbox flows if credentials are empty.
    """
    def create_payment(self, payment, seller, farmer, amount, checkout_data, request=None):
        profile = getattr(seller, 'seller_profile', None)
        key_id = profile.razorpay_key_id if profile else None
        secret = profile.razorpay_secret if profile else None
        shop_name = profile.shop_name if profile else seller.full_name

        payment.gateway = Payment.RAZORPAY_DEMO
        payment.metadata.update({
            'shop_name': shop_name,
            'demo_verify_after': random.randint(8, 12),
        })

        if key_id and secret:
            try:
                import razorpay
                client = razorpay.Client(auth=(key_id, secret))
                amount_paisa = int(float(amount) * 100)
                rz_order = client.order.create({
                    'amount': amount_paisa,
                    'currency': 'INR',
                    'receipt': payment.payment_id,
                    'payment_capture': 1
                })
                payment.gateway_order_id = rz_order['id']
                payment.save()

                return {
                    'shop_name': shop_name,
                    'amount': float(amount),
                    'gateway_order_id': rz_order['id'],
                    'key': key_id,
                    'is_simulated': False
                }
            except Exception as e:
                # Log error and fallback to simulated mode
                payment.metadata['gateway_error'] = str(e)

        # Simulated Sandbox Order ID
        demo_order_id = f"order_{uuid.uuid4().hex[:12]}"
        payment.gateway_order_id = demo_order_id
        payment.save()

        return {
            'shop_name': shop_name,
            'amount': float(amount),
            'gateway_order_id': demo_order_id,
            'key': 'rzp_sandbox_key',
            'is_simulated': True
        }

    def verify_payment(self, payment, data):
        now = timezone.now()
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_signature = data.get('razorpay_signature')
        
        profile = getattr(payment.seller, 'seller_profile', None)
        key_id = profile.razorpay_key_id if profile else None
        secret = profile.razorpay_secret if profile else None

        if key_id and secret and razorpay_payment_id and razorpay_signature:
            try:
                import razorpay
                client = razorpay.Client(auth=(key_id, secret))
                # Verify HMAC signature
                client.utility.verify_payment_signature({
                    'razorpay_order_id': payment.gateway_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature
                })
                payment.status = Payment.PAID
                payment.transaction_id = razorpay_payment_id
                payment.reference_number = f"REF{random.randint(100000000, 999999999)}"
                payment.gateway_payment_id = razorpay_payment_id
                payment.paid_at = now
                payment.save()
                return True
            except Exception as e:
                payment.status = Payment.FAILED
                payment.failure_reason = f"Signature verification failed: {str(e)}"
                payment.save()
                return False

        # Sandbox Simulation
        payment.status = Payment.PAID
        payment.transaction_id = f"pay_{uuid.uuid4().hex[:14]}"
        payment.reference_number = f"REF{random.randint(100000000, 999999999)}"
        payment.gateway_payment_id = payment.transaction_id
        payment.paid_at = now
        payment.save()
        return True

    def check_status(self, payment):
        if payment.status in (Payment.CREATED, Payment.PENDING, Payment.PROCESSING):
            elapsed = (timezone.now() - payment.created_at).total_seconds()
            demo_delay = payment.metadata.get('demo_verify_after', 10)

            if elapsed >= 300:
                payment.status = Payment.EXPIRED
                payment.failure_reason = 'Payment timed out.'
                payment.save(update_fields=['status', 'failure_reason', 'updated_at'])
            elif elapsed >= demo_delay:
                self.verify_payment(payment, {})


class PhonePeGateway(BasePaymentGateway):
    """
    PhonePe Gateway sandbox simulator.
    """
    def create_payment(self, payment, seller, farmer, amount, checkout_data, request=None):
        profile = getattr(seller, 'seller_profile', None)
        merchant_id = profile.phonepe_merchant_id if profile else ''
        payment.gateway = 'phonepe'
        payment.gateway_order_id = f"PPE_{uuid.uuid4().hex[:12].upper()}"
        payment.metadata.update({
            'merchant_id': merchant_id,
            'demo_verify_after': random.randint(10, 15)
        })
        payment.save()

        return {
            'merchant_id': merchant_id or 'PHONEPE_DEMO_MERCHANT',
            'amount': float(amount),
            'gateway_order_id': payment.gateway_order_id,
            'payment_url': f"https://merchants.phonepe.com/sandbox/pay/{payment.gateway_order_id}",
            'is_simulated': True
        }

    def verify_payment(self, payment, data):
        payment.status = Payment.PAID
        payment.transaction_id = f"P2P{uuid.uuid4().hex[:12].upper()}"
        payment.reference_number = f"REF{random.randint(100000000, 999999999)}"
        payment.paid_at = timezone.now()
        payment.save()
        return True

    def check_status(self, payment):
        if payment.status in (Payment.CREATED, Payment.PENDING, Payment.PROCESSING):
            elapsed = (timezone.now() - payment.created_at).total_seconds()
            demo_delay = payment.metadata.get('demo_verify_after', 12)

            if elapsed >= 300:
                payment.status = Payment.EXPIRED
                payment.save(update_fields=['status', 'updated_at'])
            elif elapsed >= demo_delay:
                self.verify_payment(payment, {})


class CashfreeGateway(BasePaymentGateway):
    """
    Cashfree Gateway sandbox simulator.
    """
    def create_payment(self, payment, seller, farmer, amount, checkout_data, request=None):
        profile = getattr(seller, 'seller_profile', None)
        key_id = profile.cashfree_key_id if profile else ''
        payment.gateway = 'cashfree'
        payment.gateway_order_id = f"CF_{uuid.uuid4().hex[:12].upper()}"
        payment.metadata.update({
            'key_id': key_id,
            'demo_verify_after': random.randint(10, 15)
        })
        payment.save()

        return {
            'key_id': key_id or 'CF_DEMO_KEY',
            'amount': float(amount),
            'gateway_order_id': payment.gateway_order_id,
            'payment_url': f"https://payments.cashfree.com/order/{payment.gateway_order_id}",
            'is_simulated': True
        }

    def verify_payment(self, payment, data):
        payment.status = Payment.PAID
        payment.transaction_id = f"CF{uuid.uuid4().hex[:12].upper()}"
        payment.reference_number = f"REF{random.randint(100000000, 999999999)}"
        payment.paid_at = timezone.now()
        payment.save()
        return True

    def check_status(self, payment):
        if payment.status in (Payment.CREATED, Payment.PENDING, Payment.PROCESSING):
            elapsed = (timezone.now() - payment.created_at).total_seconds()
            demo_delay = payment.metadata.get('demo_verify_after', 12)

            if elapsed >= 300:
                payment.status = Payment.EXPIRED
                payment.save(update_fields=['status', 'updated_at'])
            elif elapsed >= demo_delay:
                self.verify_payment(payment, {})


class StripeGateway(BasePaymentGateway):
    """
    Stripe Gateway simulator.
    """
    def create_payment(self, payment, seller, farmer, amount, checkout_data, request=None):
        payment.gateway = 'stripe'
        payment.gateway_order_id = f"ch_{uuid.uuid4().hex[:16]}"
        payment.metadata.update({
            'demo_verify_after': random.randint(5, 10)
        })
        payment.save()
        return {
            'amount': float(amount),
            'gateway_order_id': payment.gateway_order_id,
            'is_simulated': True
        }

    def verify_payment(self, payment, data):
        payment.status = Payment.PAID
        payment.transaction_id = f"ch_{uuid.uuid4().hex[:16]}"
        payment.reference_number = f"REF{random.randint(100000000, 999999999)}"
        payment.paid_at = timezone.now()
        payment.save()
        return True

    def check_status(self, payment):
        if payment.status in (Payment.CREATED, Payment.PENDING, Payment.PROCESSING):
            elapsed = (timezone.now() - payment.created_at).total_seconds()
            demo_delay = payment.metadata.get('demo_verify_after', 8)

            if elapsed >= 300:
                payment.status = Payment.EXPIRED
                payment.save(update_fields=['status', 'updated_at'])
            elif elapsed >= demo_delay:
                self.verify_payment(payment, {})


class PaymentService:
    """
    Single orchestrator coordinating payment actions.
    Decides appropriate gateway adapter and coordinates order/invoice side-effects.
    """
    def __init__(self):
        self._gateways = {
            'upi': UPIQRGateway(),
            'razorpay': RazorpayGateway(),
            'phonepe': PhonePeGateway(),
            'cashfree': CashfreeGateway(),
            'stripe': StripeGateway()
        }

    def get_gateway(self, method):
        return self._gateways.get(method.lower(), self._gateways['upi'])

    def initiate_payment(self, payment_method, seller, farmer, amount, checkout_data, request=None):
        # Create initial Payment record
        payment = Payment.objects.create(
            seller=seller,
            farmer=farmer,
            amount=amount,
            payment_method=payment_method,
            status=Payment.CREATED,
            checkout_data=checkout_data,
        )

        gateway_adapter = self.get_gateway(payment_method)
        gateway_data = gateway_adapter.create_payment(
            payment, seller, farmer, amount, checkout_data, request
        )

        return payment, gateway_data

    def verify_payment(self, payment, data):
        gateway_adapter = self.get_gateway(payment.payment_method)
        success = gateway_adapter.verify_payment(payment, data)
        if success:
            order = self.complete_successful_payment(payment)
            return success, order
        return success, None

    def check_payment_status(self, payment):
        gateway_adapter = self.get_gateway(payment.payment_method)
        gateway_adapter.check_status(payment)
        
        if payment.status == Payment.PAID and not payment.order:
            self.complete_successful_payment(payment)

    def complete_successful_payment(self, payment):
        """
        Executes order creation, stock reductions, invoice generation,
        and notification dispatch upon successful payment transaction.
        """
        if payment.order:
            return payment.order

        cd = payment.checkout_data
        
        # Create Order
        from .models import Order, OrderItem
        from products.models import Product, Cart
        from django.db import transaction

        with transaction.atomic():
            order = Order.objects.create(
                farmer=payment.farmer,
                seller=payment.seller,
                status=Order.PENDING,
                payment_method=payment.payment_method,
                payment_status='paid',
                subtotal=cd['subtotal'],
                gst_amount=cd['gst'],
                delivery_charge=cd['delivery_charge'],
                total=cd['total'],
                delivery_address=cd['delivery_address'],
                delivery_village=cd.get('delivery_village', ''),
                delivery_taluka=cd.get('delivery_taluka', ''),
                delivery_district=cd.get('delivery_district', ''),
                delivery_pincode=cd.get('delivery_pincode', ''),
                delivery_phone=cd['delivery_phone'],
                notes=cd.get('notes', ''),
            )

            # Link order and save razorpay tags
            if payment.payment_method == 'razorpay':
                order.razorpay_payment_id = payment.gateway_payment_id or payment.transaction_id
                order.razorpay_order_id = payment.gateway_order_id
                order.save(update_fields=['razorpay_payment_id', 'razorpay_order_id'])

            payment.order = order
            payment.save()

            # Create OrderItems and reduce inventory
            for item_data in cd.get('items', []):
                product = Product.objects.get(id=item_data['product_id'])
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=item_data['quantity'],
                )
                product.stock -= item_data['quantity']
                product.save(update_fields=['stock'])

                # Dispatch Low Stock Notification to Seller
                if product.stock < 5:
                    from notifications.utils import send_notification
                    send_notification(
                        payment.seller, 'low_stock',
                        f'Warning: Product "{product.name}" is low in stock ({product.stock} left). Please restock.',
                        order.id
                    )

            # Clear cart
            Cart.objects.filter(user=payment.farmer).delete()

        # Create Invoice PDF immediately
        from .models import Invoice
        from .invoice import generate_invoice_pdf
        from django.core.files.base import ContentFile

        invoice_number = f"INV-{timezone.now().year}-{order.id:04d}"
        invoice = Invoice.objects.create(
            order=order,
            invoice_number=invoice_number
        )

        try:
            pdf_data = generate_invoice_pdf(order)
            invoice.pdf_file.save(f"invoice_{order.order_number}.pdf", ContentFile(pdf_data), save=True)
        except Exception as e:
            print(f"Error generating invoice PDF during checkout: {e}")

        # Send Notifications
        from notifications.utils import send_notification
        
        # Farmer: Order Confirmation
        send_notification(
            payment.farmer, 'order_update',
            f'Your order #{order.order_number} has been confirmed. Expected delivery by {order.expected_delivery.strftime("%d %b %Y")}.',
            order.id
        )
        
        # Farmer: Payment Confirmation
        send_notification(
            payment.farmer, 'payment',
            f'Payment of ₹{order.total} was successful for order #{order.order_number}.',
            order.id
        )

        # Farmer: Invoice Confirmation
        send_notification(
            payment.farmer, 'payment',
            f'Invoice {invoice_number} has been generated for your order #{order.order_number}.',
            order.id
        )

        # Seller: New Order Notification
        send_notification(
            payment.seller, 'new_order',
            f'New order #{order.order_number} received! Payment confirmed ✅',
            order.id
        )

        return order


def encode_url_param(text):
    """Urlencode helper for UPI QR strings."""
    import urllib.parse
    return urllib.parse.quote(text)
