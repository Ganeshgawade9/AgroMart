import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Search, ArrowRight, Star, ShoppingBag, Truck, Shield, Leaf } from 'lucide-react';
import { getFeatured, getCategories } from '../api/products';
import { getNearbyShops } from '../api/maps';
import ProductCard from '../components/products/ProductCard';
import Spinner from '../components/common/Spinner';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const BANNERS = [
  { bg: 'from-green-600 to-emerald-500', title: 'Quality Fertilizers', sub: 'Directly from verified sellers', cta: 'Shop Fertilizers', link: '/products?category_type=fertilizer' },
  { bg: 'from-blue-600 to-cyan-500', title: 'Pesticides & Medicines', sub: 'Effective crop protection products', cta: 'Shop Pesticides', link: '/products?category_type=pesticide' },
  { bg: 'from-orange-500 to-yellow-500', title: 'Nearby Shops', sub: 'Find sellers within your area', cta: 'View Map', link: '/nearby-shops' },
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [nearbyShops, setNearbyShops] = useState([]);
  const [banner, setBanner] = useState(0);
  const [search, setSearch] = useState('');
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    getFeatured().then(r => setFeatured(r.data.results || r.data)).catch(() => {}).finally(() => setLoadingFeatured(false));
    getCategories().then(r => setCategories(r.data.results || r.data)).catch(() => {});
    // Try to get user location for nearby shops
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        getNearbyShops(pos.coords.latitude, pos.coords.longitude, 20)
          .then(r => setNearbyShops(r.data.shops?.slice(0, 6) || []))
          .catch(() => {});
      });
    }
    const t = setInterval(() => setBanner(b => (b + 1) % BANNERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className={`bg-gradient-to-r ${BANNERS[banner].bg} text-white py-16 px-4 transition-all duration-700`}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">{BANNERS[banner].title}</h1>
          <p className="text-white/80 text-lg mb-8">{BANNERS[banner].sub}</p>

          {/* Big search bar */}
          <form onSubmit={handleSearch} className="flex max-w-xl mx-auto mb-6">
            <div className="flex flex-1 bg-white rounded-l-xl overflow-hidden">
              <Search className="w-5 h-5 text-gray-400 ml-3 self-center flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search Urea, DAP, NPK, Pesticide, Shop..."
                className="flex-1 px-3 py-3 text-gray-900 outline-none text-sm"
              />
            </div>
            <button type="submit" className="bg-primary-700 hover:bg-primary-800 text-white px-6 py-3 rounded-r-xl font-semibold">
              Search
            </button>
          </form>

          <Link to={BANNERS[banner].link} className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
            {BANNERS[banner].cta} <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Banner dots */}
          <div className="flex justify-center gap-2 mt-6">
            {BANNERS.map((_, i) => (
              <button key={i} onClick={() => setBanner(i)} className={`w-2 h-2 rounded-full transition-all ${i === banner ? 'bg-white w-6' : 'bg-white/40'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8">
          {[
            { icon: <Truck className="w-5 h-5 text-primary-600" />, text: 'Fast Delivery' },
            { icon: <Shield className="w-5 h-5 text-primary-600" />, text: 'Verified Sellers' },
            { icon: <MapPin className="w-5 h-5 text-primary-600" />, text: 'GPS-Based Shops' },
            { icon: <ShoppingBag className="w-5 h-5 text-primary-600" />, text: 'Easy Returns' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-2 text-sm font-medium text-gray-700">
              {f.icon} {f.text}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Categories */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Shop by Category</h2>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
            {['Fertilizer','Pesticide','Herbicide','Fungicide','Organic','Seeds','Equipment'].map((cat, i) => {
              const emojis = ['🌱','🐛','🌿','🍄','♻️','🌾','⚙️'];
              return (
                <Link key={cat} to={`/products?category_type=${cat.toLowerCase()}`}
                  className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all group shadow-sm">
                  <span className="text-2xl">{emojis[i]}</span>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-primary-700 text-center">{cat}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Nearby Shops */}
        {nearbyShops.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary-600" /> Nearby Shops</h2>
              <Link to="/nearby-shops" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {nearbyShops.map(shop => (
                <div key={shop.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{shop.shop_name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{shop.village}, {shop.district}</p>
                    </div>
                    <span className="badge-green">{shop.distance_km} km</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-gray-600">{Number(shop.rating).toFixed(1)}</span>
                  </div>
                  <Link to={`/products?seller=${shop.id}`} className="mt-3 block text-center text-sm text-primary-600 font-medium border border-primary-300 rounded-lg py-1.5 hover:bg-primary-50 transition-colors">
                    View Products
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">⭐ Featured Products</h2>
            <Link to="/products" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {loadingFeatured ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {featured.slice(0, 10).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Leaf className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Products will appear here once sellers add them.</p>
              {!isAuthenticated && <Link to="/register" className="btn-primary inline-block mt-4">Join as Seller</Link>}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-primary-600 to-emerald-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Are you a Seller?</h2>
          <p className="text-white/80 mb-6">Register your shop and reach thousands of farmers in Maharashtra</p>
          <Link to="/register" className="bg-white text-primary-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors inline-block">
            Register Your Shop
          </Link>
        </section>
      </div>
    </div>
  );
}
