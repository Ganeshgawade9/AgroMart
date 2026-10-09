import api from './axios';
export const getNearbyShops = (lat, lng, radius = 20) => api.get('/maps/nearby-shops/', { params: { lat, lng, radius } });
