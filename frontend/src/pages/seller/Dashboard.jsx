import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, IndianRupee, ShoppingBag, AlertTriangle, Users, Box, CheckCircle, XCircle, ArrowRight, Activity, CreditCard, Download, Settings } from 'lucide-react';
import { getSellerDashboardStats, getSellerOrders, getPaymentAnalytics } from '../../api/orders';
import { formatPrice, formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import useAuthStore from '../../store/authStore';
import Spinner from '../../components/common/Spinner';

// Import Recharts
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function SellerDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'payments'

  useEffect(() => {
    Promise.all([
      getSellerDashboardStats(),
      getSellerOrders(),
      getPaymentAnalytics()
    ]).then(([statsRes, ordRes, payRes]) => {
      setStats(statsRes.data.stats);
      setCharts(statsRes.data.charts);
      setPaymentStats(payRes.data);
      setRecentOrders((ordRes.data.results || ordRes.data).slice(0, 8));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // CSV Exporter for Transactions
  const handleDownloadReport = () => {
    if (!paymentStats || !paymentStats.recent_transactions.length) return;
    
    const headers = ['Payment ID', 'Transaction ID', 'Order Number', 'Amount', 'Method', 'Status', 'Date'];
    const rows = paymentStats.recent_transactions.map(t => [
      t.payment_id,
      t.transaction_id || 'N/A',
      t.order_number || 'N/A',
      t.amount,
      t.payment_method,
      t.status,
      new Date(t.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `agrimart_payment_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !stats || !paymentStats) return <div className="flex justify-center py-20"><Spinner /></div>;

  const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Seller Central</h1>
          <p className="text-gray-500 text-xs mt-0.5">Welcome back, {user?.seller_profile?.shop_name || user?.full_name}</p>
        </div>
        <div className="flex gap-2.5">
          <Link to="/seller/payment-settings" className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all">
            <Settings className="w-4 h-4 text-gray-500" />
            <span>Payment Settings</span>
          </Link>
          <Link to="/seller/products/add" className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all">
            <span>+ Add Product</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'overview' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Store Overview
        </button>
        <button 
          onClick={() => setActiveTab('payments')}
          className={`pb-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'payments' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Payment & Revenue Analytics
        </button>
      </div>

      {/* TAB 1: OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DashboardCard icon={<IndianRupee className="w-5 h-5 text-green-700" />} title="Total Revenue" value={formatPrice(stats.total_revenue)} color="bg-green-100" />
            <DashboardCard icon={<Activity className="w-5 h-5 text-blue-700" />} title="Monthly Revenue" value={formatPrice(stats.monthly_revenue)} color="bg-blue-100" />
            <DashboardCard icon={<ShoppingBag className="w-5 h-5 text-purple-700" />} title="Total Orders" value={stats.total_orders} color="bg-purple-100" />
            <DashboardCard icon={<Users className="w-5 h-5 text-orange-700" />} title="Total Customers" value={stats.total_customers} color="bg-orange-100" />
          </div>
          
          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniCard title="Total Products" value={stats.total_products} icon={<Box className="w-4 h-4 text-gray-500" />} />
            <MiniCard title="Active" value={stats.active_products} icon={<CheckCircle className="w-4 h-4 text-green-500" />} />
            <MiniCard title="Out of Stock" value={stats.out_of_stock} icon={<AlertTriangle className="w-4 h-4 text-red-500" />} isAlert={stats.out_of_stock > 0} />
            <MiniCard title="Pending Orders" value={stats.pending_orders} icon={<Package className="w-4 h-4 text-orange-500" />} />
            <MiniCard title="Delivered Orders" value={stats.delivered_orders} icon={<Truck className="w-4 h-4 text-blue-500" />} />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4 text-sm">Revenue Growth (6 Months)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.monthly_sales}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}} tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip cursor={{fill: 'transparent'}} formatter={(value) => formatPrice(value)} />
                    <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} dot={{r: 4, fill: '#16a34a', strokeWidth: 0}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Categories Pie Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4 text-sm">Product Categories</h2>
              <div className="h-64 flex justify-center">
                {charts.product_categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.product_categories} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                        {charts.product_categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{fontSize: 11}} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center text-gray-400 text-sm">No categories added yet.</div>
                )}
              </div>
            </div>

            {/* Weekly Orders Bar Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4 text-sm">Weekly Orders</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.weekly_orders}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                    <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4 text-sm">Top Selling Products</h2>
              {charts.top_products.length > 0 ? (
                <div className="space-y-4">
                  {charts.top_products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">#{i+1}</div>
                        <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                      </div>
                      <div className="text-xs font-bold text-gray-900">{p.sold} Sold</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400 text-sm">No sales data yet.</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="font-bold text-gray-900 mb-4 text-sm">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <QuickAction to="/seller/products/add" label="Add Product" icon="➕" />
              <QuickAction to="/seller/products" label="Manage Inventory" icon="📦" />
              <QuickAction to="/seller/orders" label="View Orders" icon="🛒" />
              <QuickAction to="/profile" label="Update Profile" icon="🏪" />
              <QuickAction to="/seller/payment-settings" label="Settlement Settings" icon="💳" />
              <button onClick={handleDownloadReport} className="bg-white border border-gray-100 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 hover:border-primary-300 hover:shadow-sm transition-all text-xs font-medium text-gray-700 text-center leading-tight">
                <span className="text-xl">📊</span>
                <span>Download CSV Report</span>
              </button>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-sm">Recent Orders</h2>
              <Link to="/seller/orders" className="text-xs font-semibold text-primary-600 hover:underline">View All Orders</Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-6">No orders received yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                      {['Order ID','Customer','Date','Amount','Payment','Order Status','Action'].map(h => <th key={h} className="text-left py-3 px-4 pb-2">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(o => (
                      <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900">{o.order_number}</td>
                        <td className="py-3 px-4 text-gray-700 font-medium">{o.farmer_name || 'Customer'}</td>
                        <td className="py-3 px-4 text-gray-500">{formatDate(o.created_at)}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{formatPrice(o.total)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {o.payment_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4"><span className={getStatusColor(o.status)}>{getStatusLabel(o.status)}</span></td>
                        <td className="py-3 px-4"><Link to={`/seller/orders/${o.id}`} className="text-primary-600 hover:text-primary-800 font-bold">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Payment specific KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DashboardCard icon={<IndianRupee className="w-5 h-5 text-green-700" />} title="Today's Collections" value={formatPrice(paymentStats.today_revenue)} color="bg-green-100" />
            <DashboardCard icon={<IndianRupee className="w-5 h-5 text-blue-700" />} title="Monthly Collections" value={formatPrice(paymentStats.monthly_revenue)} color="bg-blue-100" />
            <DashboardCard icon={<CreditCard className="w-5 h-5 text-amber-700" />} title="Pending Collections" value={paymentStats.pending_payments} color="bg-amber-100" />
            <DashboardCard icon={<CheckCircle className="w-5 h-5 text-green-700" />} title="Completed Settlements" value={paymentStats.completed_payments} color="bg-emerald-100" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Revenue Growth chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
              <h2 className="font-bold text-gray-900 mb-4 text-sm">Daily Collections (Last 30 Days)</h2>
              <div className="h-64">
                {paymentStats.revenue_chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentStats.revenue_chart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6b7280'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6b7280'}} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} formatter={(v) => formatPrice(v)} />
                      <Bar dataKey="revenue" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400 text-sm">No transaction records in the last 30 days.</div>
                )}
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4 text-sm">Payment Methods Shares</h2>
              <div className="h-64 flex justify-center">
                {paymentStats.payment_methods.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentStats.payment_methods} innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                        {paymentStats.payment_methods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} transactions (${formatPrice(props.payload.revenue)})`, name]} />
                      <Legend verticalAlign="bottom" wrapperStyle={{fontSize: 10}} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center text-gray-400 text-sm">No payment data yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Recent Transactions</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Real-time payment logs of farm orders</p>
              </div>
              <button 
                onClick={handleDownloadReport}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
            </div>

            {paymentStats.recent_transactions.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-6">No transaction records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                      {['Payment ID', 'Order Ref', 'Amount', 'Method', 'Txn/UTR ID', 'Status', 'Paid At'].map(h => <th key={h} className="text-left py-3 px-4 pb-2">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {paymentStats.recent_transactions.map(t => (
                      <tr key={t.payment_id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-gray-900">{t.payment_id}</td>
                        <td className="py-3 px-4 font-semibold text-gray-700">{t.order_number || 'N/A'}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{formatPrice(t.amount)}</td>
                        <td className="py-3 px-4 font-medium text-gray-600">{t.payment_method}</td>
                        <td className="py-3 px-4 font-mono text-gray-500">{t.transaction_id || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            t.status === 'paid' 
                              ? 'bg-green-100 text-green-700' 
                              : t.status === 'failed' 
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{t.paid_at ? new Date(t.paid_at).toLocaleString('en-IN', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

function DashboardCard({ icon, title, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-black text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function MiniCard({ title, value, icon, isAlert = false }) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border transition-all ${isAlert ? 'border-red-200 bg-red-50/50' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${isAlert ? 'text-red-700' : 'text-gray-500'}`}>{title}</p>
        {icon}
      </div>
      <p className={`text-base font-extrabold ${isAlert ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function QuickAction({ to, label, icon }) {
  return (
    <Link to={to} className="bg-white border border-gray-100 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 hover:border-primary-300 hover:shadow-sm transition-all">
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
    </Link>
  );
}

function Truck(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" /><path d="M14 17h1" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}
