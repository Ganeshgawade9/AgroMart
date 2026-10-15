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


@override_settings(SMS_BACKEND='fast2sms', FAST2SMS_API_KEY='key')
class Fast2SmsTests(SimpleTestCase):
    def send(self, response=None, error=None):
        with mock.patch('notifications.sms.urllib.request.urlopen') as urlopen:
            if error:
                urlopen.side_effect = error
            else:
                urlopen.return_value = response
            result = sms.send_sms('+91 98765 43210', 'hello 123456')
        return result, urlopen

    def test_success_sends_to_the_ten_digit_number(self):
        result, urlopen = self.send(fake_response(body={'return': True, 'request_id': 'r', 'message': ['ok']}))
        self.assertTrue(result)
        request = urlopen.call_args.args[0]
        self.assertIn('numbers=9876543210', request.data.decode())
        self.assertEqual(request.get_header('Authorization'), 'key')

    def test_provider_rejection_is_reported_with_its_reason(self):
        error = http_error(400, {'return': False, 'status_code': 999,
                                 'message': 'Complete a single transaction of at least 100 INR in wallet first'})
        with self.assertLogs('notifications.sms', level='ERROR') as logs:
            result, _ = self.send(error=error)
        self.assertFalse(result)
        self.assertIn('FAILED', logs.output[0])
        self.assertIn('999', logs.output[0])
        self.assertIn('wallet', logs.output[0])

    def test_return_false_with_http_200_is_still_a_failure(self):
        with self.assertLogs('notifications.sms', level='ERROR'):
            result, _ = self.send(fake_response(body={'return': False, 'message': ['Invalid numbers']}))
        self.assertFalse(result)

    def test_network_error_does_not_raise(self):
        with self.assertLogs('notifications.sms', level='ERROR'):
            result, _ = self.send(error=OSError('network down'))
        self.assertFalse(result)

    @override_settings(FAST2SMS_API_KEY='')
    def test_missing_api_key_fails_clearly_without_calling_the_provider(self):
        with self.assertLogs('notifications.sms', level='ERROR') as logs:
            result, urlopen = self.send(fake_response())
        self.assertFalse(result)
        self.assertFalse(urlopen.called)
        self.assertIn('FAST2SMS_API_KEY', logs.output[0])

    def test_invalid_number_is_never_sent_to_the_provider(self):
        with mock.patch('notifications.sms.urllib.request.urlopen') as urlopen:
            self.assertFalse(sms.send_sms('12345', 'hello'))
            self.assertFalse(sms.send_sms('', 'hello'))
        self.assertFalse(urlopen.called)


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
