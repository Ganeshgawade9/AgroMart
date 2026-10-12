import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Bell, Search, MapPin, User, LogOut, Package, Heart, Menu, X, ChevronDown, Leaf, Store } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';
import { logout } from '../../api/auth';
import { getCart } from '../../api/products';
import { getNotifications } from '../../api/notifications';
import LocationSelector from './LocationSelector';
import LanguageSwitcher from './LanguageSwitcher';
import { useT } from '../../i18n';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { t } = useT();
  const { user, isAuthenticated, logout: storeLogout, refreshToken } = useAuthStore();
  const { count, setCart } = useCartStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'farmer') {
      getCart().then(r => setCart(r.data.items, r.data.total, r.data.count)).catch(() => { });
      getNotifications().then(r => setNotifCount(r.data.results?.filter(n => !n.is_read).length || 0)).catch(() => { });
    }
  }, [isAuthenticated]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = async () => {
    try { await logout(refreshToken); } catch { }
    storeLogout();
    toast.success(t('nav.logged_out'));
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'seller') return '/seller/dashboard';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'delivery') return '/delivery/dashboard';
    return '/farmer/dashboard';
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-primary-700 text-lg hidden sm:block">AgroConnect</span>
          </Link>

          {/* Location */}
          <LocationSelector />

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('nav.search_placeholder')}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          </form>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/products" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors">{t('nav.products')}</Link>
            <Link to="/nearby-shops" className="flex items-center gap-1 text-gray-600 hover:text-primary-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <MapPin className="w-4 h-4" /> {t('nav.nearby')}
            </Link>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                {user?.role === 'farmer' && (
                  <>
                    <Link to="/farmer/wishlist" className="p-2 text-gray-600 hover:text-primary-600 relative">
                      <Heart className="w-5 h-5" />
                    </Link>
                    <Link to="/farmer/cart" className="p-2 text-gray-600 hover:text-primary-600 relative">
                      <ShoppingCart className="w-5 h-5" />
                      {count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{count}</span>}
                    </Link>
                  </>
                )}
                <Link to="/notifications" className="p-2 text-gray-600 hover:text-primary-600 relative">
                  <Bell className="w-5 h-5" />
                  {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{notifCount}</span>}
                </Link>
                <div className="relative">
                  <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 bg-primary-50 px-3 py-2 rounded-lg hover:bg-primary-100 transition-colors">
                    <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-20 truncate">{user?.full_name?.split(' ')[0]}</span>
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <Link to={getDashboardLink()} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <Package className="w-4 h-4" /> {t('nav.dashboard')}
                      </Link>
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <User className="w-4 h-4" /> {t('nav.profile')}
                      </Link>
                      {user?.role === 'seller' && (
                        <Link to="/seller/shop-profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                          <Store className="w-4 h-4" /> {t('nav.shop_profile')}
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100" />
                      <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                        <LogOut className="w-4 h-4" /> {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-sm py-1.5 px-3">{t('nav.login')}</Link>
                <Link to="/register" className="btn-primary text-sm py-1.5 px-3 hidden sm:block">{t('nav.register')}</Link>
              </div>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Categories bar */}
        <div className="hidden md:flex items-center gap-6 py-2 text-sm overflow-x-auto">
          {['Fertilizer', 'Pesticide', 'Herbicide', 'Fungicide', 'Organic', 'Seeds', 'Equipment'].map(cat => (
            <Link key={cat} to={`/products?category_type=${cat.toLowerCase()}`} className="text-gray-600 hover:text-primary-600 whitespace-nowrap font-medium">{t(`cat.${cat.toLowerCase()}`)}</Link>
          ))}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white py-3 px-4 flex flex-col gap-2">
          <Link to="/products" className="text-gray-700 py-2 font-medium" onClick={() => setMobileOpen(false)}>{t('nav.all_products')}</Link>
          <Link to="/nearby-shops" className="text-gray-700 py-2 font-medium" onClick={() => setMobileOpen(false)}>{t('nav.nearby_shops')}</Link>
          {!isAuthenticated && <Link to="/register" className="btn-primary text-center mt-2" onClick={() => setMobileOpen(false)}>{t('nav.register')}</Link>}
        </div>
      )}
    </nav>
  );
}
