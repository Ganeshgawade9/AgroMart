import api from './axios';

export const getNearbyShops = (lat, lng, radius = 20, mode = 'driving') =>
  api.get('/maps/nearby-shops/', { params: { lat, lng, radius, mode } });

export const getMapRoute = (originLat, originLng, destLat, destLng, mode = 'driving') =>
  api.get('/maps/route/', {
    params: {
      origin_lat: originLat,
      origin_lng: originLng,
      dest_lat: destLat,
      dest_lng: destLng,
      mode,
    },
  });

