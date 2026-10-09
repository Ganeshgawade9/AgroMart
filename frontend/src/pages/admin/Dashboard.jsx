import { useState, useEffect } from 'react';
import { Users, Package, ShoppingBag, IndianRupee, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { formatPrice, getStatusColor, getStatusLabel } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('overview');
  const [roleFilter, setRoleFilter] = useState('seller');
  const [loading, setLoading] = useState(true);

  const fetchStats = () => axios.get(`${BASE}/auth/admin/dashboard/`, { headers: authHeader() }).then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  const fetchUsers = () => axios.get(`${BASE}/auth/admin/users/?role=${roleFilter}`, { headers: authHeader() }).then(r => setUsers(r.data)).catch(() => {});

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (tab === 'users') fetchUsers(); }, [tab, roleFilter]);

  const handleAction = async (userId, action) => {
    try {
      await axios.post(`${BASE}/auth/admin/users/${userId}/action/`, { action }, { headers: authHeader() });
      toast.success(`Done!`);
      fetchUsers(); fetchStats();
    } catch { toast.error('Action failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  const statCards = stats ? [
    { label: 'Farmers', value: stats.farmers, color: 'bg-blue-100 text-blue-700' },
    { label: 'Sellers', value: stats.sellers, color: 'bg-green-100 text-green-700' },
    { label: 'Pending Approval', value: stats.pending_sellers, color: 'bg-orange-100 text-orange-700' },
    { label: 'Products', value: stats.products, color: 'bg-purple-100 text-purple-700' },
    { label: 'Total Orders', value: stats.total_orders, color: 'bg-indigo-100 text-indigo-700' },
    { label: 'Delivered', value: stats.delivered_orders, color: 'bg-teal-100 text-teal-700' },
    { label: 'Pending Orders', value: stats.pending_orders, color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Revenue', value: formatPrice(Math.round(stats.total_revenue)), color: 'bg-emerald-100 text-emerald-700' },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {['overview','users'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab===t?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-800'}`}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statCards.map(s => (
              <div key={s.label} className="card">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {stats?.pending_sellers > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-orange-800 mb-1">⚠️ {stats.pending_sellers} seller(s) awaiting approval</h3>
              <button onClick={() => { setTab('users'); setRoleFilter('seller'); }} className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 mt-2">Review Sellers</button>
            </div>
          )}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Recent Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">{['Order','Farmer','Seller','Amount','Status'].map(h => <th key={h} className="text-left py-2 px-3 text-gray-500 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {stats?.recent_orders?.map(o => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-xs">{o.order_number}</td>
                      <td className="py-2.5 px-3 text-gray-600">{o.farmer}</td>
                      <td className="py-2.5 px-3 text-gray-600">{o.seller}</td>
                      <td className="py-2.5 px-3 font-semibold">{formatPrice(o.total)}</td>
                      <td className="py-2.5 px-3"><span className={getStatusColor(o.status)}>{getStatusLabel(o.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="card">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4">
            <option value="seller">Sellers</option>
            <option value="farmer">Farmers</option>
            <option value="delivery">Delivery</option>
          </select>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">{['Name/Shop','Email','Location','Status','Actions'].map(h => <th key={h} className="text-left py-2 px-3 text-gray-500 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3"><p className="font-medium">{u.full_name}</p>{u.shop_name && <p className="text-xs text-gray-500">{u.shop_name}</p>}</td>
                    <td className="py-2.5 px-3 text-gray-600 text-xs">{u.email}</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">{u.village}, {u.district}</td>
                    <td className="py-2.5 px-3">
                      {!u.is_approved ? <span className="badge-orange">Pending</span> : !u.is_active ? <span className="badge-red">Inactive</span> : <span className="badge-green">Active</span>}
                    </td>
                    <td className="py-2.5 px-3 flex gap-1 flex-wrap">
                      {!u.is_approved && <button onClick={() => handleAction(u.id,'approve')} className="text-xs bg-green-600 text-white px-2 py-1 rounded">Approve</button>}
                      {u.is_active ? <button onClick={() => handleAction(u.id,'deactivate')} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Block</button>
                        : <button onClick={() => handleAction(u.id,'activate')} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Activate</button>}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">No users found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
