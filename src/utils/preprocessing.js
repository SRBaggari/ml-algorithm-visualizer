import { UserError } from './errors.js';
// Data preprocessing operations. Each operation returns a record of exactly
// what it did - BEFORE dataset, PROCESS (the calculations) and AFTER dataset -
// so the UI can show the transformation and support undo.
//
// Dataset shape used throughout: { headers: string[], rows: { id: number, values: any[] }[] }

import { fmt } from './format.js';

export function isMissing(v) {
  return v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v));
}

export function makeDataset(headers, rawRows) {
  return { headers: [...headers], rows: rawRows.map((values, i) => ({ id: i + 1, values: [...values] })) };
}

function cloneDataset(ds) {
  return { headers: [...ds.headers], rows: ds.rows.map((r) => ({ id: r.id, values: [...r.values] })) };
}

export function mean(values) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Most frequent value. Ties are broken by first appearance, so results are deterministic. */
export function mode(values) {
  if (values.length === 0) return null;
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/** Population standard deviation. */
export function std(values) {
  if (values.length === 0) return null;
  const m = mean(values);
  return Math.sqrt(values.reduce((a, v) => a + (v - m) ** 2, 0) / values.length);
}

/** Describe each column: type, missing count, unique values and quick stats. */
export function columnProfile(dataset) {
  return dataset.headers.map((name, c) => {
    const values = dataset.rows.map((r) => r.values[c]);
    const present = values.filter((v) => !isMissing(v));
    const numeric = present.length > 0 && present.every((v) => typeof v === 'number');
    const profile = {
      name,
      index: c,
      type: numeric ? 'numeric' : 'categorical',
      missing: values.length - present.length,
      unique: new Set(present).size,
    };
    if (numeric) {
      profile.min = Math.min(...present);
      profile.max = Math.max(...present);
      profile.mean = mean(present);
    } else {
      profile.top = mode(present);
    }
    return profile;
  });
}

/** Rows whose values exactly match an earlier row. */
export function findDuplicates(dataset) {
  const seen = new Map();
  const duplicates = [];
  for (const row of dataset.rows) {
    const key = JSON.stringify(row.values);
    if (seen.has(key)) duplicates.push({ id: row.id, duplicateOf: seen.get(key) });
    else seen.set(key, row.id);
  }
  return duplicates;
}

function columnValues(dataset, c) {
  return dataset.rows.map((r) => r.values[c]).filter((v) => !isMissing(v));
}

function describeFill(strategy, values, fill) {
  if (strategy === 'mean') {
    const sum = values.reduce((a, b) => a + b, 0);
    return `mean = sum / count = ${fmt(sum, 3)} / ${values.length} = ${fmt(fill, 3)}`;
  }
  if (strategy === 'median') {
    const sorted = [...values].sort((a, b) => a - b);
    const shown = sorted.length > 12 ? `${sorted.slice(0, 12).map((v) => fmt(v)).join(', ')}, …` : sorted.map((v) => fmt(v)).join(', ');
    return `median of sorted values [${shown}] = ${fmt(fill, 3)}`;
  }
  const count = values.filter((v) => v === fill).length;
  return `mode = most frequent value "${fill}" (appears ${count} time${count === 1 ? '' : 's'})`;
}

export const OPERATION_INFO = {
  duplicates: {
    title: 'Remove duplicate rows',
    explanation:
      'Duplicate rows repeat the same information. Keeping them gives those examples extra weight and can leak identical rows into both the training and test sets.',
  },
  missing: {
    title: 'Handle missing values',
    explanation:
      'Most ML algorithms cannot work with empty cells. We either remove incomplete rows or fill (impute) the gaps with a representative value from the same column.',
  },
  encoding: {
    title: 'Label encoding',
    explanation:
      'Algorithms work with numbers, not text. Label encoding replaces each category with an integer code (sorted alphabetically here). Note: the codes imply an order that may not really exist.',
  },
  minmax: {
    title: 'Min-Max scaling',
    explanation:
      "Min-Max scaling squeezes every numeric column into the range 0 to 1 using x' = (x − min) / (max − min). This stops large-valued features (like salary) from dominating small ones (like age) in distance-based algorithms such as KNN and K-Means.",
  },
  standard: {
    title: 'Standardization (z-score)',
    explanation:
      'Standardization centers each numeric column at 0 with a standard deviation of 1 using z = (x − mean) / std. Values then say how many standard deviations from the average a sample is.',
  },
};

function record(id, fields) {
  const r = { id, explanation: OPERATION_INFO[id].explanation, removedRowIds: [], changes: [], process: [], ...fields };
  r.changed = r.changes.length > 0 || r.removedRowIds.length > 0;
  return r;
}

/* ---------------- Individual operations ---------------- */

export function removeDuplicatesOp(dataset) {
  const before = dataset;
  const dups = findDuplicates(before);
  const removed = new Set(dups.map((d) => d.id));
  const after = { headers: [...before.headers], rows: before.rows.filter((r) => !removed.has(r.id)).map((r) => ({ id: r.id, values: [...r.values] })) };
  return record('duplicates', {
    title: OPERATION_INFO.duplicates.title,
    summary: dups.length ? `Removed ${dups.length} duplicate row${dups.length === 1 ? '' : 's'}.` : 'No duplicate rows found - nothing changed.',
    process: dups.length ? dups.map((d) => `Row ${d.id} is an exact copy of row ${d.duplicateOf} → remove it`) : ['Compared every row with the rows above it: no exact copies.'],
    removedRowIds: [...removed],
    before,
    after,
  });
}

/** strategy: 'mean' | 'median' | 'mode' | 'drop' */
export function handleMissingOp(dataset, strategy) {
  const before = dataset;
  const process = [];
  const changes = [];
  let after;
  let removedRowIds = [];

  if (strategy === 'drop') {
    removedRowIds = before.rows.filter((r) => r.values.some(isMissing)).map((r) => r.id);
    if (removedRowIds.length === before.rows.length && before.rows.length > 0) {
      throw new UserError('Removing rows with missing values would delete every row. Try an imputation method instead.');
    }
    const removed = new Set(removedRowIds);
    after = { headers: [...before.headers], rows: before.rows.filter((r) => !removed.has(r.id)).map((r) => ({ id: r.id, values: [...r.values] })) };
    process.push(
      removedRowIds.length
        ? `Rows ${removedRowIds.join(', ')} contain at least one empty cell → removed.`
        : 'Every row is complete - nothing to remove.',
    );
  } else {
    after = cloneDataset(before);
    for (const col of columnProfile(before)) {
      if (col.missing === 0) continue;
      const values = columnValues(before, col.index);
      if (values.length === 0) {
        process.push(`${col.name}: every value is missing, so there is nothing to compute a fill value from. Column left unchanged.`);
        continue;
      }
      const used = col.type === 'numeric' ? strategy : 'mode';
      const fill = used === 'mean' ? mean(values) : used === 'median' ? median(values) : mode(values);
      const note = col.type === 'categorical' && strategy !== 'mode' ? ' (text column: mean/median need numbers, so the mode is used)' : '';
      process.push(`${col.name}: ${describeFill(used, values, fill)}${note}`);
      after.rows.forEach((r) => {
        if (isMissing(r.values[col.index])) {
          const value = typeof fill === 'number' ? Number(fill.toFixed(4)) : fill;
          r.values[col.index] = value;
          changes.push({ rowId: r.id, column: col.name, colIndex: col.index, before: null, after: value });
        }
      });
    }
    if (process.length === 0) process.push('No missing values found - nothing to fill.');
  }

  const label = { mean: 'mean', median: 'median', mode: 'mode', drop: 'remove rows' }[strategy];
  return record('missing', {
    title: strategy === 'drop' ? 'Remove rows with missing values' : `Impute missing values (${label})`,
    summary:
      strategy === 'drop'
        ? removedRowIds.length
          ? `Removed ${removedRowIds.length} incomplete row${removedRowIds.length === 1 ? '' : 's'}.`
          : 'No incomplete rows - nothing changed.'
        : changes.length
          ? `Filled ${changes.length} missing cell${changes.length === 1 ? '' : 's'}.`
          : 'No missing values - nothing changed.',
    process,
    changes,
    removedRowIds,
    before,
    after,
  });
}

export function labelEncodeOp(dataset) {
  const before = dataset;
  const after = cloneDataset(before);
  const process = [];
  const changes = [];
  const mappings = [];
  for (const col of columnProfile(before)) {
    if (col.type !== 'categorical') continue;
    const categories = [...new Set(columnValues(before, col.index).map(String))].sort((a, b) => a.localeCompare(b));
    if (categories.length === 0) continue;
    const mapping = Object.fromEntries(categories.map((c, i) => [c, i]));
    mappings.push({ column: col.name, pairs: categories.map((c) => [c, mapping[c]]) });
    process.push(`${col.name}: ${categories.map((c) => `${c} → ${mapping[c]}`).join(', ')}`);
    after.rows.forEach((r) => {
      const v = r.values[col.index];
      if (isMissing(v)) return;
      r.values[col.index] = mapping[String(v)];
      changes.push({ rowId: r.id, column: col.name, colIndex: col.index, before: v, after: mapping[String(v)] });
    });
  }
  return record('encoding', {
    title: OPERATION_INFO.encoding.title,
    summary: mappings.length ? `Encoded ${mappings.length} text column${mappings.length === 1 ? '' : 's'}.` : 'No text columns - nothing changed.',
    process: process.length ? process : ['All columns are already numeric.'],
    mappings,
    encodedColumns: mappings.map((m) => m.column),
    changes,
    before,
    after,
  });
}

/** method: 'minmax' | 'standard'. `exclude` lists column names that should not be scaled (e.g. label codes). */
export function scaleOp(dataset, method, { exclude = [] } = {}) {
  const before = dataset;
  const after = cloneDataset(before);
  const process = [];
  const changes = [];
  const targets = columnProfile(before).filter((c) => c.type === 'numeric' && !exclude.includes(c.name));
  for (const col of targets) {
    const values = columnValues(before, col.index);
    let transform;
    if (method === 'minmax') {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      if (range === 0) {
        process.push(`${col.name}: all values equal ${fmt(min)} (max − min = 0). To avoid dividing by zero, every value becomes 0.`);
        transform = () => 0;
      } else {
        process.push(`${col.name}: min = ${fmt(min, 3)}, max = ${fmt(max, 3)} → x' = (x − ${fmt(min, 3)}) / ${fmt(range, 3)}`);
        transform = (x) => (x - min) / range;
      }
    } else {
      const m = mean(values);
      const s = std(values);
      if (s === 0) {
        process.push(`${col.name}: standard deviation is 0 (all values identical). To avoid dividing by zero, every value becomes 0.`);
        transform = () => 0;
      } else {
        process.push(`${col.name}: mean = ${fmt(m, 3)}, std = ${fmt(s, 3)} → z = (x − ${fmt(m, 3)}) / ${fmt(s, 3)}`);
        transform = (x) => (x - m) / s;
      }
    }
    after.rows.forEach((r) => {
      const v = r.values[col.index];
      if (typeof v !== 'number') return;
      const nv = Number(transform(v).toFixed(4));
      r.values[col.index] = nv;
      if (nv !== v) changes.push({ rowId: r.id, column: col.name, colIndex: col.index, before: v, after: nv });
    });
  }
  if (exclude.length && targets.length) process.push(`Skipped label-encoded column(s): ${exclude.join(', ')} - their codes are categories, not measurements.`);
  return record(method, {
    title: OPERATION_INFO[method].title,
    summary: targets.length ? `Scaled ${targets.length} numeric column${targets.length === 1 ? '' : 's'}.` : 'No numeric columns to scale - nothing changed.',
    process: process.length ? process : ['No numeric columns found.'],
    changes,
    before,
    after,
  });
}

/* ---------------- Pipeline (all selected operations in order) ---------------- */

/**
 * options: { removeDuplicates, missingStrategy: 'none'|'mean'|'median'|'mode'|'drop',
 *            encodeCategorical, scaling: 'none'|'minmax'|'standard' }
 */
export function runPreprocessing(dataset, options) {
  if (!dataset || dataset.rows.length === 0) throw new UserError('The dataset is empty. Load a dataset first.');
  const profileBefore = columnProfile(dataset);
  const steps = [];
  let current = dataset;
  let encoded = [];
  const apply = (step) => {
    steps.push(step);
    current = step.after;
  };
  if (options.removeDuplicates) apply(removeDuplicatesOp(current));
  if (options.missingStrategy && options.missingStrategy !== 'none') apply(handleMissingOp(current, options.missingStrategy));
  if (options.encodeCategorical) {
    const step = labelEncodeOp(current);
    encoded = step.encodedColumns;
    apply(step);
  }
  if (options.scaling && options.scaling !== 'none') apply(scaleOp(current, options.scaling, { exclude: encoded }));
  if (steps.length === 0) throw new UserError('Choose at least one preprocessing step before running.');
  return { steps, result: current, profileBefore, profileAfter: columnProfile(current) };
}
