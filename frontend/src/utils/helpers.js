export const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

export const getDiscountPercent = (mrp, price) =>
  Math.round(((mrp - price) / mrp) * 100);

export const getStatusColor = (status) => {
  const map = {
    pending: 'badge-orange',
    accepted: 'badge-blue',
    packed: 'badge-blue',
    out_for_delivery: 'badge-blue',
    delivered: 'badge-green',
    cancelled: 'badge-red'
  };

  return map[status] || 'badge-orange';
};

export const getStatusLabel = (status) => {
  const map = {
    pending: 'Order Placed',
    accepted: 'Accepted',
    packed: 'Packed',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  return map[status] || status;
};

export const IMG_PLACEHOLDER = '/product-placeholder.svg';

export const getBackendBaseUrl = () => {
  const isNative = typeof window !== 'undefined' && (
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && /Android|iPhone|iPad/i.test(navigator?.userAgent || '')) ||
    Boolean(window.Capacitor?.isNativePlatform?.())
  );
  const envUrl = import.meta.env.VITE_API_URL;
  if (isNative && (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
    return 'https://Ganeshpatil007.pythonanywhere.com';
  }
  return (envUrl || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
};

export const resolveBannerUrl = (banner) => {
  if (!banner) return '';
  const src = banner.image_url || banner.image;
  if (!src || typeof src !== 'string') return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
  const backendBase = getBackendBaseUrl();
  return `${backendBase}${src.startsWith('/') ? '' : '/'}${src}`;
};
