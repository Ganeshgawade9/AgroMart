import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, ShieldCheck, KeyRound } from 'lucide-react';
import { forgotPassword, resetPassword } from '../../api/auth';
import { auth, RecaptchaVerifier, signInWithPhoneNumber, isFirebaseConfigured } from '../../firebase';
import { useT } from '../../i18n';
import toast from 'react-hot-toast';

// Step 1: enter email or mobile -> backend looks up the account, Firebase sends SMS OTP
// Step 2: enter OTP + new password -> reset complete
export default function ForgotPassword() {
  const { t } = useT();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [form, setForm] = useState({ otp: '', new_password: '', new_password2: '' });
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const errorMessage = (err, fallback) => {
    const data = err.response?.data;
    if (data?.error) return data.error;
    const first = data && typeof data === 'object' ? Object.values(data)[0] : null;
    return (Array.isArray(first) ? first[0] : first) || fallback;
  };

  const getRecaptchaVerifier = () => {
    if (!auth) return null;
    if (window.recaptchaVerifierFP) {
      try { window.recaptchaVerifierFP.clear(); } catch {}
      window.recaptchaVerifierFP = null;
    }
    window.recaptchaVerifierFP = new RecaptchaVerifier(auth, 'recaptcha-container-fp', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => { window.recaptchaVerifierFP = null; },
    });
    return window.recaptchaVerifierFP;
  };

  const sendFirebaseOtp = async (phone) => {
    if (!isFirebaseConfigured || !auth || !phone) return null;
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    try {
      const verifier = getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(auth, `+91${cleanPhone}`, verifier);
      window.confirmationResultFP = result;
      return result;
    } catch (err) {
      console.error('[Firebase ForgotPwd] signInWithPhoneNumber error:', err);
      window.recaptchaVerifierFP = null;
      window.confirmationResultFP = null;
      throw err;
    }
  };

  const sendOtp = async (e) => {
    e?.preventDefault();
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      // Step 1: backend identifies account, sends OTP to console, returns masked phone
      const res = await forgotPassword(identifier.trim());
      const phone = res.data?.phone || res.data?.phone_masked || '';
      const masked = res.data?.phone_masked || '';
      setMaskedPhone(masked);
      if (res.data?.dev_otp) setDevOtp(res.data.dev_otp);
      setResendCooldown(res.data?.resend_seconds || 60);

      // Step 2: Firebase sends REAL SMS OTP to the registered phone
      if (isFirebaseConfigured && auth && phone && !phone.includes('*')) {
        try {
          await sendFirebaseOtp(phone);
          toast.success(`OTP sent to ${masked || phone} via SMS!`);
        } catch (fbErr) {
          console.warn('[Firebase] Forgot-pwd SMS failed:', fbErr.message);
          toast(res.data?.dev_otp
            ? 'Firebase SMS failed. Use the Dev OTP shown below.'
            : `Firebase error: ${fbErr.message}`,
            { icon: '⚠️' });
        }
      } else {
        toast.success(res.data?.message || t('forgot.otp_sent'));
      }
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
      let firebaseToken = '';
      // If Firebase sent the OTP, verify it with Firebase to get ID token
      if (isFirebaseConfigured && window.confirmationResultFP) {
        try {
          const credential = await window.confirmationResultFP.confirm(form.otp.trim());
          firebaseToken = await credential.user.getIdToken();
        } catch (fbErr) {
          console.error('[Firebase] Confirm error:', fbErr);
          toast.error('Invalid OTP. Please check the code sent to your phone.');
          setLoading(false);
          return;
        }
      }

      await resetPassword({ identifier: identifier.trim(), ...form, firebase_token: firebaseToken });
      toast.success(t('forgot.done'));
      navigate('/login');
    } catch (err) {
      toast.error(errorMessage(err, t('forgot.reset_failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center p-4">
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
            : (maskedPhone
                ? `Enter the 6-digit OTP sent to your registered mobile (${maskedPhone})`
                : t('forgot.step2'))}
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
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 text-base flex items-center justify-center gap-2">
              <KeyRound className="w-4 h-4" />
              {loading ? t('forgot.sending') : t('forgot.send')}
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="space-y-4">
            {devOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                <span>Dev OTP: <strong className="font-mono text-sm tracking-wider">{devOtp}</strong></span>
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, otp: devOtp }))}
                  className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 rounded font-semibold text-[11px]">
                  Auto-fill
                </button>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('forgot.otp')}</label>
              <input
                className="input font-mono tracking-widest text-lg text-center font-bold text-primary-700"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={form.otp}
                onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('forgot.new_password')}</label>
              <input className="input" type="password" minLength={6}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('forgot.confirm_password')}</label>
              <input className="input" type="password" minLength={6}
                value={form.new_password2}
                onChange={(e) => setForm({ ...form, new_password2: e.target.value })}
                required />
            </div>
            <button type="submit" disabled={loading || form.otp.length !== 6}
              className="btn-primary w-full py-2.5 text-base flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              {loading ? t('forgot.resetting') : t('forgot.reset')}
            </button>
            <div className="text-center pt-1">
              {resendCooldown > 0 ? (
                <span className="text-xs text-gray-400">
                  Resend OTP in <strong className="font-semibold text-gray-600">{resendCooldown}s</strong>
                </span>
              ) : (
                <button type="button" onClick={sendOtp} disabled={loading}
                  className="text-sm text-primary-600 font-medium hover:underline">
                  {t('forgot.resend')}
                </button>
              )}
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-4">
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">{t('forgot.back')}</Link>
        </p>
      </div>

      {/* ⚠️ REQUIRED by Firebase Phone Auth — do NOT remove this div */}
      <div id="recaptcha-container-fp"></div>
    </div>
  );
}
