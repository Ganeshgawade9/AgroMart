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