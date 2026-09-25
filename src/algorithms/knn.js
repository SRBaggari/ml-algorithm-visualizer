import { UserError } from '../utils/errors.js';
// K-Nearest Neighbors classification with Euclidean distance and majority voting.

export const KNN_STEPS = [
  { id: 'query', title: 'Show the query point', short: 'Query', description: 'The new, unlabelled point we want to classify.' },
  { id: 'distance', title: 'Calculate Euclidean distances', short: 'Distances', description: 'Measure the straight-line distance from the query to every labelled point.' },
  { id: 'sort', title: 'Sort neighbors by distance', short: 'Sort', description: 'Order all points from nearest to farthest.' },
  { id: 'neighbors', title: 'Highlight the K nearest neighbors', short: 'K nearest', description: 'Keep only the K closest points - they are the voters.' },
  { id: 'vote', title: 'Count the class votes', short: 'Voting', description: 'Each neighbor votes for its own class.' },
  { id: 'predict', title: 'Display the prediction', short: 'Prediction', description: 'The class with the most votes wins.' },
];

export function euclidean(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function validateK(k, n) {
  if (!Number.isInteger(k) || k < 1) return 'K must be a whole number of at least 1.';
  if (n === 0) return 'There are no labelled points. Add some points first.';
  if (k > n) return `K = ${k} is larger than the number of labelled points (${n}). Choose K ≤ ${n}.`;
  return null;
}

export function knnClassify(points, query, k) {
  const error = validateK(k, points.length);
  if (error) throw new UserError(error);
  if (!query || !Number.isFinite(query.x) || !Number.isFinite(query.y)) throw new UserError('The query point has invalid coordinates.');

  const distances = points.map((p, index) => {
    const dx = p.x - query.x;
    const dy = p.y - query.y;
    return { index, point: p, dx, dy, distance: Math.sqrt(dx * dx + dy * dy) };
  });
  // Stable ordering: by distance, then by original index.
  const ranked = [...distances]
    .sort((a, b) => a.distance - b.distance || a.index - b.index)
    .map((d, i) => ({ ...d, rank: i + 1 }));
  const neighbors = ranked.slice(0, k);

  const labels = [...new Set(points.map((p) => p.label))].sort();
  const votes = labels.map((label) => {
    const members = neighbors.filter((n) => n.point.label === label);
    return { label, count: members.length, totalDistance: members.reduce((a, m) => a + m.distance, 0) };
  });
  const maxVotes = Math.max(...votes.map((v) => v.count));
  const tied = votes.filter((v) => v.count === maxVotes);

  let prediction;
  let tieNote = null;
  if (tied.length === 1) {
    prediction = tied[0].label;
  } else {
    // Tie-break: the tied class whose neighbors are closer overall wins.
    const winner = [...tied].sort((a, b) => a.totalDistance - b.totalDistance)[0];
    prediction = winner.label;
    tieNote = `Tie between ${tied.map((t) => t.label).join(' and ')} (${maxVotes} votes each). The class whose neighbors are closer in total (${winner.label}) wins. Using an odd K helps avoid ties with two classes.`;
  }

  return {
    k,
    query,
    distances,
    ranked,
    neighbors,
    votes: [...votes].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    prediction,
    tieNote,
    radius: neighbors[neighbors.length - 1].distance,
  };
}

/** Classify every cell of a grid to show decision regions. */
export function decisionGrid(points, k, xDomain, yDomain, cols = 36, rows = 24) {
  if (validateK(k, points.length)) return [];
  const cells = [];
  const w = (xDomain[1] - xDomain[0]) / cols;
  const h = (yDomain[1] - yDomain[0]) / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const q = { x: xDomain[0] + (i + 0.5) * w, y: yDomain[0] + (j + 0.5) * h };
      const { prediction } = knnClassify(points, q, k);
      cells.push({ x0: xDomain[0] + i * w, y0: yDomain[0] + j * h, w, h, label: prediction });
    }
  }
  return cells;
}
