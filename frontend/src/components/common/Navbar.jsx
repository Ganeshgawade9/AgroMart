import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Bell, Search, MapPin, User, LogOut, Package, Heart, Menu, X, ChevronDown, Leaf, Store, Wrench } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import { logout } from '../../api/auth';
import { getCart, getWishlist } from '../../api/products';
import { getNotifications } from '../../api/notifications';
import LocationSelector from './LocationSelector';
import LanguageSwitcher from './LanguageSwitcher';
import { useT } from '../../i18n';
import toast from 'react-hot-toast';

const EQUIPMENT_MENU = [
  {
    title: 'IMPLEMENTS',
    items: [
      { name: 'SPRAYERS', search: 'Sprayer' },
      { name: 'BRUSH CUTTER', search: 'Brush Cutter' },
      { name: 'WEEDER/ TILLER', search: 'Weeder' },
      { name: 'CHAFF CUTTER AND PARTS', search: 'Chaff Cutter' },
      { name: 'SOLAR DRYER', search: 'Solar Dryer' },
      { name: 'RICE MILL', search: 'Rice Mill' },
      { name: 'EARTH AUGERS', search: 'Earth Auger' },
      { name: 'POWER REAPER', search: 'Reaper' },
      { name: 'CHAIN SAW', search: 'Chainsaw' },
      { name: 'SUGARCANE MACHINE', search: 'Sugarcane' },
    ]
  },
  {
    title: 'AGRICULTURE TOOLS',
    items: [
      { name: 'NURSERY INPUTS', search: 'Nursery' },
      { name: 'FRUIT HARVESTER/ PLUCKER', search: 'Fruit Harvester' },
      { name: 'GARDEN TOOLS', search: 'Secateur' },
      { name: 'SEEDER/ TRANSPLANTER', search: 'Transplanter' },
    ]
  },
  {
    title: 'ACCESSORIES',
    items: [
      { name: 'TIRPAL/ TARPAULIN', search: 'Tarpaulin' },
      { name: 'MULCH', search: 'Mulch' },
      { name: 'SHADE NET', search: 'Shade Net' },
      { name: 'TRAPS AND LURE', search: 'Trap' },
      { name: 'SAFETY KIT', search: 'Safety' },
      { name: 'TORCH/ LANTERN', search: 'Torch' },
      { name: 'CROP COVER', search: 'Crop Cover' },
    ]
  },
  {
    title: 'IRRIGATION',
    items: [
      { name: 'PIPE', search: 'Pipe' },
      { name: 'WATER PUMP', search: 'Water Pump' },
      { name: 'SPRINKLER', search: 'Sprinkler' },
      { name: 'DRIP KIT', search: 'Drip' },
    ]
  }
];

const BRANDS_MENU = [
  {
    title: 'SEEDS',
    items: [
      'Syngenta', 'Namdhari Seeds', 'Seminis', 'East-West Seed',
      'Indo-American Hybrid Seeds', 'VNR Seeds', 'Nunhems', 'Sarpan Seeds',
      'UPL', 'Mahyco', 'Known-You Seed', 'Urja Seeds', 'Ashoka Seeds',
      'Advanta Seeds', 'Iris Hybrid Seeds', 'Sagar Biotech', 'Vokkal Seeds',
      'Bejo Sheetal', 'Farmson Biotech', 'Semillas Fitó', 'Sakata Seeds',
      'HyVeg', 'Indo-US Biotech'
    ]
  },
  {
    title: 'CROP PROTECTION',
    items: [
      'Bayer', 'Syngenta', 'BASF', 'FMC', 'Rallis', 'Tapas', 'Dhanuka',
      'Crystal Crop Protection', 'UPL', 'Corteva Agriscience', 'Indofil Industries',
      'Sumitomo Chemical', 'PI Industries', 'Adama', 'Barrix Agro Sciences',
      'IFFCO', 'Aimco Pesticides', 'BACF', 'UAL (Utkarsh Agrochem)',
      'Kay Bee Bio-Organics', 'Kan Biosys', 'Essential Biosciences'
    ]
  },
  {
    title: 'CROP NUTRITION',
    items: [
      'Multiplex Group', 'Hifield-AG Chem', 'Sea6 Energy', 'Humate India',
      'Microbi Agrotech', 'Geolife Agritech', 'Tapas', 'Otlas', 'Vedagna',
      'Vijaya Agro Industries', 'Amruth Organic', 'Shamrock Overseas',
      'Anand Agro Care', 'Vanproz Agrovet', 'Agriplex', 'T. Stanes & Company',
      'Rallis', 'BioPrime AgriSolutions', 'Infinite Biotech',
      'Bhumi Agro Industries', 'Jaipur Bio Fertilizers', 'Aimco Pesticides'
    ]
  },
  {
    title: 'IMPLEMENTS',
    items: [
      'Snap Export', 'Niyo Farmtech', 'Tapas', 'Mitva', 'Mipatex',
      'Sickle Innovations', 'Tata Agrico', 'Modish Tractoraurkisan (Balwaan)',
      'Balwaan Krishi', 'KisanKraft', 'Falcon Tools', 'Honda Power',
      'Netafim', 'Neptune Farming'
    ]
  },
  {
    title: 'MOST POPULAR',
    items: [
      'Syngenta', 'Bayer', 'Excel Industries', 'Janatha Agro Products',
      'Namdhari Seeds', 'Geolife Agritech', 'BASF', 'Tapas',
      'Vijaya Agro Industries', 'VNR Seeds', 'Vanproz Agrovet',
      'Sarpan Seeds', 'UAL (Utkarsh Agrochem)', 'Kan Biosys',
      'Katyayani Organics'
    ]
  }
];

export default function Navbar() {
  const { t } = useT();
  const { user, isAuthenticated, logout: storeLogout, refreshToken } = useAuthStore();
  const { count, setCart } = useCartStore();
  const wishlistCount = useWishlistStore((state) => state.count);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [mobileBrandsOpen, setMobileBrandsOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [mobileEquipmentOpen, setMobileEquipmentOpen] = useState(false);
  const closeTimerRef = useRef(null);
  const brandsCloseTimerRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'farmer') {
        getCart().then(r => setCart(r.data.items, r.data.total, r.data.count)).catch(() => { });
        getWishlist().then(r => useWishlistStore.getState().setWishlist(r.data.results || r.data)).catch(() => { });
      }
      getNotifications().then(r => setNotifCount(r.data.results?.filter(n => !n.is_read).length || 0)).catch(() => { });
    }
  }, [isAuthenticated, user?.role, setCart]);

  const handleBrandsMouseEnter = () => {
    if (brandsCloseTimerRef.current) clearTimeout(brandsCloseTimerRef.current);
    setBrandsOpen(true);
  };

  const handleBrandsMouseLeave = () => {
    brandsCloseTimerRef.current = setTimeout(() => {
      setBrandsOpen(false);
    }, 180);
  };

  const handleMouseEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setEquipmentOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setEquipmentOpen(false);
    }, 180);
  };

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
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
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
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
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
                    <Link to="/farmer/wishlist" className="p-2 text-gray-600 hover:text-primary-600 relative" title="My Wishlist">
                      <Heart className={`w-5 h-5 transition-colors ${wishlistCount > 0 ? 'text-red-500 fill-red-500' : ''}`} />
                      {wishlistCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                          {wishlistCount}
                        </span>
                      )}
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

        {/* Categories bar with BigHaat Mega-Dropdowns */}
        <div className="hidden md:flex items-center gap-5 py-2 text-sm border-t border-gray-100 relative">
          {/* 1. BRANDS with BigHaat 5-Column Mega Dropdown */}
          <div
            className="relative"
            onMouseEnter={handleBrandsMouseEnter}
            onMouseLeave={handleBrandsMouseLeave}
          >
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setBrandsOpen(!brandsOpen)}
                className={`flex items-center gap-1.5 whitespace-nowrap font-medium px-3 py-1 rounded-md transition-all ${
                  brandsOpen
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span>{t('nav.brands') || 'BRANDS'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${brandsOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Brands Mega Dropdown Panel */}
            {brandsOpen && (
              <div
                className="absolute left-0 top-full pt-1.5 z-50 w-[1020px] max-w-[95vw]"
                onMouseEnter={handleBrandsMouseEnter}
                onMouseLeave={handleBrandsMouseLeave}
              >
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-5 gap-4">
                    {BRANDS_MENU.map((col, idx) => (
                      <div key={idx} className="flex flex-col">
                        <div className="text-emerald-700 font-bold text-xs uppercase tracking-wider pb-2 mb-2 border-b-2 border-emerald-500/30">
                          {col.title}
                        </div>
                        <div className="flex flex-col space-y-0.5 max-h-[360px] overflow-y-auto pr-1.5">
                          {col.items.map((bName, i) => (
                            <Link
                              key={i}
                              to={`/products?search=${encodeURIComponent(bName)}`}
                              onClick={() => setBrandsOpen(false)}
                              className="shrink-0 text-[11px] font-semibold text-gray-700 hover:text-emerald-600 hover:translate-x-0.5 transition-all py-1 px-2 rounded hover:bg-emerald-50/80 truncate block"
                              title={bName}
                            >
                              {bName}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {['Fertilizer', 'Pesticide', 'Herbicide', 'Fungicide', 'Organic', 'Seeds'].map(cat => (
            <Link
              key={cat}
              to={`/products?category_type=${cat.toLowerCase()}`}
              className="text-gray-600 hover:text-primary-600 whitespace-nowrap font-medium transition-colors"
            >
              {t(`cat.${cat.toLowerCase()}`)}
            </Link>
          ))}

          {/* EQUIPMENTS with BigHaat Mega Dropdown */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setEquipmentOpen(!equipmentOpen)}
                className={`flex items-center gap-1.5 whitespace-nowrap font-medium px-3 py-1 rounded-md transition-all ${
                  equipmentOpen
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{t('cat.equipment') || 'EQUIPMENTS'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${equipmentOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Mega Dropdown Panel */}
            {equipmentOpen && (
              <div
                className="absolute left-0 top-full pt-1.5 z-50 w-[860px] max-w-[90vw]"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-4 gap-6">
                    {EQUIPMENT_MENU.map((col, idx) => (
                      <div key={idx} className="flex flex-col">
                        <div className="text-emerald-700 font-bold text-xs uppercase tracking-wider pb-2 mb-2 border-b-2 border-emerald-500/30">
                          {col.title}
                        </div>
                        <div className="flex flex-col space-y-1">
                          {col.items.map((item, i) => (
                            <Link
                              key={i}
                              to={`/products?category_type=equipment&search=${encodeURIComponent(item.search)}`}
                              onClick={() => setEquipmentOpen(false)}
                              className="text-[11px] font-semibold text-gray-700 hover:text-emerald-600 hover:translate-x-1 transition-all py-1 px-1.5 rounded hover:bg-emerald-50/60 uppercase"
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white py-3 px-4 flex flex-col gap-2 max-h-[80vh] overflow-y-auto">
          <Link to="/products" className="text-gray-700 py-2 font-medium" onClick={() => setMobileOpen(false)}>{t('nav.all_products')}</Link>
          <Link to="/nearby-shops" className="text-gray-700 py-2 font-medium" onClick={() => setMobileOpen(false)}>{t('nav.nearby_shops')}</Link>

          {/* Mobile Brands Accordion */}
          <div className="border-t border-gray-100 py-2 my-1">
            <button
              onClick={() => setMobileBrandsOpen(!mobileBrandsOpen)}
              className="flex items-center justify-between w-full text-emerald-700 font-bold text-sm py-1.5"
            >
              <span>BRANDS</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileBrandsOpen ? 'rotate-180' : ''}`} />
            </button>

            {mobileBrandsOpen && (
              <div className="pl-3 pt-2 space-y-4">
                {BRANDS_MENU.map((col, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                      {col.title}
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                      {col.items.map((bName, i) => (
                        <Link
                          key={i}
                          to={`/products?search=${encodeURIComponent(bName)}`}
                          onClick={() => setMobileOpen(false)}
                          className="text-xs text-gray-700 hover:text-emerald-600 py-0.5 truncate"
                          title={bName}
                        >
                          {bName}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Equipment Accordion */}
          <div className="border-t border-b border-gray-100 py-2 my-1">
            <button
              onClick={() => setMobileEquipmentOpen(!mobileEquipmentOpen)}
              className="flex items-center justify-between w-full text-emerald-700 font-bold text-sm py-1.5"
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-600" />
                <span>EQUIPMENTS</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileEquipmentOpen ? 'rotate-180' : ''}`} />
            </button>

            {mobileEquipmentOpen && (
              <div className="pl-3 pt-2 space-y-4">
                {EQUIPMENT_MENU.map((col, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                      {col.title}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {col.items.map((item, i) => (
                        <Link
                          key={i}
                          to={`/products?category_type=equipment&search=${encodeURIComponent(item.search)}`}
                          onClick={() => setMobileOpen(false)}
                          className="text-xs text-gray-700 hover:text-emerald-600 py-1"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <Link
                  to="/products?category_type=equipment"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center bg-emerald-600 text-white font-semibold text-xs py-2 rounded-lg mt-2"
                >
                  View All Equipments
                </Link>
              </div>
            )}
          </div>

          {!isAuthenticated && <Link to="/register" className="btn-primary text-center mt-2" onClick={() => setMobileOpen(false)}>{t('nav.register')}</Link>}
        </div>
      )}
    </nav>
  );
}
