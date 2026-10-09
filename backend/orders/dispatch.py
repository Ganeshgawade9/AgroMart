"""Delivery dispatch: pick a suitable online rider for an order and offer it to them.

Flow (mirrors a food-delivery app):
  1. Riders go online and share their location (DeliveryProfile).
  2. A seller accepts an order -> start_dispatch(order).
  3. We rank eligible riders (nearest to the shop, fewest running deliveries)
     and send the order as an offer to the best one.
  4. The rider accepts, declines, or the offer expires. On decline/expiry the
     offer goes to the next best rider who has not been asked yet.
  5. If nobody is available the seller is told and can assign a rider manually.

There is no background worker: expired offers are processed whenever a rider or
the order owner polls (see expire_stale_offers), and the `dispatch_orders`
management command can be run on a schedule for a more reliable sweep.
"""
import math
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from notifications.utils import send_notification
from .delivery_models import DeliveryOffer, DeliveryProfile
from .models import Order

# Tunables (override in settings.py)
OFFER_TTL_SECONDS = getattr(settings, 'DISPATCH_OFFER_TTL_SECONDS', 90)
MAX_RADIUS_KM = getattr(settings, 'DISPATCH_MAX_RADIUS_KM', 25)
MAX_ACTIVE_ORDERS = getattr(settings, 'DISPATCH_MAX_ACTIVE_ORDERS', 3)
LOCATION_FRESH_MINUTES = getattr(settings, 'DISPATCH_LOCATION_FRESH_MINUTES', 15)
# Each delivery a rider is already carrying counts like this many extra km when ranking
ACTIVE_ORDER_PENALTY_KM = getattr(settings, 'DISPATCH_ACTIVE_ORDER_PENALTY_KM', 3.0)
AVG_SPEED_KMH = getattr(settings, 'DISPATCH_AVG_SPEED_KMH', 25)

ACTIVE_STATUSES = [Order.ACCEPTED, Order.PACKED, Order.OUT_FOR_DELIVERY]


def haversine_km(lat1, lng1, lat2, lng2):
    r = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return r * 2 * math.asin(min(1.0, math.sqrt(a)))


def eta_minutes(distance_km):
    return max(1, round(distance_km / AVG_SPEED_KMH * 60))


def shop_coords(order):
    seller = order.seller
    if seller.latitude is None or seller.longitude is None:
        return None
    return float(seller.latitude), float(seller.longitude)


def active_count(user):
    return Order.objects.filter(delivery_partner=user, status__in=ACTIVE_STATUSES).count()


def find_candidates(order, exclude_user_ids=()):
    """Eligible riders for this order, best first, as (profile, distance_km, active_orders)."""
    coords = shop_coords(order)
    if coords is None:
        return []
    shop_lat, shop_lng = coords
    fresh_after = timezone.now() - timedelta(minutes=LOCATION_FRESH_MINUTES)

    profiles = (
        DeliveryProfile.objects
        .filter(
            is_online=True,
            latitude__isnull=False,
            longitude__isnull=False,
            location_updated_at__gte=fresh_after,
            user__role='delivery',
            user__is_active=True,
            user__is_approved=True,
        )
        .exclude(user_id__in=list(exclude_user_ids))
        .select_related('user')
    )

    ranked = []
    for profile in profiles:
        distance = haversine_km(profile.latitude, profile.longitude, shop_lat, shop_lng)
        if distance > MAX_RADIUS_KM:
            continue
        running = active_count(profile.user)
        if running >= MAX_ACTIVE_ORDERS:
            continue
        score = distance + running * ACTIVE_ORDER_PENALTY_KM
        ranked.append((score, distance, running, profile))

    ranked.sort(key=lambda r: (r[0], r[1]))
    return [(profile, distance, running) for _, distance, running, profile in ranked]


def _needs_rider(order):
    return (
        order.delivery_partner_id is None
        and order.status in (Order.ACCEPTED, Order.PACKED)
    )


def offer_to_next_rider(order, notify_seller_if_none=True):
    """Offer the order to the best rider who has not been asked yet.

    Returns the new DeliveryOffer, or None if nobody is available (or a live offer exists).
    """
    with transaction.atomic():
        order = Order.objects.select_for_update().select_related('seller').get(pk=order.pk)
        if not _needs_rider(order):
            return None
        if order.offers.filter(status=DeliveryOffer.PENDING, expires_at__gt=timezone.now()).exists():
            return None

        already_asked = order.offers.values_list('partner_id', flat=True)
        candidates = find_candidates(order, exclude_user_ids=already_asked)
        if not candidates:
            offer = None
        else:
            profile, distance, _ = candidates[0]
            try:
                with transaction.atomic():
                    offer = DeliveryOffer.objects.create(
                        order=order,
                        partner=profile.user,
                        distance_to_shop_km=round(distance, 1),
                        expires_at=timezone.now() + timedelta(seconds=OFFER_TTL_SECONDS),
                    )
            except IntegrityError:
                # A concurrent request already created the live offer
                return None

    if offer:
        send_notification(
            offer.partner, 'new_order',
            f'New delivery offer: order #{order.order_number} ({offer.distance_to_shop_km} km from you). Open your dashboard to accept.',
            order.id,
        )
    elif notify_seller_if_none:
        send_notification(
            order.seller, 'order_update',
            f'No delivery partner is available nearby for order #{order.order_number} yet. We will keep trying, or you can assign one manually.',
            order.id,
        )
    return offer


def start_dispatch(order):
    """Begin finding a rider for an order the seller has just accepted."""
    return offer_to_next_rider(order)


def expire_stale_offers(order=None):
    """Mark timed-out offers as expired and pass those orders to the next rider."""
    stale = DeliveryOffer.objects.filter(status=DeliveryOffer.PENDING, expires_at__lte=timezone.now())
    if order is not None:
        stale = stale.filter(order=order)
    order_ids = set()
    for offer in stale.select_related('order'):
        updated = DeliveryOffer.objects.filter(pk=offer.pk, status=DeliveryOffer.PENDING).update(
            status=DeliveryOffer.EXPIRED, responded_at=timezone.now()
        )
        if updated:
            order_ids.add(offer.order_id)
    for order_obj in Order.objects.filter(pk__in=order_ids):
        offer_to_next_rider(order_obj)
    return len(order_ids)


def retry_unassigned(order):
    """Quietly try again for an order still waiting for a rider (e.g. a rider just came online)."""
    expire_stale_offers(order)
    return offer_to_next_rider(order, notify_seller_if_none=False)


def retry_waiting_orders():
    """Retry every accepted/packed order that has no rider (called when a rider goes online)."""
    waiting = Order.objects.filter(delivery_partner__isnull=True, status__in=[Order.ACCEPTED, Order.PACKED])
    for order in waiting:
        retry_unassigned(order)


def cancel_open_offers(order):
    order.offers.filter(status=DeliveryOffer.PENDING).update(
        status=DeliveryOffer.CANCELLED, responded_at=timezone.now()
    )


def accept_offer(offer, user):
    """Assign the order to the rider. Returns (order, error_message)."""
    with transaction.atomic():
        offer = DeliveryOffer.objects.select_for_update().select_related('order').get(pk=offer.pk)
        if offer.partner_id != user.id:
            return None, 'This offer is not for you.'
        if offer.status != DeliveryOffer.PENDING:
            return None, 'This offer is no longer available.'
        if offer.expires_at <= timezone.now():
            offer.status = DeliveryOffer.EXPIRED
            offer.responded_at = timezone.now()
            offer.save(update_fields=['status', 'responded_at'])
            return None, 'This offer has expired.'

        order = Order.objects.select_for_update().get(pk=offer.order_id)
        if not _needs_rider(order):
            offer.status = DeliveryOffer.CANCELLED
            offer.responded_at = timezone.now()
            offer.save(update_fields=['status', 'responded_at'])
            return None, 'This order has already been assigned.'

        order.delivery_partner = user
        order.rider_assigned_at = timezone.now()
        order.save(update_fields=['delivery_partner', 'rider_assigned_at', 'updated_at'])
        offer.status = DeliveryOffer.ACCEPTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=['status', 'responded_at'])

    name = user.full_name
    send_notification(order.farmer, 'order_update',
                      f'{name} will deliver your order #{order.order_number}.', order.id)
    send_notification(order.seller, 'order_update',
                      f'{name} accepted delivery of order #{order.order_number} and is heading to your shop.', order.id)
    return order, None


def decline_offer(offer, user):
    with transaction.atomic():
        offer = DeliveryOffer.objects.select_for_update().select_related('order').get(pk=offer.pk)
        if offer.partner_id != user.id or offer.status != DeliveryOffer.PENDING:
            return False
        offer.status = DeliveryOffer.DECLINED
        offer.responded_at = timezone.now()
        offer.save(update_fields=['status', 'responded_at'])
    offer_to_next_rider(offer.order)
    return True
