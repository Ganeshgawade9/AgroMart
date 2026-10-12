import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { forgotPassword, resetPassword } from '../../api/auth';
import { useT } from '../../i18n';
import toast from 'react-hot-toast';

// Step 1: enter email or mobile -> OTP is sent by SMS to the registered mobile number
// Step 2: enter OTP + new password
export default function ForgotPassword() {
  const { t } = useT();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [form, setForm] = useState({ otp: '', new_password: '', new_password2: '' });
  const [loading, setLoading] = useState(false);

  const errorMessage = (err, fallback) => {
    const data = err.response?.data;
    if (data?.error) return data.error;
    const first = data && typeof data === 'object' ? Object.values(data)[0] : null;
    return (Array.isArray(first) ? first[0] : first) || fallback;
  };

  const sendOtp = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(identifier.trim());
      toast.success(t('forgot.otp_sent'));
      setStep(2);
    } catch (err) {
      toast.error(errorMessage(err, t('forgot.send_failed')));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.new_password2) {
      toast.error(t('forgot.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ identifier: identifier.trim(), ...form });
      toast.success(t('forgot.done'));
      navigate('/login');
    } catch (err) {
      toast.error(errorMessage(err, t('forgot.reset_failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl text-primary-700">AgroConnect</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">{t('forgot.title')}</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          {step === 1
            ? t('forgot.step1')
            : t('forgot.step2')}
        </p>

        {step === 1 ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('forgot.identifier')}</label>
              <input
                className="input"
                type="text"
                placeholder={t('forgot.identifier_ph')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
              {loading ? t('forgot.sending') : t('forgot.send')}
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('forgot.otp')}</label>
              <input
                className="input font-mono tracking-widest"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={t('forgot.otp_ph')}
                value={form.otp}
                onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('forgot.new_password')}</label>
              <input
                className="input"
                type="password"
                minLength={6}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('forgot.confirm_password')}</label>
              <input
                className="input"
                type="password"
                minLength={6}
                value={form.new_password2}
                onChange={(e) => setForm({ ...form, new_password2: e.target.value })}
                required
              />
            </div>
            <button type="submit" disabled={loading || form.otp.length !== 6} className="btn-primary w-full py-2.5 text-base">
              {loading ? t('forgot.resetting') : t('forgot.reset')}
            </button>
            <button type="button" onClick={sendOtp} disabled={loading} className="w-full text-sm text-primary-600 font-medium hover:underline">
              {t('forgot.resend')}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-4">
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">{t('forgot.back')}</Link>
        </p>
      </div>
    </div>
  );
}
