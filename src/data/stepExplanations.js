// Beginner-friendly "Explain this step" content. Each function returns
// { what, why, how, meaning } for the current step, using the real calculated values.
import { fmt, signed } from '../utils/format.js';

function entropyMeaning(h) {
  if (h === 0) return 'All rows here have the same label - there is no uncertainty left.';
  if (h >= 0.9) return 'The labels are very mixed, so we are quite uncertain about the answer here.';
  if (h >= 0.5) return 'The labels are fairly mixed - a good question should reduce this uncertainty.';
  return 'Most rows share one label, so there is only a little uncertainty.';
}

export const IDLE_EXPLANATIONS = {
  'linear-regression': {
    what: 'Nothing has been calculated yet.',
    why: 'Linear regression needs data points before it can find a line.',
    how: 'Keep the sample data (or add your own points), then press “Train Model”.',
    meaning: 'Each step will then explain one part of the calculation.',
  },
  knn: {
    what: 'The query point (★) is waiting to be classified.',
    why: 'KNN decides a class only when a new point arrives.',
    how: 'Choose K, place the query point and press “Classify”.',
    meaning: 'The steps will show the distances, the neighbors and the vote.',
  },
  'decision-tree': {
    what: 'The tree has not been built yet.',
    why: 'ID3 needs the training rows to decide which questions to ask.',
    how: 'Press “Build Decision Tree”.',
    meaning: 'Each step will show one entropy / information-gain decision.',
  },
  kmeans: {
    what: 'The points are not grouped yet (grey).',
    why: 'K-Means has no labels - it must discover the groups itself.',
    how: 'Choose K and press “Step” or “Run”.',
    meaning: 'You will see centroids appear, points get assigned and centroids move.',
  },
};

export function linearRegressionStep(model, step) {
  const m = model;
  return [
    {
      what: 'The mean (average) of all x values and of all y values.',
      why: 'Now we calculate the mean of X and Y so that we can measure how each point differs from the center - the relationship between the variables is built from these differences.',
      how: `x̄ = ${fmt(m.sumX, 3)} / ${m.n} and ȳ = ${fmt(m.sumY, 3)} / ${m.n}. The dashed lines mark them on the chart.`,
      meaning: `The center of the data is (${fmt(m.meanX, 3)}, ${fmt(m.meanY, 3)}). The best-fit line will pass through this point.`,
    },
    {
      what: 'The slope b₁ of the line.',
      why: 'The slope tells us how strongly y changes when x changes.',
      how: `Multiply each point's x-deviation by its y-deviation and add them up (${fmt(m.sxy, 3)}), then divide by the sum of squared x-deviations (${fmt(m.sxx, 3)}).`,
      meaning: `b₁ = ${fmt(m.slope, 4)}: each extra unit of x ${m.slope >= 0 ? 'adds' : 'subtracts'} about ${fmt(Math.abs(m.slope), 3)} to the prediction. Green lines on the chart push the slope up, red lines push it down.`,
    },
    {
      what: 'The intercept b₀.',
      why: 'We need a starting height for the line so that it passes through the mean point.',
      how: `b₀ = ȳ − b₁·x̄ = ${fmt(m.meanY, 3)} − ${fmt(m.slope, 3)} × ${fmt(m.meanX, 3)}.`,
      meaning: `b₀ = ${fmt(m.intercept, 4)} is the predicted value when x = 0. The dashed preview line now uses both numbers.`,
    },
    {
      what: 'A prediction ŷ for every point.',
      why: 'To judge the line, we compare what it predicts with the real values.',
      how: `Plug each x into ŷ = ${fmt(m.intercept, 3)} + ${fmt(m.slope, 3)}·x (the hollow circles on the line).`,
      meaning: `For example, x = ${fmt(m.rows[0].x)} gives ŷ = ${fmt(m.rows[0].yHat, 3)} while the real value is ${fmt(m.rows[0].y)}.`,
    },
    {
      what: 'The errors (residuals), the Mean Squared Error and R².',
      why: 'Errors show how far the predictions are from reality; MSE and R² summarise the whole fit in single numbers.',
      how: `Residual = y − ŷ (red lines). Square them, add them (${fmt(m.sse, 3)}) and divide by ${m.n} for the MSE.`,
      meaning: `MSE = ${fmt(m.mse, 3)} (a typical error of about ${fmt(m.rmse, 2)} units). R² = ${fmt(m.r2, 3)}, so the line explains ${fmt(m.r2 * 100, 1)}% of the variation in y.`,
    },
    {
      what: 'The final best-fit line.',
      why: 'This is the line with the smallest possible sum of squared errors - no other straight line fits these points better.',
      how: `ŷ = ${fmt(m.slope, 3)}x ${signed(m.intercept, 3)}.`,
      meaning: 'Use “Make a prediction” below to predict y for any new x value.',
    },
  ][step];
}

export function knnStep(result, step, k) {
  const nearest = result.ranked[0];
  const top = result.votes[0];
  return [
    {
      what: 'The query point (★) - the new, unlabelled point.',
      why: 'KNN classifies a point by comparing it with the labelled points around it.',
      how: `The query sits at (${fmt(result.query.x)}, ${fmt(result.query.y)}) among ${result.distances.length} labelled points.`,
      meaning: 'Its class is unknown for now - the next steps will decide it.',
    },
    {
      what: 'The distance from the query to every training point.',
      why: 'Now we calculate the distance between the query point and every training point, because closer points are more similar.',
      how: 'Euclidean distance: √((Δx)² + (Δy)²) for each point (the numbers on the lines).',
      meaning: `The closest point is a “${nearest.point.label}” at distance ${fmt(nearest.distance, 3)}.`,
    },
    {
      what: 'The points sorted from nearest to farthest.',
      why: 'Sorting makes it easy to pick the K closest points.',
      how: 'Order all distances from smallest to largest (the #1, #2, … labels and the distance table).',
      meaning: `Rank #1 is ${fmt(nearest.distance, 3)} away; the farthest point is ${fmt(result.ranked[result.ranked.length - 1].distance, 3)} away.`,
    },
    {
      what: `The K = ${k} nearest neighbors.`,
      why: 'Only the closest points should influence the decision.',
      how: `Keep ranks 1 to ${k}; the ring shows the distance to the ${k === 1 ? 'nearest' : `${k}th nearest`} neighbor (${fmt(result.radius, 3)}).`,
      meaning: 'Points outside the ring are ignored for this prediction.',
    },
    {
      what: 'The votes per class.',
      why: 'Each neighbor votes for its own class - the majority decides.',
      how: result.votes.map((v) => `${v.label}: ${v.count}`).join(', '),
      meaning: `${top.label} leads with ${top.count} of ${k} votes.`,
    },
    {
      what: 'The final prediction.',
      why: 'The class with the most votes is the most common class in the neighborhood.',
      how: result.tieNote ? 'There was a tie, so the class whose neighbors are closer overall wins.' : 'Pick the class with the most votes.',
      meaning: `The query point is classified as “${result.prediction}”.`,
    },
  ][step];
}

export function decisionTreeStep(entry, tree) {
  const node = entry.nodeId !== null ? tree.nodes[entry.nodeId] : null;
  const where = !node || node.path.length === 0 ? 'the whole dataset' : node.path.map((p) => `${p.attribute} = ${p.value}`).join(' and ');
  if (entry.type === 'evaluate') {
    const best = node.best;
    return {
      what: `Entropy and information gain for the ${node.samples} rows of ${where}.`,
      why: 'We compare information gain values to determine which feature should become the next split.',
      how: `Entropy of these rows = ${fmt(node.entropy, 3)}. For each attribute, split the rows and subtract the weighted entropy of the parts from ${fmt(node.entropy, 3)}.`,
      meaning: `${entropyMeaning(node.entropy)} “${best.attribute}” has the highest gain (${fmt(best.gain, 3)}), so it removes the most uncertainty.`,
    };
  }
  if (entry.type === 'split') {
    return {
      what: `A split on “${node.attribute}”.`,
      why: 'The attribute with the highest information gain gives the most useful question.',
      how: `The rows are divided into ${node.best.branches.length} branches: ${node.best.branches.map((b) => `${b.value} (${b.count})`).join(', ')}.`,
      meaning: 'Each branch is now handled separately, using the remaining attributes.',
    };
  }
  if (entry.type === 'leaf') {
    const reason =
      node.leafReason === 'pure'
        ? `all ${node.samples} rows have the same label, so entropy is 0`
        : node.leafReason === 'no-attributes'
          ? 'no attributes are left to ask about'
          : 'no attribute reduces the uncertainty any further';
    return {
      what: `A leaf (final answer) for ${where}.`,
      why: `We stop asking questions because ${reason}.`,
      how: 'The leaf predicts the most common label among its rows.',
      meaning: `Any sample that reaches this leaf is predicted as “${node.prediction}”.`,
    };
  }
  const leaves = Object.values(tree.nodes).filter((n) => n.type === 'leaf').length;
  return {
    what: 'The finished decision tree.',
    why: 'Every branch now ends in a prediction.',
    how: `The tree asks up to ${Math.max(...Object.values(tree.nodes).map((n) => n.depth))} questions and has ${leaves} leaves.`,
    meaning: 'Read each path from the root to a leaf as an if-then rule, or classify a new sample below.',
  };
}

export function kmeansStep(state, k) {
  switch (state.phase) {
    case 'init':
      return {
        what: `${k} starting centroids (the numbered diamonds).`,
        why: 'K-Means needs a starting guess for the center of each cluster.',
        how: 'Pick K distinct data points (randomly, or spread out with K-Means++).',
        meaning: 'These guesses are usually poor - the next iterations will improve them.',
      };
    case 'distance':
      return {
        what: 'The distance from every point to every centroid.',
        why: 'To find which centroid each point is closest to.',
        how: `Euclidean distance to each of the ${k} centroids (see the table - the smallest value in each row is bold).`,
        meaning: 'Click any point to see its distances drawn on the chart.',
      };
    case 'assign':
      return {
        what: 'A cluster for every point.',
        why: 'Each point is assigned to the nearest centroid.',
        how: `Pick the smallest distance in each row. Cluster sizes: ${state.sizes.join(', ')}.`,
        meaning:
          state.changed === 0
            ? 'No point changed cluster, so the algorithm has converged.'
            : `${state.changed} point${state.changed === 1 ? '' : 's'} ${state.iteration === 1 ? 'received a cluster' : 'changed cluster'} this iteration.`,
      };
    case 'update':
      return {
        what: 'New centroid positions.',
        why: 'The best center for a group of points is their average position.',
        how: 'Each centroid moves to the mean x and mean y of its assigned points.',
        meaning: `The largest move was ${fmt(Math.max(...state.shifts), 2)} units. Smaller moves mean the clusters are settling.`,
      };
    default:
      return {
        what: 'The final clusters.',
        why: state.converged ? 'Assignments stopped changing, so the centroids are stable.' : 'The iteration limit was reached.',
        how: `Finished after ${state.iteration} iteration${state.iteration === 1 ? '' : 's'}.`,
        meaning: `Inertia (total squared distance to centroids) = ${fmt(state.inertia, 1)}. Lower values mean tighter clusters.`,
      };
  }
}

const pctText = (v) => (v === null ? 'undefined' : `${(v * 100).toFixed(1)}%`);

export function evaluationStep(stepId, cm, m) {
  switch (stepId) {
    case 'compare':
      return {
        what: 'Whether each prediction was right or wrong, and in which way.',
        why: 'Different mistakes have different costs, so we keep them apart instead of just counting errors.',
        how: 'Each sample goes into one cell: actual positive/negative (row) × predicted positive/negative (column).',
        meaning: 'The diagonal (TP, TN) holds correct predictions; the other two cells hold the two kinds of mistakes.',
      };
    case 'count':
      return {
        what: 'The four counts TP, FN, FP and TN.',
        why: 'Every metric is built from these four numbers.',
        how: `TP = ${cm.tp}, FN = ${cm.fn}, FP = ${cm.fp}, TN = ${cm.tn}.`,
        meaning: `${cm.tp + cm.tn} of ${m.total} predictions were correct; ${cm.fp} were false alarms and ${cm.fn} were misses.`,
      };
    case 'accuracy':
      return {
        what: 'Accuracy - the share of all predictions that were correct.',
        why: 'It is the simplest overall summary of performance.',
        how: `(TP + TN) / total = (${cm.tp} + ${cm.tn}) / ${m.total}.`,
        meaning: `${pctText(m.accuracy)} of predictions were right. Be careful: on imbalanced data accuracy can look high even for a useless model.`,
      };
    case 'precision':
      return {
        what: 'Precision - how trustworthy a positive prediction is.',
        why: 'When false alarms are costly (e.g. marking a real email as spam), precision matters most.',
        how: `TP / (TP + FP) = ${cm.tp} / (${cm.tp} + ${cm.fp}).`,
        meaning: m.precision === null ? 'Undefined: the model never predicted positive, so there is nothing to measure.' : `When the model says “positive”, it is right ${pctText(m.precision)} of the time.`,
      };
    case 'recall':
      return {
        what: 'Recall - how many of the real positives were found.',
        why: 'When misses are costly (e.g. failing to detect a disease), recall matters most.',
        how: `TP / (TP + FN) = ${cm.tp} / (${cm.tp} + ${cm.fn}).`,
        meaning: m.recall === null ? 'Undefined: there are no actual positives in the data.' : `The model found ${pctText(m.recall)} of all actual positives.`,
      };
    default:
      return {
        what: 'The F1 score - one number that balances precision and recall.',
        why: 'A model can cheat one metric (e.g. predict everything positive for 100% recall); F1 is only high when both are good.',
        how: 'F1 = 2 · Precision · Recall / (Precision + Recall), the harmonic mean.',
        meaning: m.f1 === null ? 'Undefined because precision or recall is undefined (or both are 0).' : `F1 = ${pctText(m.f1)}.`,
      };
  }
}

export const EVALUATION_IDLE = {
  what: 'Accuracy, precision, recall and F1 from the confusion matrix.',
  why: 'A single number rarely tells the whole story - each metric focuses on a different kind of mistake.',
  how: 'Change any count in the matrix (or move the threshold) and every metric recalculates instantly.',
  meaning: 'Press “Explain step by step” for a guided walkthrough of each calculation.',
};

export function splitStep(stepId, { total, trainSize, testSize, trainPct, testPct }) {
  return {
    original: {
      what: `The full dataset of ${total} students, in file order.`,
      why: 'Before training we must decide which rows the model may learn from and which rows are kept for testing.',
      how: 'Nothing has moved yet - each card is one student (✓ pass, ✗ fail).',
      meaning: 'If we split now, the order of the file could bias both sets.',
    },
    shuffle: {
      what: 'A random reordering of the rows.',
      why: 'Files are often sorted; shuffling makes both sets representative of the whole dataset.',
      how: 'A seeded random shuffle (press “New shuffle” for a different order).',
      meaning: 'Every row now has the same chance of landing in either set.',
    },
    split: {
      what: `${trainSize} training rows and ${testSize} testing rows.`,
      why: 'The model learns from the training set; the test set stays hidden so we can later check it on unseen data.',
      how: `Test size = ceil(${total} × ${testPct / 100}) = ${testSize}; the remaining ${trainSize} rows are used for training.`,
      meaning: 'Rows never appear in both sets, so the test score will be an honest estimate.',
    },
    counts: {
      what: `Training: ${trainPct}% (${trainSize} rows). Testing: ${testPct}% (${testSize} rows).`,
      why: 'More training data usually helps learning; more test data gives a more reliable grade.',
      how: 'Compare the class balance of both sets in the chart below.',
      meaning: 'The split is ready - the model would now be trained on the left group and evaluated on the right group.',
    },
  }[stepId];
}
