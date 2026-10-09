from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import PasswordResetOTP

User = get_user_model()


class PasswordResetOtpTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='farmer@example.com', password='oldpass1', full_name='Farmer', role='farmer', phone='+91 98765 43210')
        self.client = APIClient()

    def request_otp(self, identifier='farmer@example.com'):
        with mock.patch('accounts.otp.send_sms') as sms:
            response = self.client.post('/api/auth/forgot-password/', {'identifier': identifier}, format='json')
        return response, sms

    def code_from(self, sms):
        message = sms.call_args.args[1]
        return next(word for word in message.split() if word.isdigit() and len(word) == 6)

    def reset(self, otp, password='newpass1', identifier='farmer@example.com'):
        return self.client.post('/api/auth/reset-password/', {
            'identifier': identifier, 'otp': otp, 'new_password': password, 'new_password2': password}, format='json')

    def test_otp_is_sent_to_registered_mobile_and_resets_password(self):
        response, sms = self.request_otp()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(sms.call_args.args[0], '+91 98765 43210')
        code = self.code_from(sms)

        self.assertEqual(self.reset(code).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpass1'))
        # Cannot be replayed
        self.assertEqual(self.reset(code, password='another1').status_code, 400)

    def test_can_request_by_mobile_number(self):
        response, sms = self.request_otp('9876543210')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(sms.called)

    def test_unknown_account_gets_same_response_and_no_sms(self):
        response, sms = self.request_otp('nobody@example.com')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(sms.called)
        known, _ = self.request_otp()
        self.assertEqual(response.json(), known.json())

    def test_account_without_mobile_gets_no_sms(self):
        User.objects.filter(pk=self.user.pk).update(phone='')
        response, sms = self.request_otp()
        self.assertEqual(response.status_code, 200)
        self.assertFalse(sms.called)

    def test_wrong_otp_is_rejected_and_locks_after_five_attempts(self):
        _, sms = self.request_otp()
        code = self.code_from(sms)
        wrong = '000000' if code != '000000' else '111111'
        for _ in range(5):
            self.assertEqual(self.reset(wrong).status_code, 400)
        self.assertEqual(self.reset(code).status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('oldpass1'))

    def test_expired_otp_is_rejected(self):
        _, sms = self.request_otp()
        PasswordResetOTP.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.reset(self.code_from(sms)).status_code, 400)

    def test_requests_are_throttled_and_newest_otp_wins(self):
        _, first = self.request_otp()
        _, second = self.request_otp()
        self.assertFalse(second.called)  # within the resend window
        PasswordResetOTP.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        _, third = self.request_otp()
        self.assertTrue(third.called)
        self.assertEqual(self.reset(self.code_from(first)).status_code, 400)
        self.assertEqual(self.reset(self.code_from(third)).status_code, 200)

    def test_otp_is_not_stored_in_plain_text_or_returned(self):
        response, sms = self.request_otp()
        code = self.code_from(sms)
        self.assertNotIn(code, response.content.decode())
        self.assertNotEqual(PasswordResetOTP.objects.get().code_hash, code)

    def test_passwords_must_match(self):
        _, sms = self.request_otp()
        response = self.client.post('/api/auth/reset-password/', {
            'identifier': 'farmer@example.com', 'otp': self.code_from(sms),
            'new_password': 'newpass1', 'new_password2': 'different'}, format='json')
        self.assertEqual(response.status_code, 400)
