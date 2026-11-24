"""Forgot-password & Registration OTP: issue codes by SMS and verify them."""
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import salted_hmac

from notifications.sms import normalize_phone, send_sms
from .models import PasswordResetOTP, RegistrationOTP

User = get_user_model()

MAX_REQUESTS_PER_HOUR = 5


def hash_code(user_id, code):
    return salted_hmac('agromart.password-reset-otp', f'{user_id}:{code}').hexdigest()


def hash_reg_code(phone, code):
    return salted_hmac('agromart.registration-otp', f'{phone}:{code}').hexdigest()


def find_user(identifier):
    """Match an active user by email, or by mobile number when it is unique."""
    identifier = (identifier or '').strip()
    if not identifier:
        return None
    if '@' in identifier:
        return User.objects.filter(email__iexact=identifier, is_active=True).first()
    number = normalize_phone(identifier)
    if not number:
        return None
    # Phones are stored as typed ("+91 98765 43210"), so match on the digits only
    pattern = r'^\D*(?:(?:91|0)\D*)?' + r'\D*'.join(number) + r'\D*$'
    matches = list(User.objects.filter(phone__regex=pattern, is_active=True)[:2])
    return matches[0] if len(matches) == 1 else None


def issue_otp(user):
    """Create and SMS a reset OTP. Returns ('sent', code), ('throttled', None) or ('no_phone', None)."""
    if not normalize_phone(user.phone):
        return 'no_phone', None

    now = timezone.now()
    recent = PasswordResetOTP.objects.filter(user=user, created_at__gte=now - timedelta(hours=1))
    last = recent.first()
    if (last and (now - last.created_at).total_seconds() < settings.OTP_RESEND_SECONDS) \
            or recent.count() >= MAX_REQUESTS_PER_HOUR:
        return 'throttled', None

    code = f'{secrets.randbelow(10 ** 6):06d}'
    with transaction.atomic():
        # Only the newest code is valid
        PasswordResetOTP.objects.filter(user=user, used_at__isnull=True).update(used_at=now)
        PasswordResetOTP.objects.create(
            user=user, code_hash=hash_code(user.id, code),
            expires_at=now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES),
        )

    # Print to console for development visibility
    print(f"\n=======================================================\n[OTP] [AgroConnect] Password Reset OTP for {user.phone}: {code}\n=======================================================\n", flush=True)

    send_sms(user.phone, (
        f'AgroConnect: {code} is your password reset OTP. Valid for '
        f'{settings.OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.'
    ))
    return 'sent', code


def verify_otp(user, code):
    """Check a submitted code. Consumes it on success. Returns True/False."""
    now = timezone.now()
    with transaction.atomic():
        otp = (PasswordResetOTP.objects.select_for_update()
               .filter(user=user, used_at__isnull=True, expires_at__gt=now).first())
        if otp is None or otp.attempts >= settings.OTP_MAX_ATTEMPTS:
            return False
        if not hmac.compare_digest(otp.code_hash, hash_code(user.id, code)):
            otp.attempts += 1
            otp.save(update_fields=['attempts'])
            return False
        otp.used_at = now
        otp.save(update_fields=['used_at'])
        return True


def issue_registration_otp(phone):
    """Create and SMS an OTP to verify a mobile number during registration.
    
    Returns ('sent', code), ('throttled', None), or ('invalid_phone', None).
    """
    number = normalize_phone(phone)
    if not number:
        return 'invalid_phone', None

    now = timezone.now()
    recent = RegistrationOTP.objects.filter(phone=number, created_at__gte=now - timedelta(hours=1))
    last = recent.first()
    if (last and (now - last.created_at).total_seconds() < settings.OTP_RESEND_SECONDS) \
            or recent.count() >= MAX_REQUESTS_PER_HOUR:
        return 'throttled', None

    code = f'{secrets.randbelow(10 ** 6):06d}'
    with transaction.atomic():
        # Invalidate previous unconsumed OTPs for this phone
        RegistrationOTP.objects.filter(phone=number, used_at__isnull=True).update(used_at=now)
        RegistrationOTP.objects.create(
            phone=number,
            code_hash=hash_reg_code(number, code),
            expires_at=now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES),
        )

    # Print to console for development visibility
    print(f"\n=======================================================\n[OTP] [AgroConnect] Registration OTP for {number}: {code}\n=======================================================\n", flush=True)


    send_sms(number, (
        f'AgroConnect: {code} is your mobile verification OTP for registration. Valid for '
        f'{settings.OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.'
    ))
    return 'sent', code



def verify_registration_otp(phone, code):
    """Verify an OTP submitted for mobile registration. Marks verified_at on success."""
    number = normalize_phone(phone)
    if not number or not code:
        return False

    now = timezone.now()
    with transaction.atomic():
        otp = (RegistrationOTP.objects.select_for_update()
               .filter(phone=number, used_at__isnull=True, expires_at__gt=now).first())
        if otp is None or otp.attempts >= settings.OTP_MAX_ATTEMPTS:
            return False
        if not hmac.compare_digest(otp.code_hash, hash_reg_code(number, str(code).strip())):
            otp.attempts += 1
            otp.save(update_fields=['attempts'])
            return False
        otp.verified_at = now
        otp.save(update_fields=['verified_at'])
        return True


def is_registration_verified(phone):
    """Check if the given phone has a recently verified registration OTP (within last 15 mins)."""
    number = normalize_phone(phone)
    if not number:
        return False
    cutoff = timezone.now() - timedelta(minutes=15)
    return RegistrationOTP.objects.filter(
        phone=number,
        verified_at__gte=cutoff,
        used_at__isnull=True
    ).exists()


def consume_registration_otp(phone):
    """Mark verified registration OTPs as consumed when registration completes."""
    number = normalize_phone(phone)
    if not number:
        return
    now = timezone.now()
    RegistrationOTP.objects.filter(phone=number, used_at__isnull=True).update(used_at=now)

