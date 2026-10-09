import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, MapPin, Package, Bell, ArrowRight, Clock } from 'lucide-react';
import { getMyOrders } from '../../api/orders';
import { getCart } from '../../api/products';
import { formatPrice, formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import useAuthStore from '../../store/authStore';
import Spinner from '../../components/common/Spinner';

export default function FarmerDashboard() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyOrders(), getCart()]).then(([ordRes, cartRes]) => {
      setOrders(ordRes.data.results || ordRes.data);
      setCartCount(cartRes.data.count || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const stats = [
    { icon: <Package className="w-6 h-6" />, label: 'Total Orders', value: orders.length, color: 'bg-blue-100 text-blue-600', link: '/farmer/orders' },
    { icon: <ShoppingBag className="w-6 h-6" />, label: 'Cart Items', value: cartCount, color: 'bg-green-100 text-green-600', link: '/farmer/cart' },
    { icon: <Clock className="w-6 h-6" />, label: 'Active Orders', value: orders.filter(o => !['delivered','cancelled'].includes(o.status)).length, color: 'bg-orange-100 text-orange-600', link: '/farmer/orders' },
    { icon: <Heart className="w-6 h-6" />, label: 'Wishlist', value: '—', color: 'bg-red-100 text-red-600', link: '/farmer/wishlist' },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.full_name?.split(' ')[0]}! 👋</h1>
        <p className="text-gray-500 text-sm mt-0.5">{user?.village}, {user?.district}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Link key={s.label} to={s.link} className="card hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2.5 rounded-xl ${s.color} mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {[
          { to: '/products', emoji: '🛒', label: 'Browse Products' },
          { to: '/nearby-shops', emoji: '📍', label: 'Nearby Shops' },
          { to: '/farmer/cart', emoji: '🛍️', label: 'My Cart' },
          { to: '/farmer/orders', emoji: '📦', label: 'My Orders' },
          { to: '/farmer/wishlist', emoji: '❤️', label: 'Wishlist' },
          { to: '/notifications', emoji: '🔔', label: 'Notifications' },
        ].map(a => (
          <Link key={a.to} to={a.to} className="card flex items-center gap-3 hover:shadow-md transition-shadow hover:border-primary-200">
            <span className="text-2xl">{a.emoji}</span>
            <span className="font-medium text-gray-700 text-sm">{a.label}</span>
            <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Recent Orders</h2>
          <Link to="/farmer/orders" className="text-sm text-primary-600 hover:underline">View all</Link>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No orders yet</p>
            <Link to="/products" className="btn-primary inline-block mt-3 text-sm">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map(order => (
              <Link key={order.id} to={`/farmer/orders/${order.id}`}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-900 text-sm">#{order.order_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.created_at)} · {order.seller_shop_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm">{formatPrice(order.total)}</p>
                  <span className={`${getStatusColor(order.status)} inline-block mt-0.5`}>{getStatusLabel(order.status)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
