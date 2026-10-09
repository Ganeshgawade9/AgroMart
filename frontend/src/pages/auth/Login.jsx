import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { login } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form);
      console.log('Login response:', res.data); // debug

      // SimpleJWT returns: { access, refresh, user }
      // Our custom serializer adds 'user' to the response
      const data = res.data;
      const access = data.access || data.tokens?.access;
      const refresh = data.refresh || data.tokens?.refresh;
      const user = data.user;

      if (!access || !user) {
        toast.error('Unexpected server response. Please try again.');
        return;
      }

      setAuth(user, access, refresh);
      toast.success(`Welcome back, ${user.full_name?.split(' ')[0] || 'User'}!`);

      const dashMap = {
        farmer: '/farmer/dashboard',
        seller: '/seller/dashboard',
        delivery: '/delivery/dashboard',
        admin: '/admin/dashboard',
      };
      navigate(dashMap[user.role] || '/');
    } catch (err) {
      console.error('Login error:', err.response?.data);
      // Show exact error from backend
      const errData = err.response?.data;
      let msg = 'Login failed. Check credentials.';
      if (errData?.detail) msg = errData.detail;
      else if (errData?.non_field_errors) msg = errData.non_field_errors[0];
      else if (typeof errData === 'string') msg = errData;
      toast.error(msg);
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
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Welcome Back</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Login to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Quick login helper for testing */}
        <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2">🧪 Quick Test Login:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: '🌾 Farmer', email: 'farmer@agroconnect.in', pass: 'farmer123' },
              { label: '🏪 Seller', email: 'ganesh@agroconnect.in', pass: 'seller123' },
              { label: '🚚 Delivery', email: 'delivery@agroconnect.in', pass: 'delivery123' },
              { label: '🔧 Admin', email: 'admin@agroconnect.in', pass: 'admin123' },
            ].map(u => (
              <button
                key={u.email}
                type="button"
                onClick={() => setForm({ email: u.email, password: u.pass })}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-primary-50 hover:border-primary-300 text-gray-700 transition-colors"
              >
                {u.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Click to fill credentials, then Login</p>
        </div>

        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}