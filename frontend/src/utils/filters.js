// Shape of the filter state used by the Products page and the FilterSidebar.
// Multi-select values are arrays; single-select values are strings ('' = off).
export const EMPTY_FILTERS = {
  category_type: [],
  brand: [],
  unit: [],
  district: [],
  min_price: '',
  max_price: '',
  min_rating: '',
  min_discount: '',
  offers: '',
  in_stock: '',
  free_delivery: '',
  organic: '',
  new_arrivals: '',
};

const isSet = (v) => (Array.isArray(v) ? v.length > 0 : v !== '' && v != null && v !== false);

// Converts the filter state into API query params (arrays become comma-separated lists)
export function buildFilterParams(filters) {
  const params = {};
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (!isSet(value)) return;
    params[key] = Array.isArray(value) ? value.join(',') : value;
  });
  return params;
}

// Number of active filter groups (price min+max counts as one)
export function countActiveFilters(filters) {
  if (!filters) return 0;
  let count = 0;
  Object.entries(filters).forEach(([key, value]) => {
    if (key === 'max_price') return;
    if (key === 'min_price') {
      if (isSet(value) || isSet(filters.max_price)) count += 1;
      return;
    }
    if (isSet(value)) count += 1;
  });
  return count;
}

// Adds the value to the list, or removes it when already present
export function toggleInList(list, value) {
  const v = String(value);
  const current = (list || []).map(String);
  return current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
}

// Splits "fertilizer,seeds" from a URL into ['fertilizer', 'seeds']
export function parseList(value) {
  return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
}
