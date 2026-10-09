import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { getMyOrders } from '../../api/orders';
import { formatPrice, formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';

export default function FarmerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders().then(r => setOrders(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No orders yet</p>
          <Link to="/products" className="btn-primary inline-block mt-4">Browse Products</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link key={order.id} to={`/farmer/orders/${order.id}`}
              className="card block hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-900">Order #{order.order_number}</p>
                  <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                </div>
                <span className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{order.seller_shop_name} · {order.items_count} item(s)</span>
                <span className="font-bold text-gray-900">{formatPrice(order.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
