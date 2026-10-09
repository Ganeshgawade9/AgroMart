import { create } from 'zustand';

const useCartStore = create((set) => ({
  items: [],
  total: 0,
  count: 0,
  setCart: (items, total, count) => set({ items, total, count }),
  clear: () => set({ items: [], total: 0, count: 0 }),
}));

export default useCartStore;
