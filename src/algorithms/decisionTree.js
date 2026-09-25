import { UserError } from '../utils/errors.js';
// Simplified ID3 decision tree for categorical data, using entropy and information gain.
//   Entropy H(S) = − Σ pᵢ · log₂(pᵢ)
//   Gain(S, A)   = H(S) − Σ (|Sᵥ| / |S|) · H(Sᵥ)

export function countBy(values) {
  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  return counts;
}

export function entropyFromCounts(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of Object.values(counts)) {
    if (c === 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  // Avoid "-0" and tiny floating point noise.
  return Math.abs(h) < 1e-12 ? 0 : h;
}

export function entropy(labels) {
  return entropyFromCounts(countBy(labels));
}

/** Readable formula such as "−(9/14)·log₂(9/14) − (5/14)·log₂(5/14)". */
export function entropyFormula(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const parts = Object.values(counts)
    .filter((c) => c > 0)
    .map((c) => `(${c}/${total})·log₂(${c}/${total})`);
  return parts.length ? `−${parts.join(' − ')}` : '0';
}

function valuesInOrder(rows, attribute) {
  const seen = [];
  for (const r of rows) if (!seen.includes(r[attribute])) seen.push(r[attribute]);
  return seen;
}

export function informationGain(rows, attribute, target) {
  const parentCounts = countBy(rows.map((r) => r[target]));
  const parentEntropy = entropyFromCounts(parentCounts);
  const branches = valuesInOrder(rows, attribute).map((value) => {
    const subset = rows.filter((r) => r[attribute] === value);
    const counts = countBy(subset.map((r) => r[target]));
    return { value, count: subset.length, counts, entropy: entropyFromCounts(counts), weight: subset.length / rows.length };
  });
  const weightedEntropy = branches.reduce((a, b) => a + b.weight * b.entropy, 0);
  const gain = parentEntropy - weightedEntropy;
  return { attribute, parentEntropy, weightedEntropy, gain: Math.abs(gain) < 1e-12 ? 0 : gain, branches };
}

function majorityClass(counts, fallback) {
  let best = fallback;
  let bestCount = -1;
  for (const [label, c] of Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (c > bestCount) {
      best = label;
      bestCount = c;
    }
  }
  return best;
}

/**
 * Build the tree and record a trace of every decision for the step-by-step animation.
 * rows: array of objects, each with a unique `__id`.
 */
export function buildDecisionTree(rows, attributes, target, { maxDepth = 10 } = {}) {
  if (!rows || rows.length === 0) throw new UserError('The dataset is empty. Add some rows before building the tree.');
  if (!target) throw new UserError('Choose a target (label) column.');
  if (!attributes || attributes.length === 0) throw new UserError('At least one attribute column is needed to split on.');
  if (rows.some((r) => r[target] === null || r[target] === undefined || r[target] === '')) {
    throw new UserError(`Some rows have no value for the target column "${target}". Fill or remove them first.`);
  }

  const trace = [];
  const nodes = [];
  let nextId = 0;

  function build(subset, attrs, depth, parentId, branchValue, path, parentMajority) {
    const id = nextId++;
    const counts = countBy(subset.map((r) => r[target]));
    const h = entropyFromCounts(counts);
    const majority = majorityClass(counts, parentMajority);
    const base = {
      id,
      depth,
      parentId,
      branchValue,
      path,
      samples: subset.length,
      rowIds: subset.map((r) => r.__id),
      counts,
      entropy: h,
      majority,
    };

    let leafReason = null;
    if (h === 0) leafReason = 'pure';
    else if (attrs.length === 0) leafReason = 'no-attributes';
    else if (depth >= maxDepth) leafReason = 'max-depth';

    let gains = null;
    let best = null;
    if (!leafReason) {
      gains = attrs.map((a) => informationGain(subset, a, target));
      best = gains.reduce((b, g) => (g.gain > b.gain + 1e-12 ? g : b), gains[0]);
      if (best.gain <= 0) leafReason = 'no-gain';
    }

    if (leafReason) {
      const node = { ...base, type: 'leaf', prediction: majority, leafReason, gains };
      nodes.push(node);
      trace.push({ type: 'leaf', nodeId: id });
      return node;
    }

    const node = { ...base, type: 'decision', attribute: best.attribute, gains, best, children: [] };
    nodes.push(node);
    trace.push({ type: 'evaluate', nodeId: id });
    trace.push({ type: 'split', nodeId: id });
    const remaining = attrs.filter((a) => a !== best.attribute);
    for (const branch of best.branches) {
      const childRows = subset.filter((r) => r[best.attribute] === branch.value);
      const child = build(childRows, remaining, depth + 1, id, branch.value, [...path, { attribute: best.attribute, value: branch.value }], majority);
      node.children.push(child);
    }
    return node;
  }

  const root = build(rows, attributes, 0, null, null, [], null);
  trace.push({ type: 'done', nodeId: null });
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return { root, trace, nodes: byId, target, attributes };
}

/** Walk the tree for one sample. Unknown branch values fall back to the node's majority class. */
export function classifySample(tree, sample) {
  const path = [];
  let node = tree.root;
  while (node) {
    path.push(node.id);
    if (node.type === 'leaf') return { prediction: node.prediction, path, note: null };
    const value = sample[node.attribute];
    const child = node.children.find((c) => c.branchValue === value);
    if (!child) {
      return {
        prediction: node.majority,
        path,
        note: `The tree never saw ${node.attribute} = "${value}" at this node, so it predicts the majority class here (${node.majority}).`,
      };
    }
    node = child;
  }
  return { prediction: null, path, note: 'Could not classify the sample.' };
}

/** Tidy layout: leaves are spaced evenly, parents are centered over their children. */
export function layoutTree(root) {
  const positions = {};
  let leafIndex = 0;
  let maxDepth = 0;
  function visit(node) {
    maxDepth = Math.max(maxDepth, node.depth);
    if (node.type === 'leaf' || !node.children || node.children.length === 0) {
      positions[node.id] = { x: leafIndex++, depth: node.depth };
      return positions[node.id].x;
    }
    const xs = node.children.map(visit);
    positions[node.id] = { x: (xs[0] + xs[xs.length - 1]) / 2, depth: node.depth };
    return positions[node.id].x;
  }
  visit(root);
  return { positions, leaves: leafIndex, depth: maxDepth };
}
