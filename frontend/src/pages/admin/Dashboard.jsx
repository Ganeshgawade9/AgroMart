import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Upload, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';
import { formatPrice, getStatusColor, getStatusLabel, resolveBannerUrl } from '../../utils/helpers';
import { getAdminBanners, uploadAdminBanners, updateAdminBanner, deleteAdminBanner } from '../../api/products';


const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [banners, setBanners] = useState([]);
  const [tab, setTab] = useState('overview');
  const [roleFilter, setRoleFilter] = useState('seller');
  const [loading, setLoading] = useState(true);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    link_url: '',
    files: [],
  });

  const fetchStats = () => axios.get(`${BASE}/auth/admin/dashboard/`, { headers: authHeader() }).then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  const fetchUsers = useCallback(() => {
    return axios.get(`${BASE}/auth/admin/users/?role=${roleFilter}`, { headers: authHeader() }).then(r => setUsers(r.data)).catch(() => {});
  }, [roleFilter]);

  const fetchBanners = useCallback(() => {
    return getAdminBanners().then(r => setBanners(r.data?.results || r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => {
    if (tab === 'users') fetchUsers();
    if (tab === 'banners') fetchBanners();
  }, [tab, fetchUsers, fetchBanners]);

  const handleAction = async (userId, action) => {
    try {
      await axios.post(`${BASE}/auth/admin/users/${userId}/action/`, { action }, { headers: authHeader() });
      toast.success('Done!');
      fetchUsers(); fetchStats();
    } catch { toast.error('Action failed'); }
  };

  const handleBannerUpload = async (e) => {
    e.preventDefault();
    if (!bannerForm.files || bannerForm.files.length === 0) {
      toast.error('Please select at least one image file');
      return;
    }
    const formData = new FormData();
    for (let i = 0; i < bannerForm.files.length; i++) {
      formData.append('images', bannerForm.files[i]);
    }
    if (bannerForm.title) formData.append('title', bannerForm.title);
    if (bannerForm.subtitle) formData.append('subtitle', bannerForm.subtitle);
    if (bannerForm.link_url) formData.append('link_url', bannerForm.link_url);

    setBannerUploading(true);
    try {
      await uploadAdminBanners(formData);
      toast.success(`${bannerForm.files.length} banner(s) uploaded successfully!`);
      setBannerForm({ title: '', subtitle: '', link_url: '', files: [] });
      fetchBanners();
    } catch {
      toast.error('Failed to upload banner(s)');
    } finally {
      setBannerUploading(false);
    }
  };

  const handleToggleBanner = async (banner) => {
    try {
      await updateAdminBanner(banner.id, { is_active: !banner.is_active });
      toast.success(`Banner ${!banner.is_active ? 'activated' : 'deactivated'}`);
      fetchBanners();
    } catch {
      toast.error('Failed to update banner status');
    }
  };

  const handleUpdateOrder = async (bannerId, newOrder) => {
    try {
      await updateAdminBanner(bannerId, { order: Number(newOrder) || 0 });
      fetchBanners();
    } catch {
      toast.error('Failed to update banner order');
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await deleteAdminBanner(bannerId);
      toast.success('Banner deleted');
      fetchBanners();
    } catch {
      toast.error('Failed to delete banner');
    }
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
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'users', label: 'Users' },
          { key: 'banners', label: 'Hero Banners & Ads' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
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

      {tab === 'banners' && (
        <div className="space-y-6">
          {/* Upload Banner Section */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <Upload className="w-5 h-5 text-primary-600" />
              <div>
                <h2 className="font-bold text-gray-900 text-base sm:text-lg">Upload Promotional Banners & Ads</h2>
                <p className="text-xs text-gray-500">Upload single or multiple banner images. They will auto-slide on the homepage hero section.</p>
              </div>
            </div>

            <form onSubmit={handleBannerUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Campaign Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Navaratri Festival Offers"
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Subtitle / Tagline (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Best discounts on fertilizers"
                    value={bannerForm.subtitle}
                    onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Link URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. /products?category_type=fertilizer"
                    value={bannerForm.link_url}
                    onChange={(e) => setBannerForm({ ...bannerForm, link_url: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Multi-image file input */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-primary-400 transition-colors bg-gray-50/50">
                <input
                  type="file"
                  id="banner-file-input"
                  multiple
                  accept="image/*"
                  onChange={(e) => setBannerForm({ ...bannerForm, files: Array.from(e.target.files || []) })}
                  className="hidden"
                />
                <label htmlFor="banner-file-input" className="cursor-pointer flex flex-col items-center">
                  <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                  <span className="text-sm font-semibold text-primary-700 hover:underline">
                    Click to browse images (Multiple supported)
                  </span>
                  <span className="text-xs text-gray-400 mt-1">Recommended size: 1200x400 or wide landscape banners (PNG, JPG, WEBP)</span>
                </label>

                {bannerForm.files.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2 justify-center">
                    {bannerForm.files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 text-xs px-2.5 py-1 rounded-full font-medium">
                        ✓ {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={bannerUploading || bannerForm.files.length === 0}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {bannerUploading ? <Spinner className="w-4 h-4 text-white" /> : <Upload className="w-4 h-4" />}
                  {bannerUploading ? 'Uploading...' : `Upload ${bannerForm.files.length ? bannerForm.files.length : ''} Banner(s)`}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Banners Management List */}
          <div className="card">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Active & Stored Hero Banners ({banners.length})</h3>
                <p className="text-xs text-gray-500">Toggle active visibility, change priority order, or delete banners.</p>
              </div>
            </div>

            {banners.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No banners uploaded yet. Upload your first promotional hero banner above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map((b) => (
                  <div
                    key={b.id}
                    className={`border rounded-xl overflow-hidden transition-shadow hover:shadow-md ${
                      b.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/70 opacity-70'
                    }`}
                  >
                    {/* Banner Image Preview */}
                    <div className="relative h-40 bg-gray-100 overflow-hidden">
                      <img
                        src={resolveBannerUrl(b)}
                        alt={b.title || 'Banner'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleBanner(b)}
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm transition-colors ${
                            b.is_active
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-gray-700 text-white hover:bg-gray-800'
                          }`}
                        >
                          {b.is_active ? 'Active' : 'Hidden'}
                        </button>
                      </div>
                    </div>

                    {/* Banner Details & Controls */}
                    <div className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{b.title || 'Untitled Banner'}</h4>
                          {b.subtitle && <p className="text-xs text-gray-500 line-clamp-1">{b.subtitle}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBanner(b.id)}
                          title="Delete Banner"
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">Order:</span>
                          <input
                            type="number"
                            defaultValue={b.order}
                            onBlur={(e) => handleUpdateOrder(b.id, e.target.value)}
                            className="w-14 border border-gray-200 rounded px-2 py-0.5 text-center font-medium"
                          />
                        </div>

                        {b.link_url ? (
                          <a
                            href={b.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline flex items-center gap-1 font-medium max-w-[180px] truncate"
                          >
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{b.link_url}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">No link</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

