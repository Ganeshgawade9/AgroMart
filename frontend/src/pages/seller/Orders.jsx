import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSellerOrders, updateOrderStatus } from '../../api/orders';
import { formatPrice, formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

const TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Packed', value: 'packed' },
  { label: 'Out for Delivery', value: 'out_for_delivery' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const NEXT_STATUS = { pending: 'accepted', accepted: 'packed', packed: 'out_for_delivery' };

export default function SellerOrders() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('status') || '');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    getSellerOrders(activeTab).then(r => setOrders(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [activeTab]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order marked as ${getStatusLabel(newStatus)}`);
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); } finally { setUpdating(null); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Orders</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mb-5 bg-gray-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setActiveTab(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No orders found</div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-bold text-gray-900">#{order.order_number}</span>
                  <p className="text-sm text-gray-500 mt-0.5">{formatDate(order.created_at)}</p>
                </div>
                <span className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-600">{order.items_count} item(s)</span>
                <span className="font-bold text-lg text-gray-900">{formatPrice(order.total)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/seller/orders/${order.id}`} className="btn-secondary text-sm py-1.5 px-4">View Details</Link>
                {NEXT_STATUS[order.status] && (
                  <button onClick={() => handleUpdateStatus(order.id, NEXT_STATUS[order.status])}
                    disabled={updating === order.id}
                    className="btn-primary text-sm py-1.5 px-4">
                    {updating === order.id ? '...' : `Mark as ${getStatusLabel(NEXT_STATUS[order.status])}`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
