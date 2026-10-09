from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.utils import send_notification
from . import dispatch
from .delivery_models import DeliveryOffer, DeliveryProfile
from .models import Order
from .serializers import DeliveryOrderSerializer


class IsDeliveryPartner(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'delivery')


def parse_coords(data):
    """Return (lat, lng) floats from request data, or None if missing or out of range."""
    try:
        lat = float(data.get('lat'))
        lng = float(data.get('lng'))
    except (TypeError, ValueError):
        return None
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None
    return lat, lng


def get_profile(user):
    profile, _ = DeliveryProfile.objects.get_or_create(user=user)
    return profile


def profile_payload(profile):
    return {
        'is_online': profile.is_online,
        'latitude': profile.latitude,
        'longitude': profile.longitude,
        'location_updated_at': profile.location_updated_at,
        'vehicle_type': profile.vehicle_type,
        'active_orders': dispatch.active_count(profile.user),
    }


def offer_payload(offer):
    order = offer.order
    seller = order.seller
    shop_profile = getattr(seller, 'seller_profile', None)
    drop_km = None
    if (seller.latitude is not None and seller.longitude is not None
            and order.delivery_latitude is not None and order.delivery_longitude is not None):
        drop_km = round(dispatch.haversine_km(
            float(seller.latitude), float(seller.longitude),
            float(order.delivery_latitude), float(order.delivery_longitude)), 1)
    seconds_left = max(0, int((offer.expires_at - timezone.now()).total_seconds()))
    return {
        'id': offer.id,
        'order_id': order.id,
        'order_number': order.order_number,
        'expires_at': offer.expires_at,
        'seconds_left': seconds_left,
        'distance_to_shop_km': offer.distance_to_shop_km,
        'eta_to_shop_minutes': dispatch.eta_minutes(offer.distance_to_shop_km),
        'shop_to_customer_km': drop_km,
        'shop_name': shop_profile.shop_name if shop_profile else seller.full_name,
        'shop_address': ', '.join(p for p in [seller.address, seller.village, seller.district] if p),
        'shop_latitude': float(seller.latitude) if seller.latitude is not None else None,
        'shop_longitude': float(seller.longitude) if seller.longitude is not None else None,
        # Only the area is shown until the rider accepts; the full address comes after
        'drop_area': ', '.join(p for p in [order.delivery_village, order.delivery_district] if p),
        'items_count': order.items.count(),
        'total': float(order.total),
        'payment_method': order.payment_method,
        'cash_to_collect': float(order.total) if order.payment_method == Order.COD and order.payment_status != 'paid' else 0,
        'earning': float(order.delivery_charge),
        'estimated_prep_minutes': order.estimated_prep_minutes,
        'order_status': order.status,
    }


class DeliveryDutyView(APIView):
    """Step 1: rider goes online (with their location) or offline."""
    permission_classes = [IsDeliveryPartner]

    def get(self, request):
        return Response(profile_payload(get_profile(request.user)))

    def post(self, request):
        profile = get_profile(request.user)
        online = request.data.get('online')
        if isinstance(online, str):
            online = online.lower() == 'true'
        if online is None:
            return Response({'error': '"online" is required'}, status=400)

        vehicle = request.data.get('vehicle_type')
        if vehicle in dict(DeliveryProfile.VEHICLE_CHOICES):
            profile.vehicle_type = vehicle

        if online:
            coords = parse_coords(request.data)
            if coords is None:
                return Response({'error': 'Your location is required to go online. Please allow location access.'}, status=400)
            profile.set_location(*coords)
            profile.is_online = True
            profile.save()
            # A rider coming online may be the one a waiting order needs
            dispatch.expire_stale_offers()
            dispatch.retry_waiting_orders()
        else:
            profile.is_online = False
            profile.save()
            # Hand back any offers still waiting on this rider
            for offer in DeliveryOffer.objects.filter(partner=request.user, status=DeliveryOffer.PENDING):
                dispatch.decline_offer(offer, request.user)
        return Response(profile_payload(profile))


class DeliveryLocationView(APIView):
    """Rider app sends its location every few seconds while on duty."""
    permission_classes = [IsDeliveryPartner]

    def post(self, request):
        coords = parse_coords(request.data)
        if coords is None:
            return Response({'error': 'Valid lat and lng are required'}, status=400)
        profile = get_profile(request.user)
        profile.set_location(*coords)
        profile.save(update_fields=['latitude', 'longitude', 'location_updated_at', 'updated_at'])
        return Response({'ok': True})


class DeliveryOffersView(APIView):
    """Step 4: the trip offers waiting for this rider."""
    permission_classes = [IsDeliveryPartner]

    def get(self, request):
        dispatch.expire_stale_offers()
        offers = (
            DeliveryOffer.objects
            .filter(partner=request.user, status=DeliveryOffer.PENDING, expires_at__gt=timezone.now())
            .select_related('order', 'order__seller', 'order__seller__seller_profile')
        )
        return Response({'offers': [offer_payload(o) for o in offers]})


class DeliveryOfferAcceptView(APIView):
    permission_classes = [IsDeliveryPartner]

    def post(self, request, offer_id):
        try:
            offer = DeliveryOffer.objects.get(pk=offer_id, partner=request.user)
        except DeliveryOffer.DoesNotExist:
            return Response({'error': 'Offer not found'}, status=404)
        order, error = dispatch.accept_offer(offer, request.user)
        if error:
            return Response({'error': error}, status=status.HTTP_409_CONFLICT)
        return Response({
            'message': 'Order accepted. Head to the shop for pickup.',
            'order': DeliveryOrderSerializer(order, context={'request': request}).data,
        })


class DeliveryOfferDeclineView(APIView):
    permission_classes = [IsDeliveryPartner]

    def post(self, request, offer_id):
        try:
            offer = DeliveryOffer.objects.get(pk=offer_id, partner=request.user)
        except DeliveryOffer.DoesNotExist:
            return Response({'error': 'Offer not found'}, status=404)
        dispatch.decline_offer(offer, request.user)
        return Response({'message': 'Offer declined'})


class DeliveryPickupView(APIView):
    """Step 5: rider collects the packed order from the shop."""
    permission_classes = [IsDeliveryPartner]

    def post(self, request, order_id):
        try:
            order = Order.objects.get(
                id=order_id, delivery_partner=request.user,
                status__in=[Order.ACCEPTED, Order.PACKED],
            )
        except Order.DoesNotExist:
            return Response({'error': 'Order not found or already picked up'}, status=404)
        if order.status != Order.PACKED:
            return Response({'error': 'The shop is still preparing this order. Please wait until it is packed.'}, status=400)

        order.status = Order.OUT_FOR_DELIVERY
        order.picked_up_at = timezone.now()
        order.save(update_fields=['status', 'picked_up_at', 'updated_at'])
        send_notification(order.farmer, 'order_update',
                          f'Your order #{order.order_number} has been picked up and is on the way!', order.id)
        return Response({'message': 'Pickup confirmed. Now deliver to the customer.'})


class OrderTrackingView(APIView):
    """Dispatch / rider status for the farmer and the seller of an order."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        user = request.user
        try:
            if user.role == 'farmer':
                order = Order.objects.select_related('seller', 'delivery_partner').get(id=order_id, farmer=user)
            elif user.role == 'seller':
                order = Order.objects.select_related('seller', 'delivery_partner').get(id=order_id, seller=user)
            else:
                return Response({'error': 'Not authorized'}, status=403)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)

        if order.delivery_partner_id is None and order.status in (Order.ACCEPTED, Order.PACKED):
            dispatch.retry_unassigned(order)
            order.refresh_from_db()

        data = {'order_status': order.status, 'stage': 'none', 'rider': None, 'offer': None}

        if order.status == Order.DELIVERED:
            data['stage'] = 'delivered'
        elif order.status == Order.CANCELLED:
            data['stage'] = 'cancelled'
        elif order.delivery_partner_id is None:
            if order.status in (Order.ACCEPTED, Order.PACKED):
                data['stage'] = 'finding_rider'
                if user.role == 'seller':
                    live = order.offers.filter(status=DeliveryOffer.PENDING, expires_at__gt=timezone.now()).select_related('partner').first()
                    if live:
                        data['offer'] = {'partner_name': live.partner.full_name, 'expires_at': live.expires_at}
        else:
            partner = order.delivery_partner
            profile = getattr(partner, 'delivery_profile', None)
            picked_up = order.status == Order.OUT_FOR_DELIVERY
            data['stage'] = 'on_the_way' if picked_up else 'rider_assigned'
            rider = {
                'name': partner.full_name,
                'phone': partner.phone,
                'vehicle_type': profile.vehicle_type if profile else 'bike',
                'latitude': None, 'longitude': None,
                'location_updated_at': None,
                'distance_km': None, 'eta_minutes': None,
                'heading_to': 'customer' if picked_up else 'shop',
            }
            # A farmer sees the rider on the map only once the order is picked up;
            # the seller can follow the rider to the shop beforehand.
            may_see_location = picked_up or user.role == 'seller'
            if profile and profile.has_location and may_see_location:
                rider['latitude'] = profile.latitude
                rider['longitude'] = profile.longitude
                rider['location_updated_at'] = profile.location_updated_at
                if picked_up and order.delivery_latitude is not None and order.delivery_longitude is not None:
                    target = (float(order.delivery_latitude), float(order.delivery_longitude))
                elif not picked_up and order.seller.latitude is not None and order.seller.longitude is not None:
                    target = (float(order.seller.latitude), float(order.seller.longitude))
                else:
                    target = None
                if target:
                    km = dispatch.haversine_km(profile.latitude, profile.longitude, *target)
                    rider['distance_km'] = round(km, 1)
                    rider['eta_minutes'] = dispatch.eta_minutes(km)
            data['rider'] = rider
        return Response(data)
