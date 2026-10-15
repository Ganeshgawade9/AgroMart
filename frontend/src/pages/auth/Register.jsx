import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { register } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'farmer', label: '🌾 Farmer', desc: 'Buy fertilizers & pesticides' },
  { value: 'seller', label: '🏪 Seller', desc: 'Sell agro products' },
  { value: 'delivery', label: '🚚 Delivery Partner', desc: 'Deliver orders' },
];

// Same rule as the server: an Indian mobile, optionally with +91 / 0 in front
const isValidMobile = (value) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits);
};

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email:'', password:'', password2:'', full_name:'', phone:'', role:'farmer', village:'', taluka:'', district:'', pincode:'', shop_name:'' });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) { toast.error('Passwords do not match'); return; }
    if (!isValidMobile(form.phone)) { toast.error('Enter a valid 10-digit mobile number. OTPs are sent to it.'); return; }
    setLoading(true);
    try {
      const res = await register(form);
      const { user, tokens } = res.data;
      if (user.role === 'seller') {
        toast.success('Registration successful! Waiting for admin approval.');
        navigate('/login');
      } else {
        setAuth(user, tokens.access, tokens.refresh);
        toast.success('Registration successful!');
        navigate(user.role === 'farmer' ? '/farmer/dashboard' : '/delivery/dashboard');
      }
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        const msg = Object.values(errors).flat().join(', ');
        toast.error(msg || 'Registration failed');
      } else {
        toast.error('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center p-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl text-primary-700">AgroConnect</span>
        </div>
        <h1 className="text-xl font-bold text-center mb-6">Create Account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">I am a...</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => set('role', r.value)}
                  className={`border-2 rounded-xl p-3 text-center transition-all ${form.role === r.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
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
              <input className="input" placeholder="Your full name" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input className="input" type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mobile number</label>
              <input className="input" type="tel" inputMode="numeric" placeholder="9876543210" value={form.phone}
                onChange={e => set('phone', e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 16))} required />
              <p className="text-xs text-gray-500 mt-1">OTPs (password reset, delivery) are sent to this number, so use your own active mobile.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
              <input className="input" type="password" placeholder="Min 6 chars" value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Confirm Password</label>
              <input className="input" type="password" placeholder="Repeat password" value={form.password2} onChange={e => set('password2', e.target.value)} required />
            </div>
          </div>

          {form.role === 'seller' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Shop Name</label>
              <input className="input" placeholder="e.g. Ganesh Agro Center" value={form.shop_name} onChange={e => set('shop_name', e.target.value)} required />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Village</label>
              <input className="input" placeholder="Village" value={form.village} onChange={e => set('village', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Taluka</label>
              <input className="input" placeholder="Taluka" value={form.taluka} onChange={e => set('taluka', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">District</label>
              <input className="input" placeholder="District" value={form.district} onChange={e => set('district', e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account? <Link to="/login" className="text-primary-600 font-semibold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
