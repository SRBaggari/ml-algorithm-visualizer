import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trainTestSplit, validateTestPercent } from '../src/utils/split.js';
import { UserError } from '../src/utils/errors.js';
import { STUDENTS } from '../src/data/datasets.js';

test('test size = ceil(n × ratio), the rest is training', () => {
  for (const [ratio, testSize] of [[0.2, 5], [0.25, 6], [0.3, 8]]) {
    const s = trainTestSplit(STUDENTS, ratio, 1);
    assert.equal(s.testSize, testSize);
    assert.equal(s.trainSize, STUDENTS.length - testSize);
    assert.equal(s.train.length + s.test.length, STUDENTS.length);
  }
});

test('the two sets are disjoint and cover every sample', () => {
  const s = trainTestSplit(STUDENTS, 0.2, 7);
  const trainIds = new Set(s.train.map((x) => x.id));
  assert.ok(s.test.every((x) => !trainIds.has(x.id)));
  assert.equal(new Set([...s.train, ...s.test].map((x) => x.id)).size, STUDENTS.length);
});

test('shuffling is reproducible with a seed and changes with another seed', () => {
  const a = trainTestSplit(STUDENTS, 0.2, 3).test.map((x) => x.id);
  const b = trainTestSplit(STUDENTS, 0.2, 3).test.map((x) => x.id);
  const c = trainTestSplit(STUDENTS, 0.2, 4).test.map((x) => x.id);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('tiny datasets still keep at least one sample in each set', () => {
  const s = trainTestSplit([{ id: 1 }, { id: 2 }], 0.05, 1);
  assert.equal(s.trainSize, 1);
  assert.equal(s.testSize, 1);
});

test('invalid ratios and datasets are rejected', () => {
  assert.throws(() => trainTestSplit(STUDENTS, 0), UserError);
  assert.throws(() => trainTestSplit(STUDENTS, 1), /between 0 and 1/);
  assert.throws(() => trainTestSplit(STUDENTS, NaN), /between 0 and 1/);
  assert.throws(() => trainTestSplit([{ id: 1 }], 0.2), /At least 2/);
  assert.equal(validateTestPercent('20'), null);
  assert.match(validateTestPercent(''), /whole-number/);
  assert.match(validateTestPercent('12.5'), /whole-number/);
  assert.match(validateTestPercent('abc'), /whole-number/);
  assert.match(validateTestPercent('60'), /between 5% and 50%/);
  assert.match(validateTestPercent('2'), /between 5% and 50%/);
});
