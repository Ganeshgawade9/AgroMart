import { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';

const CATEGORIES = [
  { value: 'fertilizer', label: 'Fertilizer' },
  { value: 'pesticide', label: 'Pesticide' },
  { value: 'herbicide', label: 'Herbicide' },
  { value: 'fungicide', label: 'Fungicide' },
  { value: 'organic', label: 'Organic' },
  { value: 'seeds', label: 'Seeds' },
  { value: 'equipment', label: 'Equipment' },
];

const PRICE_RANGES = [
  { label: '₹0 – ₹100', min: 0, max: 100 },
  { label: '₹100 – ₹500', min: 100, max: 500 },
  { label: '₹500 – ₹1000', min: 500, max: 1000 },
  { label: '₹1000+', min: 1000, max: '' },
];

const DISTANCES = [
  { label: 'Within 1 km', value: 1 },
  { label: 'Within 5 km', value: 5 },
  { label: 'Within 10 km', value: 10 },
  { label: 'Within 20 km', value: 20 },
];

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full font-semibold text-gray-800 text-sm mb-3">
        {title} {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && children}
    </div>
  );
}

export default function FilterSidebar({ filters, onChange, userLocation }) {
  const handleChange = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-4 h-4 text-primary-600" />
        <h2 className="font-bold text-gray-900">Filters</h2>
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => onChange({})} className="ml-auto text-xs text-primary-600 hover:underline">Clear all</button>
        )}
      </div>

      <Section title="Category">
        <div className="space-y-2">
          {CATEGORIES.map(c => (
            <label key={c.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={filters.category_type === c.value} onChange={e => handleChange('category_type', e.target.checked ? c.value : '')} className="accent-primary-600 w-4 h-4 rounded" />
              {c.label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Price Range">
        <div className="space-y-2">
          {PRICE_RANGES.map(r => (
            <label key={r.label} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="radio"
                name="price"
                checked={filters.min_price == r.min && filters.max_price == r.max}
                onChange={() => handleChange('min_price', r.min) || onChange({ ...filters, min_price: r.min, max_price: r.max })}
                className="accent-primary-600 w-4 h-4"
              />
              {r.label}
            </label>
          ))}
        </div>
      </Section>

      {userLocation && (
        <Section title="Distance">
          <div className="space-y-2">
            {DISTANCES.map(d => (
              <label key={d.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="radio" name="distance" checked={filters.radius == d.value} onChange={() => onChange({ ...filters, radius: d.value, lat: userLocation.lat, lng: userLocation.lng })} className="accent-primary-600 w-4 h-4" />
                {d.label}
              </label>
            ))}
          </div>
        </Section>
      )}

      <Section title="Rating">
        {[4, 3, 2].map(r => (
          <label key={r} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 mb-2">
            <input type="radio" name="rating" checked={filters.min_rating == r} onChange={() => handleChange('min_rating', r)} className="accent-primary-600 w-4 h-4" />
            {'★'.repeat(r)} & above
          </label>
        ))}
      </Section>

      <Section title="Other">
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={filters.in_stock === 'true'} onChange={e => handleChange('in_stock', e.target.checked ? 'true' : '')} className="accent-primary-600 w-4 h-4 rounded" />
            In Stock Only
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={filters.free_delivery === 'true'} onChange={e => handleChange('free_delivery', e.target.checked ? 'true' : '')} className="accent-primary-600 w-4 h-4 rounded" />
            Free Delivery
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={filters.organic === 'true'} onChange={e => handleChange('organic', e.target.checked ? 'true' : '')} className="accent-primary-600 w-4 h-4 rounded" />
            Organic
          </label>
        </div>
      </Section>
    </div>
  );
}
