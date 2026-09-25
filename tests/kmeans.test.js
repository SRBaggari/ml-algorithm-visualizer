import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distance, inertia, initCentroids, runKMeans } from '../src/algorithms/kmeans.js';
import { UserError } from '../src/utils/errors.js';
import { CLUSTER_DATASETS } from '../src/data/datasets.js';
import { close } from './helpers.js';

test('two well-separated groups give their exact means', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 10, y: 10 },
    { x: 10, y: 11 },
  ];
  const r = runKMeans(pts, 2, { seed: 4 });
  assert.ok(r.converged);
  const cs = [...r.centroids].sort((a, b) => a.x - b.x);
  close(cs[0].x, 0);
  close(cs[0].y, 0.5);
  close(cs[1].x, 10);
  close(cs[1].y, 10.5);
  assert.equal(r.assignments[0], r.assignments[1]);
  assert.notEqual(r.assignments[0], r.assignments[2]);
  close(inertia(pts, r.centroids, r.assignments), 1);
});

test('lesson example on a line converges to {1,2} and {9,10}', () => {
  const pts = [1, 2, 9, 10].map((x) => ({ x, y: 0 }));
  const r = runKMeans(pts, 2, { seed: 3 });
  const xs = r.centroids.map((c) => c.x).sort((a, b) => a - b);
  close(xs[0], 1.5);
  close(xs[1], 9.5);
});

test('states follow init → distance → assign → update and inertia never increases', () => {
  const r = runKMeans(CLUSTER_DATASETS.customers.points, 5, { seed: 3, method: 'kmeans++' });
  assert.equal(r.states[0].phase, 'init');
  assert.equal(r.states.at(-1).phase, 'converged');
  const inertias = r.states.filter((s) => s.phase === 'assign').map((s) => s.inertia);
  for (let i = 1; i < inertias.length; i++) assert.ok(inertias[i] <= inertias[i - 1] + 1e-9, 'inertia increased');
  assert.equal(r.assignments.length, CLUSTER_DATASETS.customers.points.length);
  assert.equal(r.states.at(-1).sizes.reduce((a, b) => a + b, 0), CLUSTER_DATASETS.customers.points.length);
});

test('centroid update is the mean of the assigned points', () => {
  const pts = CLUSTER_DATASETS.customers.points;
  const r = runKMeans(pts, 3, { seed: 7 });
  const update = r.states.find((s) => s.phase === 'update');
  update.centroids.forEach((c, ci) => {
    const members = pts.filter((_, i) => update.assignments[i] === ci);
    if (!members.length) return;
    close(c.x, members.reduce((a, p) => a + p.x, 0) / members.length);
    close(c.y, members.reduce((a, p) => a + p.y, 0) / members.length);
  });
});

test('same seed gives the same result', () => {
  const pts = CLUSTER_DATASETS.customers.points;
  assert.deepEqual(runKMeans(pts, 4, { seed: 9 }).assignments, runKMeans(pts, 4, { seed: 9 }).assignments);
  const init = initCentroids(pts, 3, { seed: 2, method: 'kmeans++' });
  assert.equal(init.length, 3);
  assert.equal(new Set(init.map((c) => `${c.x},${c.y}`)).size, 3);
});

test('edge cases give friendly errors', () => {
  assert.throws(() => runKMeans([], 2), (e) => e instanceof UserError && /no points/.test(e.message));
  assert.throws(() => runKMeans([{ x: 1, y: 1 }], 2), /at least 2/);
  assert.throws(() => runKMeans([{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }], 2), /distinct points/);
  assert.throws(() => runKMeans([{ x: 1, y: 1 }], 0), /at least 1/);
  close(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});
