from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from notifications.sms import mask_phone, normalize_phone, send_sms


class Command(BaseCommand):
    help = (
        "Send one test SMS to check that OTP delivery works, e.g. "
        "`python manage.py send_test_sms 9876543210`. "
        "If it fails, the provider's reason is printed in the log lines above the result."
    )

    def add_arguments(self, parser):
        parser.add_argument('phone', help='Mobile number to send the test message to')

    def handle(self, *args, **options):
        number = normalize_phone(options['phone'])
        if not number:
            raise CommandError('Not a valid 10-digit Indian mobile number (must start with 6-9).')

        backend = settings.SMS_BACKEND
        self.stdout.write(f'SMS_BACKEND = {backend}')
        if backend == 'console':
            self.stdout.write(self.style.WARNING(
                "SMS_BACKEND is 'console': the message is only written to the server log and "
                "will NOT reach the phone. Set SMS_BACKEND=fast2sms (or twilio) and its keys in backend/.env."))

        ok = send_sms(number, 'AgroConnect: this is a test message. Your OTP setup works.')
        if ok and backend != 'console':
            self.stdout.write(self.style.SUCCESS(f'Provider accepted the message for {mask_phone(number)}. Check the phone.'))
        elif ok:
            self.stdout.write(self.style.WARNING('Logged only (console backend).'))
        else:
            raise CommandError('SMS was NOT sent. See the "FAILED" line above for the provider reason.')
