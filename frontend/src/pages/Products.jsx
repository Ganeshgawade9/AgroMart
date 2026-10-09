import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid, List, MapPin, SlidersHorizontal } from 'lucide-react';
import { getProducts } from '../api/products';
import ProductCard from '../components/products/ProductCard';
import FilterSidebar from '../components/products/FilterSidebar';
import Spinner from '../components/common/Spinner';
import useLocation from '../hooks/useLocation';
import toast from 'react-hot-toast';

export default function Products() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [showFilterMobile, setShowFilterMobile] = useState(false);
  const [ordering, setOrdering] = useState('-created_at');
  const { location, getLocation } = useLocation();

  const searchQuery = searchParams.get('search') || '';
  const categoryType = searchParams.get('category_type') || '';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page, ordering };
      if (searchQuery) params.search = searchQuery;
      if (categoryType) params.category_type = categoryType;
      const res = await getProducts(params);
      setProducts(res.data.results || res.data);
      setTotal(res.data.count || 0);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [filters, page, ordering, searchQuery, categoryType]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleLocationFilter = () => {
    if (location) {
      setFilters(f => ({ ...f, lat: location.lat, lng: location.lng, radius: 20 }));
    } else {
      getLocation();
      toast.loading('Getting your location...');
    }
  };

  useEffect(() => {
    if (location && !filters.lat) {
      setFilters(f => ({ ...f, lat: location.lat, lng: location.lng }));
    }
  }, [location]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {searchQuery ? `Results for "${searchQuery}"` : categoryType ? `${categoryType.charAt(0).toUpperCase() + categoryType.slice(1)}s` : 'All Products'}
          </h1>
          {!loading && <p className="text-gray-500 text-sm mt-0.5">{total} products found</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleLocationFilter} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${filters.lat ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-700 hover:border-primary-400'}`}>
            <MapPin className="w-4 h-4" /> {filters.lat ? 'Nearby On' : 'Nearby'}
          </button>
          <select value={ordering} onChange={e => setOrdering(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
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

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`w-64 flex-shrink-0 ${showFilterMobile ? 'block fixed inset-0 z-50 bg-white overflow-y-auto p-4 md:static md:bg-transparent md:p-0' : 'hidden md:block'}`}>
          {showFilterMobile && <button onClick={() => setShowFilterMobile(false)} className="mb-4 text-sm text-primary-600 font-medium md:hidden">✕ Close Filters</button>}
          <FilterSidebar filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} userLocation={location} />
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center items-center py-20"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm mt-1">Try changing your filters or search term</p>
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
