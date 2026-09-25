import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decisionGrid, euclidean, KNN_STEPS, knnClassify, validateK } from '../src/algorithms/knn.js';
import { UserError } from '../src/utils/errors.js';
import { KNN_DATASETS } from '../src/data/datasets.js';
import { close } from './helpers.js';

test('euclidean distance', () => {
  close(euclidean({ x: 1, y: 2 }, { x: 4, y: 6 }), 5);
  close(euclidean({ x: 0, y: 0 }, { x: 0, y: 0 }), 0);
});

test('lesson example: query (2,2), K = 3 → Class A with 2 votes to 1', () => {
  const pts = [
    { x: 1, y: 1, label: 'A' },
    { x: 2, y: 3, label: 'A' },
    { x: 4, y: 4, label: 'B' },
    { x: 5, y: 2, label: 'B' },
  ];
  const r = knnClassify(pts, { x: 2, y: 2 }, 3);
  assert.deepEqual(r.ranked.map((d) => d.point.label), ['A', 'A', 'B', 'B']);
  close(r.ranked[0].distance, 1);
  close(r.ranked[1].distance, Math.SQRT2);
  close(r.radius, Math.sqrt(8));
  assert.deepEqual(r.votes.map((v) => [v.label, v.count]), [['A', 2], ['B', 1]]);
  assert.equal(r.prediction, 'A');
  assert.equal(r.tieNote, null);
});

test('K = 1 uses only the nearest point', () => {
  const pts = [
    { x: 0, y: 0, label: 'A' },
    { x: 3, y: 0, label: 'B' },
    { x: 3.2, y: 0, label: 'B' },
  ];
  assert.equal(knnClassify(pts, { x: 1, y: 0 }, 1).prediction, 'A');
  assert.equal(knnClassify(pts, { x: 1, y: 0 }, 3).prediction, 'B');
});

test('ties are broken by the closer class and explained', () => {
  const pts = [
    { x: 1, y: 0, label: 'A' },
    { x: -1.5, y: 0, label: 'B' },
  ];
  const r = knnClassify(pts, { x: 0, y: 0 }, 2);
  assert.equal(r.prediction, 'A');
  assert.match(r.tieNote, /Tie between/);
});

test('invalid K and inputs are rejected', () => {
  const pts = [{ x: 0, y: 0, label: 'A' }];
  assert.match(validateK(0, 5), /at least 1/);
  assert.match(validateK(2.5, 5), /whole number/);
  assert.match(validateK(3, 0), /no labelled points/);
  assert.match(validateK(6, 5), /larger than/);
  assert.equal(validateK(5, 5), null);
  assert.throws(() => knnClassify(pts, { x: 0, y: 0 }, 2), UserError);
  assert.throws(() => knnClassify(pts, { x: NaN, y: 0 }, 1), /invalid coordinates/);
});

test('decision grid classifies every cell', () => {
  const d = KNN_DATASETS.simple;
  const cells = decisionGrid(d.points, 5, d.xDomain, d.yDomain, 10, 8);
  assert.equal(cells.length, 80);
  assert.ok(cells.every((c) => d.classes.includes(c.label)));
  assert.deepEqual(decisionGrid([], 3, [0, 1], [0, 1]), []);
});

test('six documented steps', () => {
  assert.deepEqual(KNN_STEPS.map((s) => s.id), ['query', 'distance', 'sort', 'neighbors', 'vote', 'predict']);
});

test('iris-style sample classifies obvious points correctly', () => {
  const pts = KNN_DATASETS.iris.points;
  assert.equal(knnClassify(pts, { x: 1.4, y: 0.2 }, 5).prediction, 'Setosa');
  assert.equal(knnClassify(pts, { x: 6.0, y: 2.3 }, 5).prediction, 'Virginica');
});
