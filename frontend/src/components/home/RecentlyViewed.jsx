import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { getRecentlyViewed, addRecentlyViewed } from '../../utils/recentlyViewed';
import { IMG_PLACEHOLDER } from '../../utils/helpers';
import { getProducts } from '../../api/products';
import { useT } from '../../i18n';

export default function RecentlyViewed({ fallbackProducts = [] }) {
  const { t } = useT();
  const [items, setItems] = useState([]);

  const syncItems = useCallback(() => {
    const stored = getRecentlyViewed();
    if (stored && stored.length > 0) {
      setItems(stored);
    } else if (fallbackProducts && fallbackProducts.length > 0) {
      setItems(fallbackProducts.slice(0, 10));
    }
  }, [fallbackProducts]);

  useEffect(() => {
    syncItems();
  }, [syncItems]);

  // If no recently viewed products and fallback is empty, fetch top products as initial items
  useEffect(() => {
    const stored = getRecentlyViewed();
    if (stored.length === 0 && (!fallbackProducts || fallbackProducts.length === 0)) {
      getProducts({ page_size: 10 })
        .then((res) => {
          const prods = res.data?.results || res.data || [];
          if (prods.length > 0) {
            setItems((curr) => (curr.length === 0 ? prods.slice(0, 10) : curr));
          }
        })
        .catch(() => {});
    }
  }, [fallbackProducts]);

  // Listen to updates from other tabs or ProductDetail / ProductCard clicks
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e?.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setItems(e.detail);
      } else {
        syncItems();
      }
    };
    window.addEventListener('recently_viewed_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('recently_viewed_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [syncItems]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="bg-white border-b border-gray-100 py-3.5 shadow-2xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Top Header: Badge */}
        <div className="flex items-center mb-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300/80 rounded-xl text-xs font-semibold shadow-2xs">
            <Eye className="w-4 h-4 text-emerald-600" />
            <span>{t('home.recently_viewed')}</span>
          </div>
        </div>

        {/* Horizontal Row of Compact Product Cards (No scrollbar) */}
        <div
          className="flex items-center gap-3 sm:gap-3.5 overflow-x-auto scrollbar-none py-1 px-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/products/${item.id}`}
              onClick={() => addRecentlyViewed(item)}
              className="w-28 sm:w-32 md:w-36 flex-shrink-0 bg-white border border-gray-200/90 rounded-2xl p-2.5 flex flex-col items-center justify-between text-center hover:border-emerald-500 hover:shadow-md transition-all duration-200 group h-36"
            >
              <div className="h-20 w-full flex items-center justify-center p-1 overflow-hidden">
                <img
                  src={item.image || IMG_PLACEHOLDER}
                  alt={item.name}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = IMG_PLACEHOLDER;
                  }}
                />
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-gray-800 line-clamp-2 leading-tight group-hover:text-emerald-700 transition-colors w-full">
                {item.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
