import assert from 'node:assert/strict';
import test from 'node:test';
import { formatQuantity, scaleQuantity } from '../features/recipes/portion-scaling.ts';

test('scales from the original amount and base servings every time', () => {
  const original = 100;
  assert.equal(scaleQuantity(original, 2, 3), 150);
  assert.equal(scaleQuantity(original, 2, 2), 100);
});

test('keeps decimal arithmetic stable to two decimal places', () => {
  assert.equal(scaleQuantity(0.1, 2, 3), 0.15);
  assert.equal(scaleQuantity(1.005, 1, 1), 1.01);
  assert.equal(scaleQuantity(320, 4, 3), 240);
});

test('preserves an unspecified quantity', () => {
  assert.equal(scaleQuantity(null, 4, 6), null);
  assert.equal(formatQuantity(null), '');
});

test('formats common amounts as readable Spanish fractions', () => {
  assert.equal(formatQuantity(0.5), '½');
  assert.equal(formatQuantity(1.25), '1¼');
  assert.equal(formatQuantity(0.3333), '⅓');
  assert.equal(formatQuantity(1.75), '1¾');
  assert.equal(formatQuantity(1.4), '1,4');
});

test('rejects invalid serving counts and quantities', () => {
  assert.throws(() => scaleQuantity(10, 0, 2), RangeError);
  assert.throws(() => scaleQuantity(10, 2, 0), RangeError);
  assert.throws(() => scaleQuantity(-1, 2, 3), RangeError);
});
