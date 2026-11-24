import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapRoute } from '../../api/maps';

// Free Google Maps Tile Layer Configs
const GOOGLE_MAP_TYPES = {
  roadmap: {
    name: 'Map',
    icon: '🗺️',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps',
  },
  satellite: {
    name: 'Satellite',
    icon: '🛰️',
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps',
  },
  terrain: {
    name: 'Terrain',
    icon: '⛰️',
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps',
  },
};

// User location marker: Blue pulsing Google location dot
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `<div style="
    position: relative;
    width: 22px;
    height: 22px;
  ">
    <div style="
      position: absolute;
      inset: -5px;
      background: rgba(37, 99, 235, 0.3);
      border-radius: 50%;
      animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
    "></div>
    <div style="
      position: relative;
      background: #2563eb;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    "></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Google Maps store icon (white shopping bag inside red circle)
const SHOPPING_BAG_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="white" style="display:block"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3h-6c0-1.66 1.34-3 3-3zm7 17H5V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h6v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/></svg>`;

// Helper for shop icons without numbers (Google Maps retail style)
const getShopIcon = (shop, isSelected) => {
  if (isSelected) {
    return L.divIcon({
      className: 'custom-shop-active-marker',
      html: `<div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transform: translate(-14px, -100%);
        cursor: pointer;
        white-space: nowrap;
        z-index: 1000;
        filter: drop-shadow(0 3px 8px rgba(0,0,0,0.35));
      ">
        <div style="
          background: #059669;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.4);
        ">
          ${SHOPPING_BAG_SVG}
        </div>
        <span style="
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
          background: #059669;
          padding: 3px 9px;
          border-radius: 12px;
          border: 1.5px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          ${shop.shop_name}
        </span>
      </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }

  return L.divIcon({
    className: 'custom-shop-pin',
    html: `<div style="
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transform: translate(-13px, -50%);
      cursor: pointer;
      white-space: nowrap;
    ">
      <div style="
        background: #EA4335;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">
        ${SHOPPING_BAG_SVG}
      </div>
      <span style="
        font-size: 11px;
        font-weight: 700;
        color: #1f2937;
        background: rgba(255, 255, 255, 0.92);
        padding: 1px 6px;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        border: 1px solid rgba(0,0,0,0.06);
        pointer-events: none;
      ">
        ${shop.shop_name}
      </span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

function MapController({ location, activeShop, routeCoords, fitTrigger, radius }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (activeShop && routeCoords && routeCoords.length > 1) {
      try {
        const bounds = L.latLngBounds(routeCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch {
        // ignore bounds calculation error
      }
    } else if (activeShop?.latitude && activeShop?.longitude && location?.lat) {
      try {
        const bounds = L.latLngBounds([
          [location.lat, location.lng],
          [activeShop.latitude, activeShop.longitude],
        ]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      } catch {
        // ignore bounds calculation error
      }
    } else if (location?.lat && location?.lng) {
      const zoom = radius > 35 ? 10 : radius > 18 ? 11 : 12;
      map.setView([location.lat, location.lng], zoom);
    }
  }, [location?.lat, location?.lng, activeShop?.id, activeShop?.latitude, activeShop?.longitude, routeCoords, fitTrigger, radius, map, activeShop]);

  return null;
}

export default function ShopsMap({
  location,
  shops,
  selectedShopId,
  onSelectShop,
  mode = 'driving',
  radius = 15,
  fitTrigger,
}) {
  const [routeCoords, setRouteCoords] = useState([]);
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'satellite' | 'terrain'

  // Only consider activeShop if explicitly selected by user click
  const activeShop = selectedShopId ? shops?.find(s => s.id === selectedShopId) : null;

  useEffect(() => {
    if (!activeShop || !location?.lat || !location?.lng || !activeShop?.latitude || !activeShop?.longitude) {
      setRouteCoords([]);
      return;
    }

    let isMounted = true;
    getMapRoute(location.lat, location.lng, activeShop.latitude, activeShop.longitude, mode)
      .then(res => {
        if (!isMounted) return;
        const data = res.data;
        if (data?.coordinates && data.coordinates.length > 0) {
          setRouteCoords(data.coordinates);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRouteCoords([[location.lat, location.lng], [activeShop.latitude, activeShop.longitude]]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [location?.lat, location?.lng, activeShop?.latitude, activeShop?.longitude, activeShop?.id, mode, activeShop]);

  if (!location) return null;

  const openGoogleMaps = (shop) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lng}&destination=${shop.latitude},${shop.longitude}&travelmode=${mode}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const currentTileConfig = GOOGLE_MAP_TYPES[mapType] || GOOGLE_MAP_TYPES.roadmap;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-xs border border-gray-200 relative z-0 isolate">
      {/* Map Container with Google Maps layer switch */}
      <div className="relative" style={{ height: '560px', width: '100%' }}>
        {/* Floating Google Map Type Selector */}
        <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-xs border border-gray-200 rounded-lg p-1 shadow-md flex items-center gap-1 text-xs font-semibold">
          {Object.entries(GOOGLE_MAP_TYPES).map(([typeKey, cfg]) => (
            <button
              key={typeKey}
              type="button"
              onClick={() => setMapType(typeKey)}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                mapType === typeKey
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.name}</span>
            </button>
          ))}
        </div>

        <MapContainer
          center={[location.lat, location.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          {/* Authentic Free Google Maps Tiles */}
          <TileLayer
            key={mapType}
            attribution={currentTileConfig.attribution}
            url={currentTileConfig.url}
            subdomains={currentTileConfig.subdomains}
            maxZoom={currentTileConfig.maxZoom}
          />

          <MapController
            location={location}
            activeShop={activeShop}
            routeCoords={routeCoords}
            fitTrigger={fitTrigger}
            radius={radius}
          />

          {/* Green Translucent Search Radius Circle */}
          <Circle
            center={[location.lat, location.lng]}
            radius={radius * 1000}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.14,
              weight: 1.5,
            }}
          />

          {/* User Location Marker */}
          <Marker position={[location.lat, location.lng]} icon={userIcon}>
            <Popup>
              <div className="text-xs p-1">
                <strong className="text-blue-600 block text-sm">📍 Your Location</strong>
                <span className="text-gray-500">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
              </div>
            </Popup>
          </Marker>

          {/* Actual Road Route Line - only when a shop is clicked/selected */}
          {activeShop && routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: '#2563eb',
                weight: 5,
                opacity: 0.9,
              }}
            />
          )}

          {/* Shop Markers */}
          {shops.map((shop) => {
            const isSelected = shop.id === (activeShop?.id ?? selectedShopId);
            return (
              <Marker
                key={shop.id}
                position={[shop.latitude, shop.longitude]}
                icon={getShopIcon(shop, isSelected)}
                eventHandlers={{
                  click: () => onSelectShop && onSelectShop(shop.id),
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1">
                    <strong className="text-sm font-bold text-gray-900 block">{shop.shop_name}</strong>
                    <p className="text-gray-600">{shop.village}, {shop.district}</p>
                    <div className="pt-1 border-t border-gray-100 flex flex-col gap-0.5">
                      <span className="font-semibold text-emerald-700">
                        🚗 Road Distance: {shop.driving_km ?? shop.distance_km} km (~{shop.driving_mins ?? shop.duration_minutes} min)
                      </span>
                    </div>
                    <button
                      onClick={() => openGoogleMaps(shop)}
                      className="mt-2 w-full bg-emerald-600 text-white text-[11px] font-semibold py-1 px-2 rounded hover:bg-emerald-700 transition-colors"
                    >
                      Open Google Maps Route &rarr;
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}