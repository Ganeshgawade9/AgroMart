import { useState, useEffect } from 'react';
import { MapPin, Navigation, Phone, Star, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getNearbyShops } from '../api/maps';
import useLocation from '../hooks/useLocation';
import Spinner from '../components/common/Spinner';
import ShopsMap from '../components/maps/ShopsMap';
import toast from 'react-hot-toast';

export default function NearbyShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(20);
  const { location, error, loading: locLoading, getLocation } = useLocation();

  useEffect(() => {
    if (location) {
      setLoading(true);
      getNearbyShops(location.lat, location.lng, radius)
        .then(r => setShops(r.data.shops || []))
        .catch(() => toast.error('Failed to fetch nearby shops'))
        .finally(() => setLoading(false));
    }
  }, [location, radius]);

  const openMap = (shop) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary-600" /> Nearby Shops
        </h1>
        <p className="text-gray-500 text-sm mt-1">Find fertilizer and pesticide sellers near you</p>
      </div>

      {/* Location & controls */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={getLocation} disabled={locLoading}
            className="btn-primary flex items-center gap-2 py-2">
            <Navigation className="w-4 h-4" />
            {locLoading ? 'Getting location...' : location ? 'Refresh Location' : 'Use My Location'}
          </button>

          {location && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Radius:</label>
              <select value={radius} onChange={e => setRadius(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value={1}>1 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={500}>500 km</option>
              </select>
            </div>
          )}

          {location && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
              Location found
            </span>
          )}

          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </div>

      {location && !loading && shops.length > 0 && (
        <ShopsMap location={location} shops={shops} />
      )}

      {!location && !locLoading && (
        <div className="text-center py-20 text-gray-400">
          <MapPin className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">Allow location to see nearby shops</p>
          <p className="text-sm mb-6">We'll show you fertilizer and pesticide shops near your farm</p>
          <button onClick={getLocation} className="btn-primary flex items-center gap-2 mx-auto">
            <Navigation className="w-4 h-4" /> Allow Location Access
          </button>
        </div>
      )}

      {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

      {!loading && location && shops.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-6xl mb-4">🏪</p>
          <p className="text-lg">No shops found within {radius} km</p>
          <p className="text-sm mt-1">Try increasing the radius</p>
        </div>
      )}

      {!loading && shops.length > 0 && (
        <>
          <p className="text-sm text-gray-600 mb-4 font-medium">{shops.length} shop(s) found within {radius} km</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map(shop => (
              <div key={shop.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{shop.shop_name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{shop.village}, {shop.district}</p>
                  </div>
                  <span className="badge-green ml-2 flex-shrink-0">{shop.distance_km} km</span>
                </div>

                <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span>{Number(shop.rating).toFixed(1)}</span>
                  </div>
                  {shop.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      <a href={`tel:${shop.phone}`} className="hover:text-primary-600">{shop.phone}</a>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link to={`/products?search=${encodeURIComponent(shop.shop_name)}`}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-primary-300 text-primary-700 rounded-lg py-2 text-sm font-medium hover:bg-primary-50 transition-colors">
                    <Package className="w-3.5 h-3.5" /> Products
                  </Link>
                  <button onClick={() => openMap(shop)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 transition-colors">
                    <Navigation className="w-3.5 h-3.5" /> Navigate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}