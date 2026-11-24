import { create } from 'zustand';

const useWishlistStore = create((set, get) => ({
  productIds: new Set(),
  items: [],
  count: 0,

  setWishlist: (rawItems) => {
    const items = Array.isArray(rawItems) ? rawItems : [];
    const ids = new Set(
      items
        .map((item) => (item.product ? item.product.id : item.product_id || item.id))
        .filter(Boolean)
        .map(Number)
    );
    set({ items, productIds: ids, count: items.length });
  },

  isInWishlist: (productId) => {
    if (!productId) return false;
    return get().productIds.has(Number(productId));
  },

  toggleItem: (productId, inWishlist) => {
    if (!productId) return;
    const numId = Number(productId);
    const ids = new Set(get().productIds);
    let items = [...get().items];

    if (inWishlist) {
      ids.add(numId);
    } else {
      ids.delete(numId);
      items = items.filter(
        (item) => (item.product ? item.product.id : item.product_id || item.id) !== numId
      );
    }
    set({ productIds: ids, items, count: ids.size });
  },

  clear: () => set({ productIds: new Set(), items: [], count: 0 }),
}));

export default useWishlistStore;
