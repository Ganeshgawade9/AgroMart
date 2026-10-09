import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Navigation, Check } from 'lucide-react';
import useLocation from '../../hooks/useLocation';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Listens for map clicks and drops the pin there
function ClickHandler({ onPick }) {
    useMapEvents({
        click(e) {
            onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}

export default function LocationPicker({ initialLat, initialLng, onSave, onClose }) {
    const startLat = initialLat ? Number(initialLat) : 20.5937;
    const startLng = initialLng ? Number(initialLng) : 78.9629;
    const [picked, setPicked] = useState(
        initialLat && initialLng ? { lat: startLat, lng: startLng } : null
    );
    const { location, loading: locLoading, getLocation } = useLocation();

    // When GPS location resolves, drop the pin there
    useEffect(() => {
        if (location) setPicked(location);
    }, [location]);

    return (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Set Shop Location</h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-500">Tap on the map to place a pin at your shop's location, or use your current location.</p>

                    <button
                        onClick={getLocation}
                        disabled={locLoading}
                        className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5 w-fit"
                    >
                        <Navigation className="w-3.5 h-3.5" /> {locLoading ? 'Getting location...' : 'Use My Current Location'}
                    </button>

                    <div style={{ height: '350px' }} className="rounded-lg overflow-hidden border border-gray-200">
                        <MapContainer
                            center={[startLat, startLng]}
                            zoom={picked ? 14 : 5}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <ClickHandler onPick={(pos) => setPicked(pos)} />
                            {picked && <Marker position={[picked.lat, picked.lng]} />}
                        </MapContainer>
                    </div>

                    {picked && (
                        <p className="text-xs text-gray-500">Selected: {picked.lat.toFixed(6)}, {picked.lng.toFixed(6)}</p>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button onClick={onClose} className="flex-1 btn-secondary py-2">Cancel</button>
                        <button
                            onClick={() => picked && onSave(picked)}
                            disabled={!picked}
                            className="flex-1 btn-primary py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            <Check className="w-4 h-4" /> Save Location
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}