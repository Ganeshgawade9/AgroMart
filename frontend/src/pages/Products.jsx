import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, SlidersHorizontal, Crosshair } from 'lucide-react';
import { getProducts } from '../api/products';
import ProductCard from '../components/products/ProductCard';
import FilterSidebar from '../components/products/FilterSidebar';
import Spinner from '../components/common/Spinner';
import useLocationStore from '../store/locationStore';
import toast from 'react-hot-toast';

const DEFAULT_RADIUS = 20;

export default function Products() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [showFilterMobile, setShowFilterMobile] = useState(false);

  // Location is shared app-wide (set from the navbar). When it is on, products
  // are limited to shops within `radius` km and sorted nearest first.
  const { lat, lng, label, detecting, error, detect } = useLocationStore();
  const hasLocation = lat != null && lng != null;
  const [nearbyOn, setNearbyOn] = useState(true);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const useNearby = hasLocation && nearbyOn;

  const [ordering, setOrdering] = useState(hasLocation ? 'distance' : '-created_at');

  const searchQuery = searchParams.get('search') || '';
  const categoryType = searchParams.get('category_type') || '';
  const sellerId = searchParams.get('seller') || '';

  // Switch to "Nearest first" when a location appears, and back when it goes away
  useEffect(() => {
    setPage(1);
    setOrdering((o) => {
      if (hasLocation && o === '-created_at') return 'distance';
      if (!hasLocation && o === 'distance') return '-created_at';
      return o;
    });
  }, [hasLocation, lat, lng]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page, ordering };
      if (searchQuery) params.search = searchQuery;
      if (categoryType) params.category_type = categoryType;
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
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [filters, page, ordering, searchQuery, categoryType, sellerId, useNearby, lat, lng, radius]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleNearbyToggle = async () => {
    if (!hasLocation) {
      const ok = await detect();
      if (ok) { setNearbyOn(true); setPage(1); }
      else toast.error(useLocationStore.getState().error || 'Could not get your location');
      return;
    }
    setNearbyOn((on) => !on);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {searchQuery ? `Results for "${searchQuery}"` : categoryType ? `${categoryType.charAt(0).toUpperCase() + categoryType.slice(1)}s` : 'All Products'}
          </h1>
          {!loading && (
            <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1 flex-wrap">
              {total} products found
              {useNearby && (
                <span className="inline-flex items-center gap-1 text-primary-700">
                  · <MapPin className="w-3.5 h-3.5" /> within {radius} km of {label || 'your location'}
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
            <MapPin className="w-4 h-4" /> {detecting ? 'Locating...' : useNearby ? 'Nearby On' : 'Nearby'}
          </button>
          <select value={ordering} onChange={e => { setOrdering(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            {useNearby && <option value="distance">Nearest First</option>}
            <option value="-created_at">Newest First</option>
            <option value="price">Price: Low to High</option>
            <option value="-price">Price: High to Low</option>
            <option value="-rating">Top Rated</option>
          </select>
          <button onClick={() => setShowFilterMobile(!showFilterMobile)} className="md:hidden border border-gray-300 p-2 rounded-lg">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prompt to set location when none is set */}
      {!hasLocation && (
        <div className="mb-6 flex items-center gap-3 flex-wrap bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
          <Crosshair className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <p className="text-sm text-gray-700 flex-1 min-w-[200px]">
            Share your location to see products from the nearest shops, with distance.
          </p>
          <button onClick={handleNearbyToggle} disabled={detecting} className="btn-primary text-sm py-1.5 px-3">
            {detecting ? 'Detecting...' : 'Use my location'}
          </button>
          {error && <p className="w-full text-xs text-red-500">{error}</p>}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`w-64 flex-shrink-0 ${showFilterMobile ? 'block fixed inset-0 z-50 bg-white overflow-y-auto p-4 md:static md:bg-transparent md:p-0' : 'hidden md:block'}`}>
          {showFilterMobile && <button onClick={() => setShowFilterMobile(false)} className="mb-4 text-sm text-primary-600 font-medium md:hidden">✕ Close Filters</button>}
          <FilterSidebar
            filters={filters}
            onChange={(f) => { setFilters(f); setPage(1); }}
            showDistance={useNearby}
            radius={radius}
            onRadiusChange={(r) => { setRadius(r); setPage(1); }}
          />
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center items-center py-20"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-lg font-medium">
                {useNearby ? `No products found within ${radius} km` : 'No products found'}
              </p>
              <p className="text-sm mt-1">Try changing your filters or search term</p>
              {useNearby && (
                <div className="flex justify-center gap-2 mt-5">
                  {radius < 100 && (
                    <button onClick={() => setRadius(100)} className="btn-primary text-sm py-1.5 px-3">Search within 100 km</button>
                  )}
                  <button onClick={() => setNearbyOn(false)} className="btn-secondary text-sm py-1.5 px-3">Show all products</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} onCartUpdate={() => {}} />)}
              </div>
              {/* Pagination */}
              {total > 20 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <span className="px-4 py-2 text-gray-600 text-sm self-center">Page {page} of {Math.ceil(total / 20)}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
