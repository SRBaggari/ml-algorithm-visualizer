import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitLinearRegression, predict } from '../src/algorithms/linearRegression.js';
import { UserError } from '../src/utils/errors.js';
import { REGRESSION_DATASETS } from '../src/data/datasets.js';
import { close } from './helpers.js';

test('recovers a perfect line exactly', () => {
  const m = fitLinearRegression([{ x: 1, y: 5 }, { x: 2, y: 7 }, { x: 3, y: 9 }]);
  close(m.slope, 2);
  close(m.intercept, 3);
  close(m.mse, 0);
  close(m.r2, 1);
  close(predict(m, 10), 23);
});

test('hand-calculated example: (1,2), (2,4), (3,5)', () => {
  // x̄ = 2, ȳ = 11/3, Σdxdy = 3, Σdx² = 2 → b₁ = 1.5, b₀ = 2/3
  const m = fitLinearRegression([{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }]);
  close(m.meanX, 2);
  close(m.meanY, 11 / 3);
  close(m.sxy, 3);
  close(m.sxx, 2);
  close(m.slope, 1.5);
  close(m.intercept, 2 / 3);
  // residuals −1/6, 1/3, −1/6 → SSE = 1/6, MSE = 1/18, SST = 14/3, R² = 1 − (1/6)/(14/3) = 27/28
  close(m.sse, 1 / 6);
  close(m.mse, 1 / 18);
  close(m.r2, 27 / 28);
  close(m.rows[1].residual, 1 / 3);
});

test('negative slope', () => {
  const m = fitLinearRegression([{ x: 0, y: 10 }, { x: 1, y: 8 }, { x: 2, y: 6 }]);
  close(m.slope, -2);
  close(m.intercept, 10);
});

test('constant y gives slope 0 and R² defined as 1', () => {
  const m = fitLinearRegression([{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }]);
  close(m.slope, 0);
  close(m.intercept, 5);
  close(m.r2, 1);
});

test('ignores non-numeric points', () => {
  const m = fitLinearRegression([{ x: 1, y: 1 }, { x: NaN, y: 3 }, { x: 2, y: 2 }, { x: 3, y: Infinity }]);
  assert.equal(m.n, 2);
  close(m.slope, 1);
});

test('rejects too few points and identical x values with friendly errors', () => {
  assert.throws(() => fitLinearRegression([]), (e) => e instanceof UserError && /At least 2/.test(e.message));
  assert.throws(() => fitLinearRegression([{ x: 1, y: 1 }]), /At least 2/);
  assert.throws(() => fitLinearRegression([{ x: 1, y: 1 }, { x: 1, y: 2 }]), /division by zero/);
  assert.throws(() => fitLinearRegression(null), UserError);
});

test('sample dataset: hours studied vs exam score', () => {
  const m = fitLinearRegression(REGRESSION_DATASETS.study.points);
  close(m.slope, 5.5377, 1e-3);
  close(m.intercept, 46.349, 1e-3);
  assert.ok(m.r2 > 0.98);
});
