import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/i18n/en.js';
import hi from '../src/i18n/hi.js';
import mr from '../src/i18n/mr.js';

const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');

for (const [name, dict] of [['Hindi', hi], ['Marathi', mr]]) {
  test(`${name} has exactly the same keys as English`, () => {
    const missing = Object.keys(en).filter((k) => !(k in dict));
    const extra = Object.keys(dict).filter((k) => !(k in en));
    assert.deepEqual(missing, [], `missing in ${name}: ${missing.join(', ')}`);
    assert.deepEqual(extra, [], `unknown in ${name}: ${extra.join(', ')}`);
  });

  test(`${name} keeps the same {placeholders} as English`, () => {
    for (const key of Object.keys(en)) {
      assert.equal(placeholders(dict[key]), placeholders(en[key]), `placeholder mismatch for "${key}"`);
    }
  });

  test(`${name} has no empty values and is really translated`, () => {
    const empty = Object.entries(dict).filter(([, v]) => !String(v).trim()).map(([k]) => k);
    assert.deepEqual(empty, []);
    // Devanagari text must be present for the main UI strings
    for (const key of ['nav.products', 'filters.title', 'filters.brand', 'filters.price', 'card.add_to_cart', 'login.submit', 'cat.fertilizer']) {
      assert.match(dict[key], /[\u0900-\u097F]/, `"${key}" is not in Devanagari`);
    }
  });
}

test('every category has a translation in every language', () => {
  for (const c of ['fertilizer', 'pesticide', 'herbicide', 'fungicide', 'organic', 'seeds', 'equipment']) {
    for (const dict of [en, hi, mr]) assert.ok(dict[`cat.${c}`]);
  }
});
