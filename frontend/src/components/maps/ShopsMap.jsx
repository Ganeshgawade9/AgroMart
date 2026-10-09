import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons (Leaflet + bundlers issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function ShopsMap({ location, shops }) {
    if (!location) return null;

    return (
        <div className="card mb-6 p-0 overflow-hidden" style={{ height: '400px' }}>
            <MapContainer
                center={[location.lat, location.lng]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={[location.lat, location.lng]}>
                    <Popup>You are here</Popup>
                </Marker>

                {shops.map(shop => (
                    <Marker key={shop.id} position={[shop.latitude, shop.longitude]}>
                        <Popup>
                            <strong>{shop.shop_name}</strong>
                            <br />
                            {shop.village}, {shop.district}
                            <br />
                            {shop.distance_km} km away
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}