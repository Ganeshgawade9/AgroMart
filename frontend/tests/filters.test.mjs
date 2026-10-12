import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_FILTERS, buildFilterParams, countActiveFilters, toggleInList, parseList } from '../src/utils/filters.js';

test('empty filters produce no params', () => {
  assert.deepEqual(buildFilterParams(EMPTY_FILTERS), {});
  assert.equal(countActiveFilters(EMPTY_FILTERS), 0);
});

test('arrays become comma separated lists and empty values are dropped', () => {
  const params = buildFilterParams({
    ...EMPTY_FILTERS,
    category_type: ['fertilizer', 'seeds'],
    brand: ['3', '7'],
    min_price: '100',
    max_price: '',
    min_rating: '4',
    in_stock: 'true',
  });
  assert.deepEqual(params, {
    category_type: 'fertilizer,seeds',
    brand: '3,7',
    min_price: '100',
    min_rating: '4',
    in_stock: 'true',
  });
});

test('price min and max count as a single active filter', () => {
  assert.equal(countActiveFilters({ ...EMPTY_FILTERS, min_price: '100', max_price: '500' }), 1);
  assert.equal(countActiveFilters({ ...EMPTY_FILTERS, max_price: '500' }), 1);
});

test('active filter count adds up across groups', () => {
  assert.equal(
    countActiveFilters({ ...EMPTY_FILTERS, category_type: ['seeds'], brand: ['1'], organic: 'true', min_discount: '20' }),
    4
  );
});

test('toggleInList adds, removes and normalises to strings', () => {
  assert.deepEqual(toggleInList([], 5), ['5']);
  assert.deepEqual(toggleInList(['5'], 5), []);
  assert.deepEqual(toggleInList(['a'], 'b'), ['a', 'b']);
});

test('parseList handles empty and padded values', () => {
  assert.deepEqual(parseList(''), []);
  assert.deepEqual(parseList('fertilizer, seeds,'), ['fertilizer', 'seeds']);
});
