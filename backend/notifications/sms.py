"""Minimal SMS sender used for OTPs.

Pick the provider with the SMS_BACKEND setting:
  console  - log the message only (default, for development)
  fast2sms - Fast2SMS "otp" route (Indian numbers)
  twilio   - Twilio Messages API

Never raises: a failed SMS must not break the request that triggered it.
send_sms() returns True when the provider accepted the message.
"""
import base64
import json
import logging
import re
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)


def normalize_phone(phone):
    """Return the last 10 digits of an Indian mobile number, or '' if it has none."""
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:] if len(digits) >= 10 else ''


def mask_phone(phone):
    number = normalize_phone(phone)
    return f"******{number[-4:]}" if number else ''


def _post(url, data, headers):
    request = urllib.request.Request(url, data=data, headers=headers, method='POST')
    with urllib.request.urlopen(request, timeout=10) as response:
        return 200 <= response.status < 300


def _send_fast2sms(number, message):
    payload = urllib.parse.urlencode({'route': 'q', 'message': message, 'numbers': number, 'flash': '0'}).encode()
    return _post('https://www.fast2sms.com/dev/bulkV2', payload, {
        'authorization': settings.FAST2SMS_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
    })


def _send_twilio(number, message):
    sid = settings.TWILIO_ACCOUNT_SID
    token = base64.b64encode(f'{sid}:{settings.TWILIO_AUTH_TOKEN}'.encode()).decode()
    payload = urllib.parse.urlencode({'To': f'+91{number}', 'From': settings.TWILIO_FROM_NUMBER, 'Body': message}).encode()
    return _post(f'https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json', payload, {
        'Authorization': f'Basic {token}',
        'Content-Type': 'application/x-www-form-urlencoded',
    })


def send_sms(phone, message):
    number = normalize_phone(phone)
    if not number:
        logger.warning('SMS not sent: no valid mobile number')
        return False

    backend = settings.SMS_BACKEND
    try:
        if backend == 'fast2sms':
            return _send_fast2sms(number, message)
        if backend == 'twilio':
            return _send_twilio(number, message)
        # console backend: the message (and OTP in it) only goes to the server log
        logger.warning('[SMS console] to %s: %s', mask_phone(number), message)
        return True
    except Exception:  # network / provider errors
        logger.exception('SMS send failed via %s', backend)
        return False
