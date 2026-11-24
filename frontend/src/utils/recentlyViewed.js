const STORAGE_KEY = 'agroconnect_recently_viewed';
const MAX_RECENT = 15;

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(product) {
  if (!product || !product.id) return [];
  try {
    const current = getRecentlyViewed();
    const item = {
      id: product.id,
      name: product.name,
      image: product.image || (product.images && product.images[0]?.image) || '',
      price: product.price,
      mrp: product.mrp,
      category_name: product.category_name || product.category?.name || '',
      brand_name: product.brand_name || product.brand?.name || '',
      unit: product.unit,
      weight: product.weight,
      is_in_stock: product.is_in_stock ?? true,
    };
    const filtered = current.filter((p) => p.id !== item.id);
    const updated = [item, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recently_viewed_updated', { detail: updated }));
    }
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentlyViewed() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recently_viewed_updated', { detail: [] }));
    }
  } catch {}
}
