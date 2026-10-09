import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { reverseGeocode } from '../utils/geocode';

const GPS_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 };

const errorMessage = (err) => {
  if (err?.code === 1) return 'Location permission is blocked. Allow it in your browser settings, or search your area instead.';
  if (err?.code === 2) return 'Could not determine your location. Please try again or search your area.';
  if (err?.code === 3) return 'Location request timed out. Please try again.';
  return 'Could not get your location.';
};

// Shared across Navbar, Home, Products and Nearby Shops so the user picks
// their location once and every page uses it (like Zomato's location bar).
const useLocationStore = create(
  persist(
    (set, get) => ({
      lat: null,
      lng: null,
      label: '',
      source: null, // 'gps' | 'manual'
      detecting: false,
      error: null,

      hasLocation: () => get().lat != null && get().lng != null,

      // Asks the browser for the live GPS position, then resolves a readable place name
      detect: () =>
        new Promise((resolve) => {
          if (!navigator.geolocation) {
            set({ error: 'Your browser does not support location access.' });
            return resolve(false);
          }
          set({ detecting: true, error: null });
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude: lat, longitude: lng } = pos.coords;
              // Save coordinates right away so results load without waiting for the place name
              set({ lat, lng, label: 'Current location', source: 'gps' });
              const label = await reverseGeocode(lat, lng);
              set({ label, detecting: false });
              resolve(true);
            },
            (err) => {
              set({ detecting: false, error: errorMessage(err) });
              resolve(false);
            },
            GPS_OPTIONS
          );
        }),

      setManual: ({ lat, lng, label }) =>
        set({ lat, lng, label, source: 'manual', error: null }),

      clear: () => set({ lat: null, lng: null, label: '', source: null, error: null }),
    }),
    {
      name: 'location-store',
      partialize: (s) => ({ lat: s.lat, lng: s.lng, label: s.label, source: s.source }),
    }
  )
);

export default useLocationStore;
