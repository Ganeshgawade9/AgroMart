import api from './axios';
export const getNotifications = () => api.get('/notifications/');
export const markAllRead = () => api.post('/notifications/mark-read/');
export const markRead = (id) => api.post(`/notifications/${id}/mark-read/`);
