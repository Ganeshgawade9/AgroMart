import { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Crosshair, Search, X, Loader2 } from 'lucide-react';
import useLocationStore from '../../store/locationStore';
import { searchPlaces } from '../../utils/geocode';
import { useT } from '../../i18n';
import toast from 'react-hot-toast';

// Zomato-style location pill for the navbar: tap -> detect live GPS location
// or search for an area manually.
export default function LocationSelector() {
  const { t } = useT();
  const { lat, lng, label, detecting, error, detect, setManual, clear } = useLocationStore();
  const hasLocation = lat != null && lng != null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced place search (Nominatim asks for ~1 request/second)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setResults([]); setSearching(false); return; }
    const controller = new AbortController();
    setSearching(true);
    const t = setTimeout(() => {
      searchPlaces(q, controller.signal)
        .then(setResults)
        .catch((e) => { if (e.name !== 'AbortError') setResults([]); })
        .finally(() => setSearching(false));
    }, 600);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);

  const handleDetect = async () => {
    const ok = await detect();
    if (ok) {
      setOpen(false);
      toast.success(t('loc.updated'));
    }
  };

  const handlePick = (place) => {
    setManual({ lat: place.lat, lng: place.lng, label: place.label });
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 max-w-[150px] sm:max-w-[200px] px-2.5 py-2 rounded-lg border border-gray-300 hover:border-primary-400 text-sm text-gray-700 transition-colors"
        title={hasLocation ? label : t('loc.set_location')}
      >
        {detecting ? (
          <Loader2 className="w-4 h-4 text-primary-600 animate-spin flex-shrink-0" />
        ) : (
          <MapPin className="w-4 h-4 text-primary-600 flex-shrink-0" />
        )}
        <span className="truncate">
          {detecting ? t('loc.locating') : hasLocation ? label || t('loc.current') : t('loc.set_location_short')}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-[min(20rem,90vw)] bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('loc.search_placeholder')}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searching && <p className="text-xs text-gray-400 mt-2 px-1">{t('loc.searching')}</p>}
          {results.length > 0 && (
            <ul className="mt-2 max-h-56 overflow-y-auto divide-y divide-gray-50">
              {results.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => handlePick(p)} className="w-full text-left px-2 py-2 hover:bg-primary-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-800">{p.label}</p>
                    <p className="text-xs text-gray-500 truncate">{p.full}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && query.trim().length >= 3 && results.length === 0 && (
            <p className="text-xs text-gray-400 mt-2 px-1">{t('loc.no_places')}</p>
          )}

          <button
            type="button"
            onClick={handleDetect}
            disabled={detecting}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-primary-700 font-medium text-sm hover:bg-primary-50 border border-primary-200 disabled:opacity-60"
          >
            {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            {detecting ? t('loc.detecting') : t('loc.detect')}
          </button>

          {error && <p className="text-xs text-red-500 mt-2 px-1">{error}</p>}

          {hasLocation && (
            <button
              type="button"
              onClick={() => { clear(); setOpen(false); }}
              className="mt-2 w-full text-xs text-gray-500 hover:text-red-500 py-1"
            >
              Remove location
            </button>
          )}
        </div>
      )}
    </div>
  );
}
