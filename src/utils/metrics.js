import { UserError } from './errors.js';
// Classification metrics computed from scratch.

export function confusionMatrix(actual, predicted, positive = 1) {
  if (actual.length !== predicted.length) {
    throw new UserError('Actual and predicted lists must have the same length.');
  }
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  actual.forEach((a, i) => {
    const p = predicted[i];
    if (a === positive && p === positive) tp++;
    else if (a !== positive && p === positive) fp++;
    else if (a !== positive && p !== positive) tn++;
    else fn++;
  });
  return { tp, fp, tn, fn };
}

// Returns null when the denominator is zero, meaning "metric is undefined".
export function safeDivide(num, den) {
  return den === 0 ? null : num / den;
}

export function computeMetrics({ tp, fp, tn, fn }) {
  const total = tp + fp + tn + fn;
  const accuracy = safeDivide(tp + tn, total);
  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  const specificity = safeDivide(tn, tn + fp);
  const f1 = precision === null || recall === null ? null : safeDivide(2 * precision * recall, precision + recall);
  return { total, accuracy, precision, recall, specificity, f1 };
}

export function thresholdPredictions(scores, threshold) {
  return scores.map((s) => (s >= threshold ? 1 : 0));
}

/** Evaluate metrics across thresholds 0..1 (used for the threshold chart). */
export function thresholdSweep(samples, steps = 50) {
  const actual = samples.map((s) => s.actual);
  const scores = samples.map((s) => s.score);
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const threshold = i / steps;
    const cm = confusionMatrix(actual, thresholdPredictions(scores, threshold));
    const m = computeMetrics(cm);
    out.push({
      threshold: Number(threshold.toFixed(2)),
      accuracy: m.accuracy,
      precision: m.precision,
      recall: m.recall,
      f1: m.f1,
    });
  }
  return out;
}
