import api from './axios';
export const placeOrder = (data) => api.post('/orders/place/', data);
export const getMyOrders = () => api.get('/orders/my-orders/');
export const getSellerOrders = (status) => api.get('/orders/seller-orders/', { params: status ? { status } : {} });
export const getOrder = (id) => api.get(`/orders/${id}/`);
export const updateOrderStatus = (id, status, otp, extra = {}) => api.post(`/orders/${id}/update-status/`, { status, otp, ...extra });
export const createRazorpayOrder = (amount) => api.post('/orders/razorpay/create/', { amount });
export const getSellerDashboardStats = () => api.get('/orders/seller-dashboard-stats/');
export const downloadInvoice = (id) => api.get(`/orders/${id}/invoice/`, { responseType: 'blob' });

// Payment endpoints
export const initiatePayment = (data) => api.post('/orders/payments/initiate/', data);
export const getPaymentStatus = (paymentId) => api.get(`/orders/payments/${paymentId}/status/`);
export const verifyPayment = (paymentId) => api.post(`/orders/payments/${paymentId}/verify/`);
export const getPaymentAnalytics = () => api.get('/orders/payments/seller-analytics/');
export const getSellerPaymentSettings = () => api.get('/orders/seller-payment-settings/');
export const updateSellerPaymentSettings = (data) => api.patch('/orders/seller-payment-settings/', data);

