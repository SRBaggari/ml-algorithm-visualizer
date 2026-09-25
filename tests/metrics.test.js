import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMetrics, confusionMatrix, safeDivide, thresholdPredictions, thresholdSweep } from '../src/utils/metrics.js';
import { UserError } from '../src/utils/errors.js';
import { EVALUATION_SAMPLES } from '../src/data/datasets.js';
import { close } from './helpers.js';

test('confusion matrix counts', () => {
  assert.deepEqual(confusionMatrix([1, 1, 1, 0, 0, 0], [1, 1, 0, 1, 0, 0]), { tp: 2, fp: 1, tn: 2, fn: 1 });
  assert.deepEqual(confusionMatrix(['spam', 'ham'], ['spam', 'spam'], 'spam'), { tp: 1, fp: 1, tn: 0, fn: 0 });
  assert.throws(() => confusionMatrix([1], [1, 0]), UserError);
});

test('accuracy, precision, recall and F1 (lesson example)', () => {
  const m = computeMetrics({ tp: 40, fn: 10, fp: 5, tn: 45 });
  close(m.accuracy, 0.85);
  close(m.precision, 40 / 45);
  close(m.recall, 0.8);
  close(m.f1, (2 * (40 / 45) * 0.8) / (40 / 45 + 0.8));
  close(m.f1, 0.8421);
  assert.equal(m.total, 100);
});

test('perfect classifier', () => {
  const m = computeMetrics({ tp: 5, fn: 0, fp: 0, tn: 5 });
  assert.equal(m.accuracy, 1);
  assert.equal(m.precision, 1);
  assert.equal(m.recall, 1);
  assert.equal(m.f1, 1);
});

test('undefined metrics are null instead of NaN (division by zero)', () => {
  // Nothing predicted positive → precision undefined, so F1 undefined.
  const noPositivePredictions = computeMetrics({ tp: 0, fp: 0, tn: 5, fn: 3 });
  assert.equal(noPositivePredictions.precision, null);
  assert.equal(noPositivePredictions.recall, 0);
  assert.equal(noPositivePredictions.f1, null);
  // No actual positives → recall undefined.
  assert.equal(computeMetrics({ tp: 0, fp: 2, tn: 5, fn: 0 }).recall, null);
  // Precision and recall both 0 → F1 = 0/0 → undefined.
  assert.equal(computeMetrics({ tp: 0, fp: 2, tn: 5, fn: 3 }).f1, null);
  // Empty matrix.
  assert.equal(computeMetrics({ tp: 0, fp: 0, tn: 0, fn: 0 }).accuracy, null);
  assert.equal(safeDivide(1, 0), null);
});

test('thresholds', () => {
  assert.deepEqual(thresholdPredictions([0.2, 0.5, 0.8], 0.5), [0, 1, 1]);
  const sweep = thresholdSweep(EVALUATION_SAMPLES, 10);
  assert.equal(sweep.length, 11);
  assert.equal(sweep[0].recall, 1); // threshold 0: everything predicted positive
  const at05 = computeMetrics(confusionMatrix(EVALUATION_SAMPLES.map((s) => s.actual), thresholdPredictions(EVALUATION_SAMPLES.map((s) => s.score), 0.5)));
  close(at05.accuracy, 35 / 40);
  close(at05.precision, 16 / 19);
});
