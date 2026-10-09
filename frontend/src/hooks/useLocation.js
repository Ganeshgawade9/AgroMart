import { useState, useCallback } from 'react';

export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLoading(false); },
      (err) => { setError(err.message); setLoading(false); }
    );
  }, []);

  return { location, error, loading, getLocation };
}
