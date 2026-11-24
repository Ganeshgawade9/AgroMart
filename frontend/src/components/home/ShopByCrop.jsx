import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { FEATURED_CROPS } from '../../data/crops';
import { IMG_PLACEHOLDER } from '../../utils/helpers';
import { getCropsApi } from '../../api/products';

export default function ShopByCrop() {
  const { t } = useT();
  const [crops, setCrops] = useState(FEATURED_CROPS);

  useEffect(() => {
    getCropsApi({ featured: 'true' })
      .then((res) => {
        const data = res.data?.results || res.data;
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map((item) => {
            const fallback = FEATURED_CROPS.find((c) => c.id === item.slug) || {};
            return {
              id: item.slug || item.id,
              name: item.name || fallback.name,
              searchQuery: item.search_query || fallback.searchQuery || item.name,
              image: item.image || item.default_image || fallback.image,
            };
          });
          setCrops(merged);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>{t('home.shop_by_crop')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {t('home.crop_solutions')}
          </p>
        </div>
        <div>
          <Link
            to="/crops"
            className="inline-flex items-center justify-center border border-gray-800 text-gray-800 hover:bg-gray-900 hover:text-white px-3.5 py-1 sm:px-4 sm:py-1.5 rounded text-xs sm:text-sm font-semibold transition-colors"
          >
            {t('home.view_all')}
          </Link>
        </div>
      </div>

      {/* Horizontal Scrollable Row of Circular Crops */}
      <div
        className="flex items-start gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-2 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {crops.map((crop) => {
          const query = crop.searchQuery || crop.name;
          return (
            <Link
              key={crop.id}
              to={`/products?search=${encodeURIComponent(query)}`}
              className="flex flex-col items-center flex-shrink-0 group text-center cursor-pointer"
            >
              {/* Circular Tile */}
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

              {/* Crop Label */}
              <span className="mt-2 text-xs sm:text-sm font-medium text-gray-800 group-hover:text-primary-700 transition-colors leading-tight max-w-[90px] sm:max-w-[100px] truncate">
                {crop.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
