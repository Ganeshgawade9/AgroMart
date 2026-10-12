// Smoke test: whole pages render in every language with no raw translation keys left on screen.
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

let server;
const mods = {};
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  const load = async (name, path) => { mods[name] = (await server.ssrLoadModule(path)).default; };
  await load('Navbar', '/src/components/common/Navbar.jsx');
  await load('Footer', '/src/components/common/Footer.jsx');
  await load('Login', '/src/pages/auth/Login.jsx');
  await load('ForgotPassword', '/src/pages/auth/ForgotPassword.jsx');
  await load('Home', '/src/pages/Home.jsx');
  await load('Products', '/src/pages/Products.jsx');
  await load('ProductCard', '/src/components/products/ProductCard.jsx');
  await load('lang', '/src/store/languageStore.js');
});
after(async () => { await server.close(); setTimeout(() => process.exit(0), 50).unref(); });

const PRODUCT = {
  id: 1, name: 'Urea 46%', image: '', price: '270', mrp: '300', discount_percent: '10', stock: 5, unit: 'bag', weight: '',
  rating: '4.5', total_reviews: 3, category_name: 'Fertilizer', brand_name: 'IFFCO', seller_shop_name: 'Ganesh Agro',
  is_in_stock: true, has_free_delivery: true, distance_km: 4.2,
};

const RAW_KEY = /\b(nav|home|products|filters|card|login|forgot|footer|loc|sort|cat|unit|district|lang)\.[a-z_0-9]+\b/;
const LEAKS = {
  hi: ['Forgot password', 'Add to Cart', 'Sold Out', 'Verified Sellers', 'Shop by Category', 'Quick Links', 'Welcome Back'],
  mr: ['Forgot password', 'Add to Cart', 'Sold Out', 'Verified Sellers', 'Shop by Category', 'Quick Links', 'Welcome Back'],
};

async function render(element, route = '/') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: [route] }, element));
  });
  // let the (failing, caught) API calls settle
  await React.act(async () => { await new Promise((r) => setTimeout(r, 150)); });
  const text = container.textContent;
  const html = container.innerHTML;
  await React.act(async () => root.unmount());
  container.remove();
  return { text, html };
}

const PAGES = [
  ['Navbar', (m) => React.createElement(m.Navbar)],
  ['Footer', (m) => React.createElement(m.Footer)],
  ['Login', (m) => React.createElement(m.Login)],
  ['ForgotPassword', (m) => React.createElement(m.ForgotPassword)],
  ['Home', (m) => React.createElement(m.Home)],
  ['Products', (m) => React.createElement(m.Products), '/products?category_type=fertilizer,seeds'],
  ['ProductCard', (m) => React.createElement(m.ProductCard, { product: PRODUCT })],
];

for (const lang of ['en', 'hi', 'mr']) {
  for (const [name, make, route] of PAGES) {
    test(`${name} renders in ${lang} without raw keys`, async () => {
      mods.lang.getState().setLang(lang);
      const { text, html } = await render(make(mods), route);
      assert.ok(text.length > 0, 'page rendered nothing');
      assert.ok(!RAW_KEY.test(text), `raw translation key visible: ${text.match(RAW_KEY)?.[0]}`);
      if (lang !== 'en') {
        assert.match(text + html, /[\u0900-\u097F]/, 'expected Devanagari text');
        for (const s of LEAKS[lang]) assert.ok(!text.includes(s), `English text leaked: "${s}"`);
      }
    });
  }
}

test('Products page heading follows the selected category and language', async () => {
  mods.lang.getState().setLang('mr');
  const { text } = await render(React.createElement(mods.Products), '/products?category_type=fertilizer,seeds');
  assert.ok(text.includes('खते, बियाणे'), 'heading should list the selected categories in Marathi');
  mods.lang.getState().setLang('en');
});

test('ProductCard shows translated unit, category and discount', async () => {
  mods.lang.getState().setLang('hi');
  const { text } = await render(React.createElement(mods.ProductCard, { product: PRODUCT }));
  assert.ok(text.includes('उर्वरक'), 'category');
  assert.ok(text.includes('10% छूट'), 'discount badge');
  assert.ok(text.includes('बोरी'), 'unit');
  assert.ok(text.includes('4.2 किमी दूर'), 'distance');
  mods.lang.getState().setLang('en');
});
