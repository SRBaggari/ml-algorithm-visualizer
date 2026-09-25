import { UserError } from '../utils/errors.js';
// K-Means clustering (Lloyd's algorithm). Every intermediate state is recorded
// so the UI can replay: initialize → distances → assign → update → repeat.
import { createRng } from '../utils/random.js';

export const KMEANS_PHASES = {
  init: 'Initialize centroids',
  distance: 'Calculate distances to each centroid',
  assign: 'Assign points to the nearest centroid',
  update: 'Recalculate centroid positions',
  converged: 'Converged',
};

export function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function initCentroids(points, k, { seed = 1, method = 'random' } = {}) {
  const rng = createRng(seed);
  const unique = [];
  const keys = new Set();
  for (const p of points) {
    const key = `${p.x},${p.y}`;
    if (!keys.has(key)) {
      keys.add(key);
      unique.push(p);
    }
  }
  if (unique.length < k) throw new UserError(`K-Means needs at least ${k} distinct points for K = ${k}. Add more points or lower K.`);

  if (method === 'kmeans++') {
    // K-Means++: pick the first centroid at random, then favour points far from existing centroids.
    const centroids = [unique[Math.floor(rng() * unique.length)]];
    while (centroids.length < k) {
      const d2 = unique.map((p) => Math.min(...centroids.map((c) => distance(p, c) ** 2)));
      const total = d2.reduce((a, b) => a + b, 0);
      let r = rng() * total;
      let idx = 0;
      while (idx < d2.length - 1 && r >= d2[idx]) {
        r -= d2[idx];
        idx++;
      }
      centroids.push(unique[idx]);
    }
    return centroids.map((c) => ({ x: c.x, y: c.y }));
  }

  // Random: choose K distinct data points.
  const pool = [...unique];
  const centroids = [];
  for (let i = 0; i < k; i++) {
    const j = Math.floor(rng() * pool.length);
    centroids.push({ x: pool[j].x, y: pool[j].y });
    pool.splice(j, 1);
  }
  return centroids;
}

export function inertia(points, centroids, assignments) {
  return points.reduce((a, p, i) => a + distance(p, centroids[assignments[i]]) ** 2, 0);
}

export function runKMeans(points, k, { seed = 1, method = 'random', maxIterations = 30 } = {}) {
  if (!Number.isInteger(k) || k < 1) throw new UserError('K must be a whole number of at least 1.');
  if (!points || points.length === 0) throw new UserError('There are no points to cluster. Add points or load a dataset.');
  if (points.length < k) throw new UserError(`There are only ${points.length} points - K-Means with K = ${k} needs at least ${k}.`);

  let centroids = initCentroids(points, k, { seed, method });
  let assignments = null;
  const states = [{ phase: 'init', iteration: 0, centroids, assignments: null }];
  let converged = false;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    const distances = points.map((p) => centroids.map((c) => distance(p, c)));
    states.push({ phase: 'distance', iteration, centroids, assignments, distances });

    const next = distances.map((row) => row.indexOf(Math.min(...row)));
    const changed = assignments ? next.filter((a, i) => a !== assignments[i]).length : points.length;
    assignments = next;
    const sizes = centroids.map((_, c) => assignments.filter((a) => a === c).length);
    states.push({ phase: 'assign', iteration, centroids, assignments, distances, changed, sizes, inertia: inertia(points, centroids, assignments) });

    if (changed === 0) {
      converged = true;
      break;
    }

    const emptyClusters = [];
    const updated = centroids.map((c, ci) => {
      const members = points.filter((_, i) => assignments[i] === ci);
      if (members.length === 0) {
        emptyClusters.push(ci);
        return c; // Keep an empty cluster's centroid where it was.
      }
      return {
        x: members.reduce((a, p) => a + p.x, 0) / members.length,
        y: members.reduce((a, p) => a + p.y, 0) / members.length,
      };
    });
    const shifts = updated.map((c, i) => distance(c, centroids[i]));
    states.push({
      phase: 'update',
      iteration,
      previousCentroids: centroids,
      centroids: updated,
      assignments,
      shifts,
      emptyClusters,
      inertia: inertia(points, updated, assignments),
    });
    centroids = updated;
  }

  const final = states[states.length - 1];
  states.push({
    phase: 'converged',
    iteration,
    centroids,
    assignments,
    converged,
    inertia: inertia(points, centroids, assignments),
    sizes: centroids.map((_, c) => assignments.filter((a) => a === c).length),
    lastPhase: final.phase,
  });
  return { states, iterations: iteration, converged, centroids, assignments };
}
