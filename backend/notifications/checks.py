from django.conf import settings
from django.core.checks import Warning, register


@register()
def sms_backend_check(app_configs, **kwargs):
    """Warn at startup when OTPs cannot actually reach anyone's phone."""
    backend = settings.SMS_BACKEND
    if backend == 'console':
        return [Warning(
            "SMS_BACKEND is 'console': OTPs are only written to the server log and are NOT sent to users' mobile numbers.",
            hint="Use Firebase Phone Auth in frontend, or set SMS_BACKEND=twilio in backend/.env.",
            id='notifications.W001',
        )]
    if backend == 'twilio' and not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER):
        return [Warning('SMS_BACKEND=twilio but the Twilio keys are not all set, so no OTP can be sent.', id='notifications.W003')]
    if backend not in ('firebase', 'twilio', 'console'):
        return [Warning(f'Unknown SMS_BACKEND {backend!r}: use console, firebase, or twilio.', id='notifications.W004')]
    return []

