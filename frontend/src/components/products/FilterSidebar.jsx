import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { useT } from '../../i18n';
import { EMPTY_FILTERS, countActiveFilters, toggleInList } from '../../utils/filters';

const CATEGORY_TYPES = ['fertilizer', 'pesticide', 'herbicide', 'fungicide', 'organic', 'seeds', 'equipment'];
const RATINGS = [4, 3, 2, 1];
const DISCOUNTS = [10, 20, 30, 50];
const NEW_ARRIVAL_DAYS = [7, 30, 90];
const DISTANCES = [1, 5, 10, 20, 50, 100];
const VISIBLE_OPTIONS = 6;

function Section({ title, children, defaultOpen = false, forceOpen = false }) {
  const [open, setOpen] = useState(defaultOpen || forceOpen);
  return (
    <div className="border-b border-gray-100 py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center justify-between w-full font-semibold text-gray-800 text-xs uppercase tracking-wide"
      >
        {title} {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Check({ checked, onChange, label, count, type = 'checkbox', name }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 py-1">
      <input
        type={type}
        name={name}
        checked={checked}
        // Radios fire onChange only when they become checked, so a click handler is
        // used instead to let a second click on the selected option clear it
        onChange={type === 'radio' ? () => {} : onChange}
        onClick={type === 'radio' ? onChange : undefined}
        className="accent-primary-600 w-4 h-4 rounded flex-shrink-0"
      />
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {count > 0 && <span className="text-xs text-gray-400">({count})</span>}
    </label>
  );
}

// A long list of checkboxes that shows 6 and expands with "N more"
function ExpandableList({ items, renderItem }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, VISIBLE_OPTIONS);
  return (
    <div>
      {shown.map(renderItem)}
      {items.length > VISIBLE_OPTIONS && (
        <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs text-primary-600 font-semibold mt-1 hover:underline">
          {expanded ? t('filters.show_less') : t('filters.show_more', { n: items.length - VISIBLE_OPTIONS })}
        </button>
      )}
    </div>
  );
}

function PriceFilter({ filters, onChange }) {
  const { t } = useT();
  const [min, setMin] = useState(filters.min_price ?? '');
  const [max, setMax] = useState(filters.max_price ?? '');
  const [error, setError] = useState('');

  // Keep the inputs in sync when filters are cleared from outside
  useEffect(() => {
    setMin(filters.min_price ?? '');
    setMax(filters.max_price ?? '');
    setError('');
  }, [filters.min_price, filters.max_price]);

  const apply = (e) => {
    e?.preventDefault();
    const lo = min === '' ? null : Number(min);
    const hi = max === '' ? null : Number(max);
    if ((lo != null && (Number.isNaN(lo) || lo < 0)) || (hi != null && (Number.isNaN(hi) || hi < 0)) || (lo != null && hi != null && lo > hi)) {
      setError(t('filters.price_invalid'));
      return;
    }
    setError('');
    onChange({ ...filters, min_price: lo == null ? '' : String(lo), max_price: hi == null ? '' : String(hi) });
  };

  return (
    <form onSubmit={apply}>
      <div className="flex items-center gap-2">
        <input
          type="number" min="0" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)}
          placeholder={`₹ ${t('filters.min')}`} aria-label={t('filters.min')}
          className="w-full min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <span className="text-xs text-gray-500">{t('filters.to')}</span>
        <input
          type="number" min="0" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)}
          placeholder={`₹ ${t('filters.max')}`} aria-label={t('filters.max')}
          className="w-full min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      {error && <p role="alert" className="text-xs text-red-500 mt-1">{error}</p>}
      <button type="submit" className="mt-2 w-full btn-secondary text-sm py-1.5">{t('filters.go')}</button>
    </form>
  );
}

export default function FilterSidebar({ filters, onChange, options, showDistance, radius, onRadiusChange }) {
  const { t, tOr, unit } = useT();
  const set = (key, value) => onChange({ ...filters, [key]: value });
  // Single-select options behave like Flipkart: click again to clear
  const setSingle = (key, value) => set(key, String(filters[key]) === String(value) ? '' : String(value));

  const active = countActiveFilters(filters);
  const catCount = Object.fromEntries((options?.categories || []).map((c) => [c.value, c.count]));
  const brands = options?.brands || [];
  const units = options?.units || [];
  const districts = options?.districts || [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <SlidersHorizontal className="w-4 h-4 text-primary-600" />
        <h2 className="font-bold text-gray-900">{t('filters.title')}</h2>
        {active > 0 && <span className="text-xs text-gray-500">{t('filters.applied', { n: active })}</span>}
        {active > 0 && (
          <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS })} className="ml-auto text-xs text-primary-600 font-semibold hover:underline">
            {t('filters.clear_all')}
          </button>
        )}
      </div>

      <Section title={t('filters.category')} defaultOpen forceOpen={filters.category_type.length > 0}>
        {CATEGORY_TYPES.map((c) => (
          <Check
            key={c}
            checked={filters.category_type.includes(c)}
            onChange={() => set('category_type', toggleInList(filters.category_type, c))}
            label={t(`cat.${c}`)}
            count={catCount[c]}
          />
        ))}
      </Section>

      {brands.length > 0 && (
        <BrandSection brands={brands} filters={filters} set={set} />
      )}

      <Section title={t('filters.price')} defaultOpen forceOpen={Boolean(filters.min_price || filters.max_price)}>
        <PriceFilter filters={filters} onChange={onChange} />
      </Section>

      <Section title={t('filters.rating')} defaultOpen forceOpen={Boolean(filters.min_rating)}>
        {RATINGS.map((r) => (
          <Check key={r} type="radio" name="rating" checked={String(filters.min_rating) === String(r)}
            onChange={() => setSingle('min_rating', r)} label={t('filters.rating_above', { n: r })} />
        ))}
      </Section>

      <Section title={t('filters.discount')} forceOpen={Boolean(filters.min_discount)}>
        {DISCOUNTS.map((d) => (
          <Check key={d} type="radio" name="discount" checked={String(filters.min_discount) === String(d)}
            onChange={() => setSingle('min_discount', d)} label={t('filters.discount_above', { n: d })} />
        ))}
      </Section>

      <Section title={t('filters.offers')} forceOpen={Boolean(filters.offers)}>
        <Check checked={filters.offers === 'true'} onChange={() => setSingle('offers', 'true')} label={t('filters.special_price')} />
      </Section>

      <Section title={t('filters.availability')} forceOpen={Boolean(filters.in_stock)}>
        <Check type="radio" name="stock" checked={filters.in_stock === 'true'} onChange={() => setSingle('in_stock', 'true')} label={t('filters.in_stock')} />
        <Check type="radio" name="stock" checked={filters.in_stock === 'false'} onChange={() => setSingle('in_stock', 'false')} label={t('filters.out_of_stock')} />
      </Section>

      <Section title={t('filters.delivery')} forceOpen={Boolean(filters.free_delivery)}>
        <Check checked={filters.free_delivery === 'true'} onChange={() => setSingle('free_delivery', 'true')} label={t('filters.free_delivery')} />
      </Section>

      <Section title={t('filters.type')} forceOpen={Boolean(filters.organic)}>
        <Check checked={filters.organic === 'true'} onChange={() => setSingle('organic', 'true')} label={t('filters.organic')} />
      </Section>

      <Section title={t('filters.new_arrivals')} forceOpen={Boolean(filters.new_arrivals)}>
        {NEW_ARRIVAL_DAYS.map((d) => (
          <Check key={d} type="radio" name="new" checked={String(filters.new_arrivals) === String(d)}
            onChange={() => setSingle('new_arrivals', d)} label={t(`filters.last_${d}`)} />
        ))}
      </Section>

      {units.length > 0 && (
        <Section title={t('filters.pack_size')} forceOpen={filters.unit.length > 0}>
          <ExpandableList
            items={units}
            renderItem={(u) => (
              <Check key={u.value} checked={filters.unit.includes(u.value)}
                onChange={() => set('unit', toggleInList(filters.unit, u.value))} label={unit(u.value)} count={u.count} />
            )}
          />
        </Section>
      )}

      {districts.length > 0 && (
        <Section title={t('filters.district')} forceOpen={filters.district.length > 0}>
          <ExpandableList
            items={districts}
            renderItem={(d) => (
              <Check key={d.value} checked={filters.district.includes(d.value)}
                onChange={() => set('district', toggleInList(filters.district, d.value))} label={tOr(`district.${d.value.trim().toLowerCase()}`, d.value)} count={d.count} />
            )}
          />
        </Section>
      )}

      {showDistance && (
        <Section title={t('filters.distance')} defaultOpen>
          {DISTANCES.map((d) => (
            <Check key={d} type="radio" name="distance" checked={Number(radius) === d}
              onChange={() => onRadiusChange(d)} label={t('filters.within_km', { n: d })} />
          ))}
        </Section>
      )}
    </div>
  );
}

function BrandSection({ brands, filters, set }) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const visible = brands.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Section title={t('filters.brand')} defaultOpen forceOpen={filters.brand.length > 0}>
      {brands.length > VISIBLE_OPTIONS && (
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('filters.brand_search')} aria-label={t('filters.brand_search')}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}
      <ExpandableList
        items={visible}
        renderItem={(b) => (
          <Check key={b.id} checked={filters.brand.includes(String(b.id))}
            onChange={() => set('brand', toggleInList(filters.brand, b.id))} label={b.name} count={b.count} />
        )}
      />
    </Section>
  );
}
