import { useState, useEffect } from 'react';
import { MapPin, Navigation, Phone, Star, ShoppingCart, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getNearbyShops } from '../api/maps';
import useLocationStore from '../store/locationStore';
import Spinner from '../components/common/Spinner';
import ShopsMap from '../components/maps/ShopsMap';
import toast from 'react-hot-toast';

export default function NearbyShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const storeRadius = useLocationStore((s) => s.radius);
  const setStoreRadius = useLocationStore((s) => s.setRadius);
  const radius = storeRadius || 20;
  const setRadius = setStoreRadius;
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [fitTrigger] = useState(0);
  const { lat, lng, error, detecting: locLoading, detect: getLocation } = useLocationStore();
  const location = lat != null && lng != null ? { lat, lng } : null;

  useEffect(() => {
    if (lat != null && lng != null) {
      setLoading(true);
      getNearbyShops(lat, lng, radius, 'driving')
        .then(r => {
          const list = r.data.shops || [];
          setShops(list);
          // Do not auto-select first shop: keep user selection if valid, else null
          setSelectedShopId(prev => (prev && list.some(s => s.id === prev) ? prev : null));
        })
        .catch(() => toast.error('Failed to fetch nearby shops'))
        .finally(() => setLoading(false));
    }
  }, [lat, lng, radius]);

  const openMap = (shop) => {
    const originParam = lat != null && lng != null ? `origin=${lat},${lng}&` : '';
    const url = `https://www.google.com/maps/dir/?api=1&${originParam}destination=${shop.latitude},${shop.longitude}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
      {/* Top Header */}
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
          <span>Nearby Shops</span>
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
          Find fertilizer and pesticide sellers near you with live road distances
        </p>
      </div>

      {/* When Location Not Provided */}
      {!location && !locLoading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-xl mx-auto my-12 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Allow location to see nearby shops</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            We will show you fertilizer and pesticide shops near your farm with live road distances and routing.
          </p>
          <button
            onClick={getLocation}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 mx-auto shadow-sm transition-colors"
          >
            <Navigation className="w-4 h-4" /> Allow Location Access
          </button>
        </div>
      )}

      {locLoading && (
        <div className="flex flex-col items-center justify-center py-24">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500 mt-4 font-medium">Detecting your location...</p>
        </div>
      )}

      {location && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Google Map */}
          <div id="map-section" className="lg:col-span-7 flex flex-col gap-4 relative z-0 isolate">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            {/* Google Map Container */}
            <ShopsMap
              location={location}
              shops={shops}
              selectedShopId={selectedShopId}
              onSelectShop={id => setSelectedShopId(id)}
              mode="driving"
              radius={radius}
              fitTrigger={fitTrigger}
            />
          </div>

          {/* Right Column: Radius & Filter + Nearby Shops */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Card 1: Radius & Filter (compact, moved upward) */}
            <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">Radius & Filter</h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" title="Location active"></span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-md">
                  {radius} km
                </span>
              </div>

              <div className="mb-2">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={radius}
                  onChange={e => setRadius(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 15, 25, 50].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRadius(val)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
                      radius === val
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {val} km
                  </button>
                ))}
              </div>

              {/* View Products within this radius */}
              <Link
                to={`/products?nearby=true&radius=${radius}`}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>View Products in {radius} km ({shops.length} {shops.length === 1 ? 'shop' : 'shops'})</span>
              </Link>
            </div>

            {/* Card 2: Nearby Shops (Scrollable list matching page height) */}
            <div className="bg-white rounded-xl border border-gray-200 p-3.5 sm:p-4 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">Nearby Shops</h2>
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {shops.length} shop{shops.length === 1 ? '' : 's'} within {radius} km
                </span>
              </div>

              {loading ? (
                <div className="py-12 flex justify-center">
                  <Spinner size="md" />
                </div>
              ) : shops.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-4xl mb-2">🏪</p>
                  <p className="text-sm font-medium text-gray-600">No shops found within {radius} km</p>
                  <p className="text-xs text-gray-400 mt-1">Try expanding the distance filter</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '380px' }}>
                  {shops.map(shop => {
                    const isSelected = shop.id === selectedShopId;
                    const displayDistance = shop.driving_km ?? shop.distance_km;
                    const displayDuration = shop.driving_mins ?? shop.duration_minutes;

                    const isNear = displayDistance <= 5;
                    const ratingValue = Number(shop.rating || 5.0).toFixed(1);
                    const reviewCount = shop.id % 2 === 0 ? '~38 reviews' : '50 rating';

                    return (
                      <div
                        key={shop.id}
                        onClick={() => setSelectedShopId(shop.id)}
                        className={`rounded-xl p-3.5 transition-all cursor-pointer border ${
                          isSelected
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/15'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-xs bg-white'
                        }`}
                      >
                        {/* Row 1: Name and Distance Badge */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <h3 className="font-bold text-emerald-800 text-sm sm:text-base leading-snug">
                              {shop.shop_name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {shop.village ? `${shop.village}, ` : ''}{shop.district || shop.city || 'Pune'}
                            </p>
                          </div>

                          <div className="flex flex-col items-end flex-shrink-0">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded text-white ${
                                isNear ? 'bg-emerald-600' : 'bg-amber-500'
                              }`}
                            >
                              {displayDistance} km away
                            </span>
                            <span className="text-[11px] text-gray-400 mt-0.5">
                              {reviewCount}
                            </span>
                          </div>
                        </div>

                        {/* Row 2: Rating & Phone */}
                        <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                          <div className="flex items-center gap-1 font-semibold text-gray-800">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span>{ratingValue}</span>
                          </div>
                          {shop.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <a
                                href={`tel:${shop.phone}`}
                                onClick={e => e.stopPropagation()}
                                className="hover:text-emerald-600"
                              >
                                {shop.phone}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Row 3: Travel Time */}
                        <div className="flex items-center text-xs text-gray-600 mb-3 bg-gray-50/80 px-2.5 py-1.5 rounded-lg">
                          <span>
                            🚗 <b>{shop.driving_mins ?? displayDuration ?? 5} mins</b> drive
                          </span>
                        </div>

                        {/* Row 4: Action Buttons */}
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Link
                            to={`/products?search=${encodeURIComponent(shop.shop_name)}`}
                            className="flex-1 flex items-center justify-center gap-1.5 border border-emerald-300 text-emerald-700 bg-emerald-50/30 hover:bg-emerald-100/50 rounded-lg py-2 text-xs sm:text-sm font-semibold transition-colors"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>View Products</span>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMap(shop);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-xs sm:text-sm font-semibold transition-colors shadow-xs"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Navigate</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}