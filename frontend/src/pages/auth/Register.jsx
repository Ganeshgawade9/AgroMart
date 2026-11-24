import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, ShieldCheck, Smartphone, ArrowLeft, RotateCcw, X, CheckCircle2, Navigation } from 'lucide-react';
import { register, sendRegisterOtp } from '../../api/auth';
import { auth, RecaptchaVerifier, signInWithPhoneNumber, isFirebaseConfigured } from '../../firebase';
import useAuthStore from '../../store/authStore';
import { reverseGeocodeDetails } from '../../utils/geocode';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'farmer', label: '🌾 Farmer', desc: 'Buy fertilizers & pesticides' },
  { value: 'seller', label: '🏪 Seller', desc: 'Sell agro products' },
  { value: 'delivery', label: '🚚 Delivery Partner', desc: 'Deliver orders' },
];

const isValidMobile = (value) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits);
};

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({
    email: '',
    password: '',
    password2: '',
    full_name: '',
    phone: '',
    role: 'farmer',
    village: '',
    taluka: '',
    district: '',
    pincode: '',
    shop_name: '',
  });
  const [otp, setOtp] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetectingLoc(true);
    const toastId = toast.loading('Detecting location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const details = await reverseGeocodeDetails(lat, lng);
          if (details) {
            setForm((prev) => ({
              ...prev,
              ...(details.village && { village: details.village }),
              ...(details.taluka && { taluka: details.taluka }),
              ...(details.district && { district: details.district }),
              ...(details.pincode && { pincode: details.pincode }),
            }));
            const label = [details.village || details.taluka, details.district].filter(Boolean).join(', ');
            toast.success(`Location detected: ${label}`, { id: toastId });
          } else {
            toast.error('Could not load address details', { id: toastId });
          }
        } catch {
          toast.error('Failed to detect location', { id: toastId });
        } finally {
          setDetectingLoc(false);
        }
      },
      (err) => {
        let msg = 'Could not get location';
        if (err.code === 1) msg = 'Location access denied by browser';
        toast.error(msg, { id: toastId });
        setDetectingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };


  const validateForm = () => {
    if (!form.full_name.trim()) { toast.error('Please enter your full name'); return false; }
    if (!form.email.trim()) { toast.error('Please enter your email'); return false; }
    if (!isValidMobile(form.phone)) {
      toast.error('Enter a valid 10-digit Indian mobile number (starting with 6-9)');
      return false;
    }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters long'); return false; }
    if (form.password !== form.password2) { toast.error('Passwords do not match'); return false; }
    if (form.role === 'seller' && !form.shop_name.trim()) {
      toast.error('Shop name is required for sellers');
      return false;
    }
    return true;
  };

  // Always create a fresh RecaptchaVerifier — stale ones cause "reCAPTCHA has already been rendered" errors
  const getRecaptchaVerifier = () => {
    if (!auth) return null;
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch {}
      window.recaptchaVerifier = null;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => { window.recaptchaVerifier = null; },
    });
    return window.recaptchaVerifier;
  };

  const sendFirebaseOtp = async (phoneNumber) => {
    if (!isFirebaseConfigured || !auth) return null;
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    try {
      const appVerifier = getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(auth, `+91${cleanPhone}`, appVerifier);
      window.confirmationResult = result;
      return result;
    } catch (err) {
      console.error('[Firebase] signInWithPhoneNumber error:', err);
      window.recaptchaVerifier = null;
      window.confirmationResult = null;
      throw err;
    }
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      // 1. Backend: duplicate-check + throttle + record OTP request
      const res = await sendRegisterOtp({ phone: form.phone, email: form.email });
      setMaskedPhone(res.data?.phone_masked || form.phone);
      if (res.data?.dev_otp) setDevOtp(res.data.dev_otp);
      setResendCooldown(res.data?.resend_seconds || 60);

      // 2. Firebase: actually send the SMS OTP to the user's phone
      if (isFirebaseConfigured && auth) {
        try {
          await sendFirebaseOtp(form.phone);
          toast.success(`OTP sent to ${res.data?.phone_masked || form.phone} via SMS!`);
        } catch (fbErr) {
          console.warn('[Firebase] SMS failed:', fbErr.message);
          toast(res.data?.dev_otp
            ? 'Firebase SMS failed — use the Dev OTP shown below.'
            : `Firebase error: ${fbErr.message}`,
            { icon: '⚠️' });
        }
      } else {
        toast.success(res.data?.message || 'OTP sent! (Check server terminal in dev mode)');
      }
      setShowOtpModal(true);
    } catch (err) {
      const msg = err.response?.data?.error
        || (typeof err.response?.data === 'string' ? err.response?.data : null)
        || 'Failed to send OTP. Check your mobile number and try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await sendRegisterOtp({ phone: form.phone, email: form.email });
      if (res.data?.dev_otp) setDevOtp(res.data.dev_otp);
      setResendCooldown(res.data?.resend_seconds || 60);
      if (isFirebaseConfigured && auth) {
        try {
          await sendFirebaseOtp(form.phone);
          toast.success('New OTP sent to your phone!');
        } catch {
          toast.error('SMS resend failed. Please wait a moment and try again.');
        }
      } else {
        toast.success(res.data?.message || 'New OTP sent!');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    setVerifying(true);
    try {
      let firebaseToken = '';
      if (isFirebaseConfigured && window.confirmationResult) {
        try {
          const credential = await window.confirmationResult.confirm(otp.trim());
          firebaseToken = await credential.user.getIdToken();
        } catch (fbErr) {
          console.error('[Firebase] OTP confirm error:', fbErr);
          toast.error('Invalid OTP. Please check the code sent to your phone.');
          setVerifying(false);
          return;
        }
      }

      const res = await register({ ...form, otp: otp.trim(), firebase_token: firebaseToken });
      const { user, tokens } = res.data;
      setShowOtpModal(false);

      if (user.role === 'seller') {
        toast.success('Registration successful! Waiting for admin approval.');
        navigate('/login');
      } else {
        setAuth(user, tokens.access, tokens.refresh);
        toast.success(`Welcome to AgroConnect, ${user.full_name?.split(' ')[0]}!`);
        navigate(user.role === 'farmer' ? '/farmer/dashboard' : '/delivery/dashboard');
      }
    } catch (err) {
      const errors = err.response?.data;
      if (errors?.otp) {
        toast.error(Array.isArray(errors.otp) ? errors.otp[0] : errors.otp);
      } else if (errors?.firebase_token) {
        toast.error(Array.isArray(errors.firebase_token) ? errors.firebase_token[0] : errors.firebase_token);
      } else if (errors) {
        toast.error(Object.values(errors).flat().join(', ') || 'Registration failed');
      } else {
        toast.error('Registration failed. Please check your OTP.');
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center p-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl text-primary-700">AgroConnect</span>
        </div>
        <h1 className="text-xl font-bold text-center mb-1">Create Account</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Register with your verified mobile number</p>

        <form onSubmit={handleInitialSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">I am a...</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('role', r.value)}
                  className={`border-2 rounded-xl p-3 text-center transition-all ${
                    form.role === r.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <div className="text-xl mb-1">{r.label.split(' ')[0]}</div>
                  <div className="text-xs font-semibold text-gray-800">{r.label.split(' ').slice(1).join(' ')}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
              <input className="input" placeholder="Your full name" value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input className="input" type="email" placeholder="email@example.com" value={form.email}
                onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mobile number</label>
              <input className="input" type="tel" inputMode="numeric" placeholder="9876543210" value={form.phone}
                onChange={(e) => set('phone', e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 16))} required />
              <p className="text-[11px] text-gray-500 mt-1">An OTP will be sent to this number.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
              <input className="input" type="password" placeholder="Min 6 chars" value={form.password}
                onChange={(e) => set('password', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Confirm Password</label>
              <input className="input" type="password" placeholder="Repeat password" value={form.password2}
                onChange={(e) => set('password2', e.target.value)} required />
            </div>
          </div>

          {form.role === 'seller' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Shop Name</label>
              <input className="input" placeholder="e.g. Ganesh Agro Center" value={form.shop_name}
                onChange={(e) => set('shop_name', e.target.value)} required />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location (Optional)</span>
              <button
                type="button"
                onClick={handleAutoDetectLocation}
                disabled={detectingLoc}
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <Navigation className={`w-3 h-3 ${detectingLoc ? 'animate-spin' : ''}`} />
                {detectingLoc ? 'Detecting...' : 'Auto-detect'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['village', 'taluka', 'district'].map((field) => (
                <div key={field}>
                  <label className="text-sm font-medium text-gray-700 block mb-1 capitalize">{field}</label>
                  <input className="input" placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                    value={form[field]} onChange={(e) => set(field, e.target.value)} />
                </div>
              ))}
            </div>
          </div>


          <button type="submit" disabled={loading}
            className="btn-primary w-full py-2.5 text-base flex items-center justify-center gap-2">
            <Smartphone className="w-5 h-5" />
            {loading ? 'Sending OTP...' : 'Verify Mobile & Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">Login</Link>
        </p>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Verify Mobile OTP</h3>
                  <p className="text-xs text-gray-500">Sent to {maskedPhone || form.phone}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowOtpModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {devOtp && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                <span>Dev OTP: <strong className="font-mono text-sm tracking-wider">{devOtp}</strong></span>
                <button type="button" onClick={() => setOtp(devOtp)}
                  className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 rounded font-semibold text-[11px]">
                  Auto-fill
                </button>
              </div>
            )}

            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 block mb-1.5">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input font-mono tracking-widest text-xl text-center font-bold text-primary-700 h-12"
                  autoFocus
                  required
                />
              </div>

              <button type="submit" disabled={verifying || otp.length !== 6}
                className="btn-primary w-full py-2.5 text-base flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {verifying ? 'Verifying & Creating...' : 'Verify & Complete Registration'}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button type="button" onClick={() => setShowOtpModal(false)}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Change Number
                </button>
                {resendCooldown > 0 ? (
                  <span className="text-gray-400">Resend in <strong className="text-gray-600">{resendCooldown}s</strong></span>
                ) : (
                  <button type="button" onClick={handleResendOtp} disabled={loading}
                    className="text-primary-600 font-semibold hover:underline flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" /> Resend OTP
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚠️ REQUIRED by Firebase Phone Auth — do NOT remove this div */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
