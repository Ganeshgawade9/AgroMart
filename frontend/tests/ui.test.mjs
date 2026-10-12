// Renders the real React components in jsdom (through Vite's SSR loader) and clicks them.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html lang="en"><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
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

let server;
let FilterSidebar, LanguageSwitcher, useLanguageStore, EMPTY_FILTERS;

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  FilterSidebar = (await server.ssrLoadModule('/src/components/products/FilterSidebar.jsx')).default;
  LanguageSwitcher = (await server.ssrLoadModule('/src/components/common/LanguageSwitcher.jsx')).default;
  useLanguageStore = (await server.ssrLoadModule('/src/store/languageStore.js')).default;
  ({ EMPTY_FILTERS } = await server.ssrLoadModule('/src/utils/filters.js'));
});
after(async () => { await server.close(); });

const OPTIONS = {
  categories: [{ value: 'fertilizer', count: 4 }, { value: 'seeds', count: 2 }],
  brands: [{ id: 1, name: 'IFFCO', count: 3 }, { id: 2, name: 'Bayer', count: 1 }],
  units: [{ value: 'bag', count: 3 }, { value: 'litre', count: 1 }],
  districts: [{ value: 'Pune', count: 4 }],
  price: { min: 100, max: 1200 },
};

let container, root;
const mount = async (element) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await React.act(async () => { root.render(element); });
};
const unmount = async () => { await React.act(async () => root.unmount()); container.remove(); };
const click = async (el) => { await React.act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }); };
const byText = (text, tag = '*') => [...container.querySelectorAll(tag)].find((n) => n.textContent.trim() === text);
const checkboxFor = (labelText) => [...container.querySelectorAll('label')].find((l) => l.textContent.includes(labelText))?.querySelector('input');

function Harness({ initial = EMPTY_FILTERS, spy }) {
  const [filters, setFilters] = React.useState(initial);
  return React.createElement(FilterSidebar, {
    filters, options: OPTIONS, showDistance: false, radius: 20, onRadiusChange() {},
    onChange: (f) => { spy.last = f; setFilters(f); },
  });
}

test('filter panel shows every section in English', async () => {
  useLanguageStore.getState().setLang('en');
  await mount(React.createElement(Harness, { spy: {} }));
  for (const title of ['Category', 'Brand', 'Price', 'Customer Ratings', 'Discount', 'Offers', 'Availability', 'Delivery', 'Product Type', 'New Arrivals', 'Pack Size / Unit', 'Shop District']) {
    assert.ok(byText(title, 'button'), `section "${title}" is missing`);
  }
  await unmount();
});

test('ticking categories and brands builds multi-select arrays', async () => {
  useLanguageStore.getState().setLang('en');
  const spy = {};
  await mount(React.createElement(Harness, { spy }));
  await click(checkboxFor('Fertilizer'));
  await click(checkboxFor('Seeds'));
  assert.deepEqual(spy.last.category_type, ['fertilizer', 'seeds']);
  await click(checkboxFor('IFFCO'));
  assert.deepEqual(spy.last.brand, ['1']);
  await click(checkboxFor('Fertilizer'));
  assert.deepEqual(spy.last.category_type, ['seeds']);
  await unmount();
});

test('single-select options clear when clicked twice, and Clear all resets everything', async () => {
  useLanguageStore.getState().setLang('en');
  const spy = {};
  await mount(React.createElement(Harness, { spy }));
  await click(checkboxFor('4★ & above'));
  assert.equal(spy.last.min_rating, '4');
  await click(checkboxFor('3★ & above'));
  assert.equal(spy.last.min_rating, '3');
  await click(checkboxFor('3★ & above'));
  assert.equal(spy.last.min_rating, '');
  await click(checkboxFor('4★ & above'));
  await click(byText('Clear all', 'button'));
  assert.deepEqual(spy.last, EMPTY_FILTERS);
  await unmount();
});

test('price filter applies a valid range and rejects min greater than max', async () => {
  useLanguageStore.getState().setLang('en');
  const spy = {};
  await mount(React.createElement(Harness, { spy }));
  const setValue = async (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await React.act(async () => { setter.call(el, value); el.dispatchEvent(new window.Event('input', { bubbles: true })); });
  };
  const [min, max] = container.querySelectorAll('input[type="number"]');
  await setValue(min, '900');
  await setValue(max, '100');
  await click(byText('Apply', 'button'));
  assert.ok(container.querySelector('[role="alert"]'), 'expected a validation error');
  assert.equal(spy.last, undefined);
  await setValue(min, '100');
  await setValue(max, '500');
  await click(byText('Apply', 'button'));
  assert.equal(spy.last.min_price, '100');
  assert.equal(spy.last.max_price, '500');
  assert.equal(container.querySelector('[role="alert"]'), null);
  await unmount();
});

test('pack sizes use the translated unit names', async () => {
  useLanguageStore.getState().setLang('mr');
  await mount(React.createElement(Harness, { spy: {} }));
  await click(byText('पॅक आकार / एकक', 'button'));
  assert.ok(checkboxFor('गोणी'), 'bag should show as गोणी in Marathi');
  assert.ok(checkboxFor('लिटर'), 'litre should show as लिटर in Marathi');
  await unmount();
  useLanguageStore.getState().setLang('en');
});

for (const [code, expected] of [['hi', ['श्रेणी', 'ब्रांड', 'कीमत', 'ग्राहक रेटिंग', 'उर्वरक']], ['mr', ['वर्ग', 'ब्रँड', 'किंमत', 'ग्राहक रेटिंग', 'खते']]]) {
  test(`filter panel is fully shown in ${code}`, async () => {
    useLanguageStore.getState().setLang(code);
    await mount(React.createElement(Harness, { spy: {} }));
    for (const text of expected) assert.ok(container.textContent.includes(text), `"${text}" not found`);
    assert.ok(!container.textContent.includes('Customer Ratings'), 'English text leaked into the panel');
    await unmount();
    useLanguageStore.getState().setLang('en');
  });
}

test('language switcher changes the language and the document lang attribute', async () => {
  useLanguageStore.getState().setLang('en');
  await mount(React.createElement(LanguageSwitcher));
  await click(container.querySelector('button'));
  const options = [...container.querySelectorAll('[role="option"] button')].map((b) => b.textContent.trim());
  assert.deepEqual(options, ['English', 'हिन्दी', 'मराठी']);
  await click(byText('हिन्दी', 'button'));
  assert.equal(useLanguageStore.getState().lang, 'hi');
  assert.equal(document.documentElement.lang, 'hi');
  assert.equal(JSON.parse(localStorage.getItem('language-store')).state.lang, 'hi');
  await click(container.querySelector('button'));
  await click(byText('मराठी', 'button'));
  assert.equal(useLanguageStore.getState().lang, 'mr');
  await unmount();
  useLanguageStore.getState().setLang('en');
});

test('an unsupported language code is ignored', () => {
  useLanguageStore.getState().setLang('en');
  useLanguageStore.getState().setLang('fr');
  assert.equal(useLanguageStore.getState().lang, 'en');
});
