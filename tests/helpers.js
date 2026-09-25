import assert from 'node:assert/strict';

/** Assert two numbers are equal within a tolerance. */
export function close(actual, expected, eps = 1e-3) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < eps, `expected ${expected}, got ${actual}`);
}
