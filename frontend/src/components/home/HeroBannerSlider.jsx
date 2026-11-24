import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { resolveBannerUrl } from '../../utils/helpers';


const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');


const DEFAULT_BANNERS = [
  {
    id: 'def-1',
    title: 'Navaratri Specials',
    subtitle: 'Celebrate Navaratri with Better Crop Care! Exciting Deals Await You!',
    image_url: `${BACKEND_BASE}/media/banners/navaratri_specials.png`,
    link_url: '/products?category_type=fertilizer',
  },
  {
    id: 'def-2',
    title: 'Janatha Agro - Goodness of Nature',
    subtitle: 'The goodness of nature that powers your crops! Honest products for the honest farmer.',
    image_url: `${BACKEND_BASE}/media/banners/janatha_agro.png`,
    link_url: '/products?is_organic=true',
  },
];

export default function HeroBannerSlider({ banners = [], autoSlideInterval = 4500 }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1840 / 576');
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const activeBanners = banners && banners.length > 0 ? banners : DEFAULT_BANNERS;
  const count = activeBanners.length;

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight && naturalWidth > 0 && naturalHeight > 0) {
      setAspectRatio(`${naturalWidth} / ${naturalHeight}`);
    }
  };

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  const goToSlide = (idx) => {
    setCurrentIndex(idx);
  };

  useEffect(() => {
    if (count <= 1 || isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, autoSlideInterval);
    return () => clearInterval(timer);
  }, [count, isPaused, autoSlideInterval, nextSlide]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 45) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

  const handleBannerClick = (banner) => {
    if (!banner?.link_url) return;
    if (banner.link_url.startsWith('http://') || banner.link_url.startsWith('https://')) {
      window.open(banner.link_url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(banner.link_url);
    }
  };

  if (count === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden bg-gray-100 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="relative w-full overflow-hidden bg-gray-100"
        style={{ aspectRatio }}
      >
        {activeBanners.map((banner, index) => {
          const isActive = index === currentIndex;
          const imageUrl = resolveBannerUrl(banner);

          return (
            <div
              key={banner.id || index}
              onClick={() => handleBannerClick(banner)}
              className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out cursor-pointer ${
                isActive ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-98 pointer-events-none z-0'
              }`}
            >
              <img
                src={imageUrl}
                alt={banner.title || 'AgroConnect Special Banner'}
                className="w-full h-full object-fill select-none"
                loading={index === 0 ? 'eager' : 'lazy'}
                onLoad={handleImageLoad}
                onError={(e) => {
                  // Fallback graceful banner gradient if image asset not ready
                  e.target.style.display = 'none';
                  e.target.nextSibling?.classList.remove('hidden');
                }}
              />

              {/* Fallback stylized banner card if image cannot be loaded */}
              <div className="hidden absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 text-white flex flex-col justify-center items-center text-center p-4 sm:p-6">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3 h-3" /> AgroConnect Specials
                </div>
                <h2 className="text-xl sm:text-3xl font-extrabold max-w-2xl leading-tight mb-1 sm:mb-2">
                  {banner.title || 'Special Farm Deals & Offers'}
                </h2>
                {banner.subtitle && (
                  <p className="text-xs sm:text-base text-white/90 max-w-lg mb-3 line-clamp-1 sm:line-clamp-2">
                    {banner.subtitle}
                  </p>
                )}
                {banner.link_url && (
                  <span className="bg-white text-emerald-800 font-semibold px-3 py-1.5 rounded-lg text-xs shadow hover:bg-emerald-50 transition-colors">
                    Explore Offers &rarr;
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Bottom indicator dots */}
        {count > 1 && (
          <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
                  idx === currentIndex
                    ? 'bg-green-600 ring-1 ring-white shadow-xs'
                    : 'bg-white/70 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );



}
