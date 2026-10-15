"""Minimal SMS sender used for OTPs.

Pick the provider with the SMS_BACKEND setting:
  console  - log the message only (default, for development). NOTHING is sent
             to a phone: the OTP only appears in the server log.
  fast2sms - Fast2SMS Quick SMS route (Indian numbers)
  twilio   - Twilio Messages API

Never raises: a failed SMS must not break the request that triggered it.
send_sms() returns True only when the provider accepted the message, and logs
the provider's reason when it did not (wrong key, empty wallet, ...).
"""
import base64
import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

_INDIAN_MOBILE = re.compile(r'[6-9]\d{9}')


def normalize_phone(phone):
    """Return the 10-digit Indian mobile number in `phone`, or '' if it is not a valid one.

    Accepts the usual ways of typing it: 9876543210, 09876543210,
    +91 98765 43210, 91-98765-43210. Anything else (too short, too long,
    landline, not starting with 6-9) gives '' so an OTP is never sent to a
    wrong or made-up number.
    """
    digits = re.sub(r'\D', '', str(phone or ''))
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    return digits if _INDIAN_MOBILE.fullmatch(digits) else ''


def mask_phone(phone):
    number = normalize_phone(phone)
    return f"******{number[-4:]}" if number else ''


def _provider_error(exc):
    """Short, secret-free reason from a provider's HTTP error response."""
    try:
        body = json.loads(exc.read().decode('utf-8', 'replace'))
    except Exception:
        return f'HTTP {exc.code}'
    message = body.get('message') or body.get('error') or ''
    if isinstance(message, list):
        message = '; '.join(str(m) for m in message)
    code = body.get('status_code') or body.get('code')
    return ' '.join(str(part) for part in (f'HTTP {exc.code}', code and f'(code {code})', message) if part)


def _post(url, data, headers):
    request = urllib.request.Request(url, data=data, headers=headers, method='POST')
    with urllib.request.urlopen(request, timeout=10) as response:
        raw = response.read().decode('utf-8', 'replace')
        if not 200 <= response.status < 300:
            return False, f'HTTP {response.status}'
    try:
        body = json.loads(raw)
    except ValueError:
        return True, ''
    # Fast2SMS answers {"return": true|false, "message": [...]}
    if isinstance(body, dict) and body.get('return') is False:
        message = body.get('message')
        return False, '; '.join(map(str, message)) if isinstance(message, list) else str(message or 'rejected')
    return True, ''


def _send_fast2sms(number, message):
    if not settings.FAST2SMS_API_KEY:
        return False, 'FAST2SMS_API_KEY is not set'
    payload = urllib.parse.urlencode({'route': 'q', 'message': message, 'numbers': number, 'flash': '0'}).encode()
    return _post('https://www.fast2sms.com/dev/bulkV2', payload, {
        'authorization': settings.FAST2SMS_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
    })


def _send_twilio(number, message):
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER):
        return False, 'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are not all set'
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
        tail = re.sub(r'\D', '', str(phone or ''))[-4:]
        logger.warning('SMS not sent: not a valid Indian mobile number (ends with %s)', tail or 'nothing')
        return False

    backend = settings.SMS_BACKEND
    try:
        if backend == 'fast2sms':
            ok, reason = _send_fast2sms(number, message)
        elif backend == 'twilio':
            ok, reason = _send_twilio(number, message)
        elif backend == 'console':
            # Development only: the message (and the OTP in it) goes to the server log, not to a phone
            logger.warning('[SMS console] to %s: %s', mask_phone(number), message)
            return True
        else:
            logger.error('SMS not sent: unknown SMS_BACKEND %r (use console, fast2sms or twilio)', backend)
            return False
    except urllib.error.HTTPError as exc:
        ok, reason = False, _provider_error(exc)
    except Exception as exc:  # network down, timeout, DNS ...
        ok, reason = False, f'{type(exc).__name__}: {exc}'

    if ok:
        logger.info('SMS sent via %s to %s', backend, mask_phone(number))
    else:
        logger.error('SMS to %s via %s FAILED: %s', mask_phone(number), backend, reason)
    return ok
