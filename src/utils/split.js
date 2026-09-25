import { UserError } from './errors.js';
import { createRng, shuffle } from './random.js';

/**
 * Shuffle then split, like scikit-learn's train_test_split:
 * the test set size is rounded up (ceil), the rest goes to training.
 */
export function trainTestSplit(items, testRatio, seed = 42) {
  if (!Array.isArray(items) || items.length < 2) throw new UserError('At least 2 samples are needed to create a train and a test set.');
  if (!(testRatio > 0 && testRatio < 1)) throw new UserError('The test ratio must be between 0 and 1.');
  const shuffled = shuffle(items, createRng(seed));
  const testSize = Math.min(items.length - 1, Math.max(1, Math.ceil(items.length * testRatio)));
  const trainSize = items.length - testSize;
  return { shuffled, train: shuffled.slice(0, trainSize), test: shuffled.slice(trainSize), trainSize, testSize };
}

/** Returns an error message, or null when the custom test percentage is usable. */
export function validateTestPercent(text) {
  const v = Number(text);
  if (String(text).trim() === '' || !Number.isInteger(v)) return 'Enter the test-set size as a whole-number percentage, e.g. 20.';
  if (v < 5 || v > 50) return 'The test set should be between 5% and 50% of the data - otherwise one of the sets becomes too small to be useful.';
  return null;
}
