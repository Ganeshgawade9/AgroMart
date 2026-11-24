import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Leaf } from 'lucide-react';
import { getFeatured, getProducts, getBanners } from '../api/products';
import { getNearbyShops } from '../api/maps';
import ProductCard from '../components/products/ProductCard';
import Spinner from '../components/common/Spinner';
import HeroBannerSlider from '../components/home/HeroBannerSlider';
import RecentlyViewed from '../components/home/RecentlyViewed';
import CategoriesGrid from '../components/home/CategoriesGrid';
import ShopByCrop from '../components/home/ShopByCrop';
import useAuthStore from '../store/authStore';
import useLocationStore from '../store/locationStore';
import { useT } from '../i18n';
import useAutoRefresh from '../hooks/useAutoRefresh';

// Diversify products across different shops so multiple shops are always shown randomly
const diversifyByShop = (items, maxCount = 12) => {
  if (!items || items.length <= 1) return (items || []).slice(0, maxCount);
  const byShop = {};
  items.forEach(item => {
    const key = item.shop_name || item.seller?.id || item.seller || 'other';
    if (!byShop[key]) byShop[key] = [];
    byShop[key].push(item);
  });
  const shopKeys = Object.keys(byShop);
  const result = [];
  let added = true;
  let idx = 0;
  while (added && result.length < maxCount) {
    added = false;
    for (const key of shopKeys) {
      if (idx < byShop[key].length) {
        result.push(byShop[key][idx]);
        added = true;
        if (result.length >= maxCount) break;
      }
    }
    idx++;
  }
  return result;
};

export default function Home() {
  const { t } = useT();
  const { isAuthenticated } = useAuthStore();
  const [banners, setBanners] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [nearbyShops, setNearbyShops] = useState([]);
  const [nearbyProducts, setNearbyProducts] = useState([]);
  const { lat, lng, label, detecting, detect } = useLocationStore();
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    getBanners().then(r => setBanners(r.data?.results || r.data || [])).catch(() => {});
    getFeatured()
      .then(r => {
        const list = r.data.results || r.data || [];
        setFeatured(diversifyByShop(list, 18));
      })
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));
  }, []);

  // Nearby shops and products follow the location chosen in the navbar
  useEffect(() => {
    if (lat == null || lng == null) {
      setNearbyShops([]);
      setNearbyProducts([]);
      return;
    }
    getNearbyShops(lat, lng, 20)
      .then(r => setNearbyShops(r.data.shops?.slice(0, 6) || []))
      .catch(() => setNearbyShops([]));
    getProducts({ lat, lng, radius: 20, ordering: 'random', mode: 'driving' })
      .then(r => {
        const list = r.data.results || r.data || [];
        setNearbyProducts(diversifyByShop(list, 12));
      })
      .catch(() => setNearbyProducts([]));
  }, [lat, lng]);

  // Keep featured and nearby products (stock, price, sold-out state) live without a reload
  const refreshProducts = useCallback(() => {
    getFeatured()
      .then(r => {
        const list = r.data.results || r.data || [];
        setFeatured(diversifyByShop(list, 18));
      })
      .catch(() => {});
    if (lat != null && lng != null) {
      getProducts({ lat, lng, radius: 20, ordering: 'random', mode: 'driving' })
        .then(r => {
          const list = r.data.results || r.data || [];
          setNearbyProducts(diversifyByShop(list, 12));
        })
        .catch(() => {});
    }
  }, [lat, lng]);
  useAutoRefresh(refreshProducts);

  return (
    <div className="min-h-screen">
      {/* Hero Promotional Banner Slider */}
      <HeroBannerSlider banners={banners} />

      {/* Recently Viewed Products (Directly after banners) */}
      <RecentlyViewed fallbackProducts={featured} />

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-12">
        {/* Categories Grid (Replacing old Shop by Category) */}
        <CategoriesGrid />

        {/* Shop By Crop (Directly below Categories) */}
        <ShopByCrop />

        {/* Ask for location when none is set */}
        {lat == null && (
          <section className="bg-primary-50 border border-primary-100 rounded-2xl p-5 flex items-center gap-4 flex-wrap">
            <MapPin className="w-8 h-8 text-primary-600 flex-shrink-0" />
            <div className="flex-1 min-w-[220px]">
              <h2 className="font-bold text-gray-900">{t('home.see_near_title')}</h2>
              <p className="text-sm text-gray-600">{t('home.see_near_sub')}</p>
            </div>
            <button onClick={detect} disabled={detecting} className="btn-primary">
              {detecting ? t('home.detecting') : t('home.use_location')}
            </button>
          </section>
        )}

        {/* Products from nearby shops */}
        {nearbyProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" /> {t('home.products_near', { place: label || t('home.you') })}
              </h2>
              <Link to="/products?nearby=true" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">{t('home.view_all')} <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {nearbyProducts.slice(0, 12).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Nearby Shops */}
        {nearbyShops.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary-600" /> {t('home.nearby_shops')}</h2>
              <Link to="/nearby-shops" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">{t('home.view_all')} <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {nearbyShops.map(shop => (
                <div key={shop.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{shop.shop_name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{shop.village}, {shop.district}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="badge-green">{shop.distance_km} km</span>
                      {shop.duration_minutes && (
                        <span className="text-[10px] text-gray-500 mt-0.5">~{shop.duration_minutes}m road</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-amber-400">★</span>
                    <span className="text-xs text-gray-600">{Number(shop.rating).toFixed(1)}</span>
                  </div>
                  <Link to={`/products?seller=${shop.id}`} className="mt-3 block text-center text-sm text-primary-600 font-medium border border-primary-300 rounded-lg py-1.5 hover:bg-primary-50 transition-colors">
                    {t('home.view_products')}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{t('home.featured')}</h2>
            <Link to="/products" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">{t('home.view_all')} <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {loadingFeatured ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {featured.slice(0, 12).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Leaf className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('home.featured_empty')}</p>
              {!isAuthenticated && <Link to="/register" className="btn-primary inline-block mt-4">{t('footer.join_seller')}</Link>}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-primary-600 to-emerald-600 rounded-2xl p-8 sm:p-12 text-white text-center shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('home.cta_title')}</h2>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">{t('home.cta_sub')}</p>
          <Link to="/register" className="bg-white text-primary-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors inline-block shadow">
            {t('home.cta_button')}
          </Link>
        </section>
      </div>

    </div>
  );
}
