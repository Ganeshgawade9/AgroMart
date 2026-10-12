import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, SlidersHorizontal, Crosshair, X } from 'lucide-react';
import { getProducts, getFilterOptions } from '../api/products';
import ProductCard from '../components/products/ProductCard';
import FilterSidebar from '../components/products/FilterSidebar';
import Spinner from '../components/common/Spinner';
import useLocationStore from '../store/locationStore';
import { useT } from '../i18n';
import { EMPTY_FILTERS, buildFilterParams, countActiveFilters, parseList } from '../utils/filters';
import toast from 'react-hot-toast';

const DEFAULT_RADIUS = 20;
const PAGE_SIZE = 20;

export default function Products() {
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState(null);
  const [showFilterMobile, setShowFilterMobile] = useState(false);

  const searchQuery = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category_type') || '';
  const sellerId = searchParams.get('seller') || '';

  // A category chosen from the navbar / home page (?category_type=seeds) pre-selects it in the panel
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, category_type: parseList(categoryParam) });
  useEffect(() => {
    setFilters((f) => ({ ...f, category_type: parseList(categoryParam) }));
    setPage(1);
  }, [categoryParam]);

  // Location is shared app-wide (set from the navbar). When it is on, products
  // are limited to shops within `radius` km and sorted nearest first.
  const { lat, lng, label, detecting, error, detect } = useLocationStore();
  const hasLocation = lat != null && lng != null;
  const [nearbyOn, setNearbyOn] = useState(true);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const useNearby = hasLocation && nearbyOn;

  const [ordering, setOrdering] = useState(hasLocation ? 'distance' : '-created_at');

  // Switch to "Nearest first" when a location appears, and back when it goes away
  useEffect(() => {
    setPage(1);
    setOrdering((o) => {
      if (hasLocation && o === '-created_at') return 'distance';
      if (!hasLocation && o === 'distance') return '-created_at';
      return o;
    });
  }, [hasLocation, lat, lng]);

  // Brands, pack sizes and districts that actually exist, for the filter panel
  useEffect(() => {
    getFilterOptions().then((r) => setOptions(r.data)).catch(() => setOptions(null));
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...buildFilterParams(filters), page, ordering };
      if (searchQuery) params.search = searchQuery;
      if (sellerId) params.seller = sellerId;
      if (useNearby) {
        params.lat = lat;
        params.lng = lng;
        params.radius = radius;
      } else if (params.ordering === 'distance') {
        params.ordering = '-created_at';
      }
      const res = await getProducts(params);
      setProducts(res.data.results || res.data);
      setTotal(res.data.count || 0);
    } catch {
      toast.error(t('products.load_failed'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, ordering, searchQuery, sellerId, useNearby, lat, lng, radius]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleNearbyToggle = async () => {
    if (!hasLocation) {
      const ok = await detect();
      if (ok) { setNearbyOn(true); setPage(1); }
      else toast.error(useLocationStore.getState().error || t('products.location_failed'));
      return;
    }
    setNearbyOn((on) => !on);
    setPage(1);
  };

  const applyFilters = (f) => { setFilters(f); setPage(1); };

  const heading = searchQuery
    ? t('products.results_for', { q: searchQuery })
    : filters.category_type.length
      ? filters.category_type.map((c) => t(`cat.${c}`)).join(', ')
      : t('products.all');

  const activeCount = countActiveFilters(filters);
  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
          {!loading && (
            <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1 flex-wrap">
              {t('products.found', { n: total })}
              {useNearby && (
                <span className="inline-flex items-center gap-1 text-primary-700">
                  · <MapPin className="w-3.5 h-3.5" /> {t('products.within', { r: radius, place: label || t('products.your_location') })}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNearbyToggle}
            disabled={detecting}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60 ${useNearby ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-700 hover:border-primary-400'}`}
          >
            <MapPin className="w-4 h-4" /> {detecting ? t('products.locating') : useNearby ? t('products.nearby_on') : t('products.nearby')}
          </button>
          <select value={ordering} onChange={e => { setOrdering(e.target.value); setPage(1); }} aria-label="Sort" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            {useNearby && <option value="distance">{t('sort.nearest')}</option>}
            <option value="-created_at">{t('sort.newest')}</option>
            <option value="price">{t('sort.price_low')}</option>
            <option value="-price">{t('sort.price_high')}</option>
            <option value="-rating">{t('sort.top_rated')}</option>
          </select>
          <button onClick={() => setShowFilterMobile(true)} aria-label={t('products.filters')} className="md:hidden relative border border-gray-300 p-2 rounded-lg">
            <SlidersHorizontal className="w-4 h-4" />
            {activeCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-primary-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>}
          </button>
        </div>
      </div>

      {/* Prompt to set location when none is set */}
      {!hasLocation && (
        <div className="mb-6 flex items-center gap-3 flex-wrap bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
          <Crosshair className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <p className="text-sm text-gray-700 flex-1 min-w-[200px]">
            {t('products.share_location')}
          </p>
          <button onClick={handleNearbyToggle} disabled={detecting} className="btn-primary text-sm py-1.5 px-3">
            {detecting ? t('products.detecting') : t('products.use_my_location')}
          </button>
          {error && <p className="w-full text-xs text-red-500">{error}</p>}
        </div>
      )}

      <div className="flex gap-6 items-start">
        {/* Left filter panel (desktop: sticky column, mobile: full-screen drawer) */}
        <aside
          className={showFilterMobile
            ? 'fixed inset-0 z-50 bg-gray-50 flex flex-col md:static md:bg-transparent md:w-64 md:flex-shrink-0 md:block'
            : 'hidden md:block md:w-64 md:flex-shrink-0'}
        >
          {showFilterMobile && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 md:hidden">
              <span className="font-bold text-gray-900">{t('products.filters')}</span>
              <button onClick={() => setShowFilterMobile(false)} aria-label="Close" className="p-1"><X className="w-5 h-5" /></button>
            </div>
          )}
          <div className={`${showFilterMobile ? 'flex-1 overflow-y-auto p-4' : ''} md:p-0 md:sticky md:top-32 md:max-h-[calc(100vh-9rem)] md:overflow-y-auto`}>
            <FilterSidebar
              filters={filters}
              onChange={applyFilters}
              options={options}
              showDistance={useNearby}
              radius={radius}
              onRadiusChange={(r) => { setRadius(r); setPage(1); }}
            />
          </div>
          {showFilterMobile && (
            <div className="p-3 bg-white border-t border-gray-200 md:hidden">
              <button onClick={() => setShowFilterMobile(false)} className="btn-primary w-full py-2.5">
                {t('products.show_results', { n: total })}
              </button>
            </div>
          )}
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center items-center py-20"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-lg font-medium">
                {useNearby ? t('products.none_within', { r: radius }) : t('products.none_found')}
              </p>
              <p className="text-sm mt-1">{t('products.try_changing')}</p>
              <div className="flex justify-center gap-2 mt-5 flex-wrap">
                {activeCount > 0 && (
                  <button onClick={() => applyFilters({ ...EMPTY_FILTERS })} className="btn-secondary text-sm py-1.5 px-3">{t('filters.clear_all')}</button>
                )}
                {useNearby && radius < 100 && (
                  <button onClick={() => setRadius(100)} className="btn-primary text-sm py-1.5 px-3">{t('products.search_100')}</button>
                )}
                {useNearby && (
                  <button onClick={() => setNearbyOn(false)} className="btn-secondary text-sm py-1.5 px-3">{t('products.show_all')}</button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} onCartUpdate={() => {}} />)}
              </div>
              {/* Pagination */}
              {total > PAGE_SIZE && (
                <div className="flex justify-center gap-2 mt-8">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">{t('products.prev')}</button>
                  <span className="px-4 py-2 text-gray-600 text-sm self-center">{t('products.page_of', { page, pages })}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= pages} className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">{t('products.next')}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
