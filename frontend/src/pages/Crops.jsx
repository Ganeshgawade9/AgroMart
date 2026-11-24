import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, ChevronLeft, Sprout } from 'lucide-react';
import { useT } from '../i18n';
import { ALL_CROPS } from '../data/crops';
import { IMG_PLACEHOLDER } from '../utils/helpers';
import { getCropsApi } from '../api/products';

export default function Crops() {
  const { t } = useT();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [cropsList, setCropsList] = useState(ALL_CROPS);

  useEffect(() => {
    getCropsApi()
      .then((res) => {
        const data = res.data?.results || res.data;
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map((c) => {
            const local = ALL_CROPS.find((a) => a.id === c.slug) || {};
            return {
              id: c.slug || c.id,
              name: c.name,
              searchQuery: c.search_query || local.searchQuery || c.name,
              image: c.image || c.default_image || local.image,
              aliases: local.aliases || [c.name.toLowerCase()],
            };
          });
          setCropsList(merged);
        }
      })
      .catch(() => {});
  }, []);

  const filteredCrops = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return cropsList;

    return cropsList.filter((crop) => {
      if (crop.name.toLowerCase().includes(q)) return true;
      if (crop.searchQuery && crop.searchQuery.toLowerCase().includes(q)) return true;
      if (crop.aliases && crop.aliases.some((alias) => alias.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [searchTerm, cropsList]);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Back navigation */}
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-primary-600 text-sm mb-4 font-medium transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back') || 'Back'}
        </button>

        {/* Page Title & Subtitle */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight flex items-center justify-center gap-2">
            <span>{t('crops.title')}</span>
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-2">
            {t('crops.subtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('crops.search_placeholder')}
              className="w-full pl-11 pr-11 py-3 text-sm sm:text-base bg-white border border-gray-300 rounded-full shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              {t('crops.showing_count', { count: filteredCrops.length })}
            </p>
          )}
        </div>

        {/* Crops Grid */}
        {filteredCrops.length > 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-10 shadow-xs">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-y-8 gap-x-4 sm:gap-x-6 justify-items-center">
              {filteredCrops.map((crop) => {
                const query = crop.searchQuery || crop.name;
                return (
                  <Link
                    key={crop.id}
                    to={`/products?search=${encodeURIComponent(query)}`}
                    className="flex flex-col items-center group text-center cursor-pointer w-full max-w-[120px]"
                  >
                    {/* Circle Tile */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border border-gray-200 bg-white flex items-center justify-center p-3 relative overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-primary-500 shadow-2xs group-hover:shadow-md">
                      <img
                        src={crop.image}
                        alt={crop.name}
                        loading="lazy"
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = IMG_PLACEHOLDER;
                        }}
                      />
                    </div>

                    {/* Crop Name */}
                    <span className="mt-2.5 text-xs sm:text-sm font-medium text-gray-800 group-hover:text-primary-700 transition-colors leading-tight line-clamp-2">
                      {crop.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center max-w-lg mx-auto shadow-xs">
            <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              {t('crops.no_results', { query: searchTerm })}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Try searching with another crop name like Tomato, Chilli, Cotton, Onion, or Maize.
            </p>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="btn-primary text-xs py-1.5 px-4"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
