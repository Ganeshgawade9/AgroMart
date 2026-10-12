// Sold-out display and automatic refresh.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.Event = dom.window.Event;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { createServer } = await import('vite');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');

let server, ProductCard, useAutoRefresh, lang, auth;
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  ProductCard = (await server.ssrLoadModule('/src/components/products/ProductCard.jsx')).default;
  useAutoRefresh = (await server.ssrLoadModule('/src/hooks/useAutoRefresh.js')).default;
  lang = (await server.ssrLoadModule('/src/store/languageStore.js')).default;
  auth = (await server.ssrLoadModule('/src/store/authStore.js')).default;
});
after(async () => { await server.close(); setTimeout(() => process.exit(0), 50).unref(); });

const base = {
  id: 1, name: 'Urea 46%', image: '', price: '270', mrp: '300', discount_percent: '10', stock: 20, unit: 'bag', weight: '',
  rating: '4.5', total_reviews: 3, category_name: 'Fertilizer', brand_name: 'IFFCO', seller_shop_name: 'Ganesh Agro',
  is_in_stock: true, has_free_delivery: false, distance_km: null,
};

async function render(product) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(MemoryRouter, null, React.createElement(ProductCard, { product })));
  });
  const result = {
    text: container.textContent,
    img: container.querySelector('img'),
    buttons: [...container.querySelectorAll('button')],
  };
  const cleanup = async () => { await React.act(async () => root.unmount()); container.remove(); };
  return { ...result, cleanup };
}

const asFarmer = () => auth.setState({ isAuthenticated: true, user: { role: 'farmer', full_name: 'F' } });
const asGuest = () => auth.setState({ isAuthenticated: false, user: null });

test('a sold-out product stays visible, greyed out and labelled Sold Out', async () => {
  lang.getState().setLang('en'); asGuest();
  const r = await render({ ...base, stock: 0, is_in_stock: false });
  assert.ok(r.text.includes('Sold Out'));
  assert.ok(r.text.includes('Urea 46%'), 'name must still be shown');
  assert.match(r.img.className, /grayscale/);
  await r.cleanup();
});

test('a farmer gets a disabled Sold Out button instead of Add to Cart', async () => {
  lang.getState().setLang('en'); asFarmer();
  const r = await render({ ...base, stock: 0, is_in_stock: false });
  assert.ok(!r.text.includes('Add to Cart'));
  const btn = r.buttons.find((b) => b.textContent.trim() === 'Sold Out');
  assert.ok(btn, 'expected a Sold Out button');
  assert.equal(btn.disabled, true);
  await r.cleanup();
  asGuest();
});

test('an available product has no sold-out styling and offers Add to Cart', async () => {
  lang.getState().setLang('en'); asFarmer();
  const r = await render(base);
  assert.ok(!r.text.includes('Sold Out'));
  assert.ok(!/grayscale/.test(r.img.className));
  assert.ok(r.text.includes('Add to Cart'));
  assert.ok(!r.text.includes('left'), 'no low-stock badge for 20 units');
  await r.cleanup();
  asGuest();
});

test('low stock (1 to 5 units) shows an "Only N left" badge', async () => {
  lang.getState().setLang('en');
  for (const stock of [1, 5]) {
    const r = await render({ ...base, stock });
    assert.ok(r.text.includes(`Only ${stock} left`), `stock ${stock}`);
    await r.cleanup();
  }
  const six = await render({ ...base, stock: 6 });
  assert.ok(!six.text.includes('left'));
  await six.cleanup();
});

test('sold-out and low-stock labels are translated', async () => {
  lang.getState().setLang('hi');
  let r = await render({ ...base, stock: 0, is_in_stock: false });
  assert.ok(r.text.includes('बिक चुका'));
  await r.cleanup();
  lang.getState().setLang('mr');
  r = await render({ ...base, stock: 3 });
  assert.ok(r.text.includes('फक्त 3 शिल्लक'));
  await r.cleanup();
  lang.getState().setLang('en');
});

test('useAutoRefresh calls back on an interval, pauses when hidden and stops when disabled', async () => {
  let calls = 0;
  let enabled = true;
  function Probe() {
    useAutoRefresh(() => { calls += 1; }, { interval: 40, enabled });
    return null;
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  await React.act(async () => root.render(React.createElement(Probe)));

  await React.act(async () => { await new Promise((r) => setTimeout(r, 220)); });
  assert.ok(calls >= 3, `expected several refreshes, got ${calls}`);

  // Hidden tab: no refreshes
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  const before = calls;
  await React.act(async () => { await new Promise((r) => setTimeout(r, 200)); });
  assert.equal(calls, before, 'must not refresh while the tab is hidden');
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

  // Disabled: no refreshes
  enabled = false;
  await React.act(async () => root.render(React.createElement(Probe)));
  const afterDisable = calls;
  await React.act(async () => { await new Promise((r) => setTimeout(r, 200)); });
  assert.equal(calls, afterDisable, 'must not refresh when disabled');

  await React.act(async () => root.unmount());
});
