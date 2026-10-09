import api from './axios';

// Rider (delivery partner) side
export const getDuty = () => api.get('/orders/delivery/duty/');
export const setDuty = (data) => api.post('/orders/delivery/duty/', data);
export const pingLocation = (lat, lng) => api.post('/orders/delivery/location/', { lat, lng });
export const getOffers = () => api.get('/orders/delivery/offers/');
export const acceptOffer = (id) => api.post(`/orders/delivery/offers/${id}/accept/`);
export const declineOffer = (id) => api.post(`/orders/delivery/offers/${id}/decline/`);
export const getMyDeliveries = () => api.get('/orders/delivery/my-deliveries/');
// otp: the pickup OTP the shop received by SMS
export const confirmPickup = (orderId, otp) => api.post(`/orders/delivery/${orderId}/pickup/`, { otp });
export const confirmDelivery = (orderId, otp) => api.post(`/orders/delivery/${orderId}/deliver/`, { otp });

// Farmer / seller side
export const getOrderTracking = (orderId) => api.get(`/orders/${orderId}/tracking/`);
