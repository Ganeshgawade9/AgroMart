import { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { formatPrice, formatDate } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState({});
  const [delivering, setDelivering] = useState(null);

  const fetchOrders = () => {
    axios.get(`${BASE}/orders/delivery/my-deliveries/`, { headers: authHeader() })
      .then(r => setOrders(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchOrders(); }, []);

  const handleDeliver = async (orderId) => {
    const otp = otpInput[orderId];
    if (!otp || otp.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    setDelivering(orderId);
    try {
      await axios.post(`${BASE}/orders/delivery/${orderId}/deliver/`, { otp }, { headers: authHeader() });
      toast.success('Order delivered! ✅');
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setDelivering(null); }
  };

  const openNav = (order) => {
    const q = encodeURIComponent(`${order.delivery_address}, ${order.delivery_village}, ${order.delivery_district}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  const active = orders.filter(o => o.status === 'out_for_delivery');
  const done = orders.filter(o => o.status === 'delivered');

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Truck className="w-6 h-6 text-primary-600" /> Delivery Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[['Active', active.length, 'bg-blue-100 text-blue-700'],['Delivered', done.length,'bg-green-100 text-green-700'],['Total', orders.length,'bg-gray-100 text-gray-700']].map(([l,v,c]) => (
          <div key={l} className="card text-center"><p className={`text-2xl font-bold`}>{v}</p><p className="text-xs text-gray-500">{l}</p></div>
        ))}
      </div>
      <h2 className="font-bold text-gray-900 mb-3">Active Deliveries ({active.length})</h2>
      {active.length === 0 ? <div className="card text-center py-10 text-gray-400 mb-6"><p>No active deliveries</p></div> : (
        <div className="space-y-4 mb-8">
          {active.map(order => (
            <div key={order.id} className="card border-l-4 border-l-blue-500">
              <div className="flex justify-between mb-3">
                <p className="font-bold text-gray-900">#{order.order_number}</p>
                <span className="badge-blue">Out for Delivery</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm">
                <p className="text-gray-600">{order.delivery_address}</p>
                <p className="text-xs text-gray-500">📞 {order.delivery_phone}</p>
              </div>
              <button onClick={() => openNav(order)} className="w-full flex items-center justify-center gap-2 border border-primary-300 text-primary-700 rounded-xl py-2 text-sm font-medium hover:bg-primary-50 mb-3">
                <MapPin className="w-4 h-4" /> Open Navigation
              </button>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-green-800 mb-2">Confirm Delivery (OTP from farmer)</p>
                <div className="flex gap-2">
                  <input value={otpInput[order.id] || ''} onChange={e => setOtpInput(p => ({...p, [order.id]: e.target.value.replace(/\D/g,'').slice(0,6)}))}
                    placeholder="6-digit OTP" maxLength={6}
                    className="flex-1 border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-mono tracking-widest" />
                  <button onClick={() => handleDeliver(order.id)} disabled={delivering === order.id || otpInput[order.id]?.length !== 6}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40">
                    {delivering === order.id ? '...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {done.length > 0 && (
        <><h2 className="font-bold text-gray-900 mb-3">Completed ({done.length})</h2>
        <div className="space-y-3">{done.slice(0,5).map(o => (
          <div key={o.id} className="card flex justify-between opacity-70">
            <div><p className="font-medium text-sm">#{o.order_number}</p><p className="text-xs text-gray-500">{formatDate(o.created_at)}</p></div>
            <div className="text-right"><p className="font-semibold text-sm">{formatPrice(o.total)}</p><span className="badge-green">Delivered</span></div>
          </div>
        ))}</div></>
      )}
    </div>
  );
}
