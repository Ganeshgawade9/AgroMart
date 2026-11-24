import io
import json
import urllib.error
from unittest import mock

from django.test import SimpleTestCase, override_settings

from . import sms


def fake_response(status=200, body=None):
    response = mock.MagicMock()
    response.status = status
    response.read.return_value = json.dumps(body if body is not None else {}).encode()
    response.__enter__.return_value = response
    return response


def http_error(code, body):
    return urllib.error.HTTPError('https://x', code, 'err', {}, io.BytesIO(json.dumps(body).encode()))


class NormalizePhoneTests(SimpleTestCase):
    def test_accepts_the_usual_ways_of_typing_an_indian_mobile(self):
        for typed in ('9876543210', '09876543210', '+91 98765 43210', '91-98765-43210', '+919876543210', ' 98765 43210 '):
            self.assertEqual(sms.normalize_phone(typed), '9876543210', typed)

    def test_rejects_numbers_that_cannot_receive_an_sms(self):
        for typed in ('', None, '12345', '98765', '5876543210', '1234567890', '98765432101234', '+1 415 555 0100',
                      '0141-2345678', 'abcdefghij'):
            self.assertEqual(sms.normalize_phone(typed), '', repr(typed))


@override_settings(SMS_BACKEND='firebase')
class FirebaseBackendTests(SimpleTestCase):
    def test_firebase_backend_logs_message_and_returns_true(self):
        with self.assertLogs('notifications.sms', level='WARNING') as logs:
            result = sms.send_sms('+91 98765 43210', 'hello 123456')
        self.assertTrue(result)
        self.assertIn('******3210', logs.output[0])


    def test_invalid_number_is_never_sent(self):
        self.assertFalse(sms.send_sms('12345', 'hello'))
        self.assertFalse(sms.send_sms('', 'hello'))



class OtherBackendTests(SimpleTestCase):
    @override_settings(SMS_BACKEND='twilio', TWILIO_ACCOUNT_SID='', TWILIO_AUTH_TOKEN='', TWILIO_FROM_NUMBER='')
    def test_twilio_without_keys_fails_clearly(self):
        with self.assertLogs('notifications.sms', level='ERROR') as logs:
            self.assertFalse(sms.send_sms('9876543210', 'hello'))
        self.assertIn('TWILIO', logs.output[0])

    @override_settings(SMS_BACKEND='carrier-pigeon')
    def test_unknown_backend_fails_instead_of_pretending_to_send(self):
        with self.assertLogs('notifications.sms', level='ERROR'):
            self.assertFalse(sms.send_sms('9876543210', 'hello'))

    @override_settings(SMS_BACKEND='console')
    def test_console_backend_only_logs(self):
        with self.assertLogs('notifications.sms', level='WARNING') as logs:
            self.assertTrue(sms.send_sms('9876543210', 'otp 111222'))
        self.assertIn('******3210', logs.output[0])
        self.assertNotIn('9876543210', logs.output[0])
