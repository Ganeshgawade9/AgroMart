"""OTP checks for the two order handovers.

  pickup   seller -> delivery partner. The code is SMSed to the mobile number the
           seller registered with; the rider must enter it to confirm they
           collected the order.
  delivery delivery partner -> farmer. The code is SMSed to the mobile number the
           farmer registered with; the rider must enter it to confirm the
           farmer received the order.

OTPs only ever go to the registered number of the account that owns the code.
The contact number typed at checkout (order.delivery_phone) is for the rider to
call and is never used for OTPs.

A code allows OTP_MAX_ATTEMPTS wrong guesses, after which it is locked until
the owner requests a fresh one.
"""
import hmac
import secrets

from django.conf import settings
from django.db.models import F
from django.utils import timezone

from notifications.sms import normalize_phone, send_sms
from .models import Order

PICKUP = 'pickup'
DELIVERY = 'delivery'

LOCKED_MESSAGE = 'Too many wrong attempts. Ask for a new OTP.'


def new_code():
    return f'{secrets.randbelow(10 ** 6):06d}'


def _fields(kind):
    return f'{kind}_otp', f'{kind}_otp_attempts', f'{kind}_otp_sent_at'


def _recipient_phone(order, kind):
    """The registered mobile number of the person who must receive this code."""
    owner = order.seller if kind == PICKUP else order.farmer
    return owner.phone


def _message(order, kind, code):
    if kind == PICKUP:
        return (f'AgroConnect: pickup OTP for order #{order.order_number} is {code}. '
                'Give it to the delivery partner only when they collect the order.')
    return (f'AgroConnect: delivery OTP for order #{order.order_number} is {code}. '
            'Give it to the delivery partner only after you receive your order.')


def send_otp(order, kind, regenerate=False):
    """SMS the handover OTP, creating (or replacing) the code when needed."""
    code_field, attempts_field, sent_field = _fields(kind)
    if regenerate or not getattr(order, code_field):
        setattr(order, code_field, new_code())
        setattr(order, attempts_field, 0)
    setattr(order, sent_field, timezone.now())
    order.save(update_fields=[code_field, attempts_field, sent_field, 'updated_at'])
    return send_sms(_recipient_phone(order, kind), _message(order, kind, getattr(order, code_field)))


def seconds_until_resend(order, kind):
    sent_at = getattr(order, _fields(kind)[2])
    if not sent_at:
        return 0
    wait = settings.OTP_RESEND_SECONDS - (timezone.now() - sent_at).total_seconds()
    return max(0, int(wait))


def check_otp(order, kind, submitted):
    """Verify a submitted code. Returns (ok, error_message)."""
    code_field, attempts_field, _ = _fields(kind)
    # Re-read so attempts cannot be reset by working on a stale copy of the order
    current = Order.objects.values(code_field, attempts_field).get(pk=order.pk)
    if current[attempts_field] >= settings.OTP_MAX_ATTEMPTS:
        return False, LOCKED_MESSAGE
    expected = current[code_field]
    submitted = str(submitted or '').strip()
    if not expected or not hmac.compare_digest(expected.encode(), submitted.encode()):
        Order.objects.filter(pk=order.pk).update(**{attempts_field: F(attempts_field) + 1})
        left = settings.OTP_MAX_ATTEMPTS - current[attempts_field] - 1
        if left <= 0:
            return False, LOCKED_MESSAGE
        return False, f'Invalid OTP. {left} attempt{"s" if left != 1 else ""} left.'
    return True, ''
