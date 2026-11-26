import axios from 'axios';

// Detect whether running inside mobile Capacitor app
const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && /Android|iPhone|iPad/i.test(navigator?.userAgent || '')) ||
    Boolean(window.Capacitor?.isNativePlatform?.())
  );
};

const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (isNativePlatform()) {
    // If inside mobile APK and envUrl is missing or points to localhost, route to PythonAnywhere production
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return 'https://ganeshpatil007.pythonanywhere.com/api';
    }
  }
  return envUrl || 'http://localhost:8000/api';
};

const BASE_URL = resolveBaseUrl();
const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const res = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
        localStorage.setItem('access_token', res.data.access);
        original.headers.Authorization = `Bearer ${res.data.access}`;
        return api(original);
      } catch { localStorage.clear(); window.location.href = '/login'; }
    }
    return Promise.reject(error);
  }
);
export default api;
