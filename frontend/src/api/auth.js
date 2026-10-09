import api from './axios';
export const login = (data) => api.post('/auth/login/', data);
export const register = (data) => api.post('/auth/register/', data);
export const logout = (refresh) => api.post('/auth/logout/', { refresh });
export const getProfile = () => api.get('/auth/profile/');
export const updateProfile = (data) => api.put('/auth/profile/', data);
export const updateLocation = (lat, lng) => api.post('/auth/update-location/', { latitude: lat, longitude: lng });
export const changePassword = (data) => api.post('/auth/change-password/', data);
export const getSellerList = () => api.get('/auth/admin/sellers/');
export const approveSeller = (id) => api.post(`/auth/admin/sellers/${id}/approve/`);
export const getFarmerList = () => api.get('/auth/admin/farmers/');
export const updateSellerProfile = (data) => api.patch('/auth/seller-profile/', data, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Forgot password: OTP is sent by SMS to the account's registered mobile number
export const forgotPassword = (identifier) => api.post('/auth/forgot-password/', { identifier });
export const resetPassword = (data) => api.post('/auth/reset-password/', data);
