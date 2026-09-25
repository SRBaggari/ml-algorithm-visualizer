import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, toCSV } from '../src/utils/csvParser.js';
import {
  columnProfile,
  findDuplicates,
  handleMissingOp,
  labelEncodeOp,
  makeDataset,
  mean,
  median,
  mode,
  removeDuplicatesOp,
  runPreprocessing,
  scaleOp,
  std,
} from '../src/utils/preprocessing.js';
import { UserError } from '../src/utils/errors.js';
import { RAW_STUDENT_CSV } from '../src/data/datasets.js';
import { close } from './helpers.js';

function students() {
  const p = parseCSV(RAW_STUDENT_CSV);
  return makeDataset(p.headers, p.rows);
}

test('statistics helpers', () => {
  close(mean([1, 2, 3, 4]), 2.5);
  close(median([5, 1, 3]), 3);
  close(median([4, 1, 3, 2]), 2.5); // even count → average of the two middle values
  assert.equal(mode(['b', 'a', 'b', 'a']), 'b'); // tie → first seen
  close(std([2, 4, 4, 4, 5, 5, 7, 9]), 2); // population std
  assert.equal(mean([]), null);
  assert.equal(median([]), null);
});

test('column profile detects types, missing values and duplicates', () => {
  const ds = students();
  const profile = columnProfile(ds);
  const byName = Object.fromEntries(profile.map((c) => [c.name, c]));
  assert.equal(byName.Age.type, 'numeric');
  assert.equal(byName.Gender.type, 'categorical');
  assert.equal(byName.Age.missing, 1);
  assert.equal(byName.Score.missing, 2);
  assert.equal(profile.reduce((a, c) => a + c.missing, 0), 6);
  assert.deepEqual(findDuplicates(ds).map((d) => [d.id, d.duplicateOf]), [[7, 2], [13, 1]]);
});

test('each operation records before, process, after and exactly what changed', () => {
  const ds = students();
  const dup = removeDuplicatesOp(ds);
  assert.equal(dup.before, ds);
  assert.equal(dup.after.rows.length, 12);
  assert.ok(dup.changed);
  assert.equal(removeDuplicatesOp(dup.after).changed, false);

  const filled = handleMissingOp(dup.after, 'median');
  const ageIdx = ds.headers.indexOf('Age');
  const known = dup.after.rows.map((r) => r.values[ageIdx]).filter((v) => v !== null);
  const change = filled.changes.find((c) => c.colIndex === ageIdx);
  close(change.after, median(known));
  assert.equal(change.before, null);
  assert.ok(filled.process.some((p) => p.startsWith('City') && p.includes('mode')));
  assert.ok(filled.after.rows.every((r) => r.values.every((v) => v !== null)));

  const enc = labelEncodeOp(filled.after);
  assert.deepEqual(enc.encodedColumns, ['Gender', 'City', 'Passed']);
  assert.deepEqual(enc.mappings.find((m) => m.column === 'City').pairs, [['Chennai', 0], ['Delhi', 1], ['Mumbai', 2]]);

  const minmax = scaleOp(enc.after, 'minmax', { exclude: enc.encodedColumns });
  const scores = minmax.after.rows.map((r) => r.values[ds.headers.indexOf('Score')]);
  close(Math.min(...scores), 0);
  close(Math.max(...scores), 1);
  const cityIdx = ds.headers.indexOf('City');
  assert.ok(minmax.after.rows.every((r) => [0, 1, 2].includes(r.values[cityIdx])), 'label codes are not scaled');

  const z = scaleOp(enc.after, 'standard', { exclude: enc.encodedColumns });
  const zs = z.after.rows.map((r) => r.values[ds.headers.indexOf('Score')]);
  close(mean(zs), 0, 1e-3);
  close(std(zs), 1, 1e-3);
});

test('drop strategy removes incomplete rows but never every row', () => {
  const ds = students();
  const dropped = handleMissingOp(ds, 'drop');
  assert.ok(dropped.after.rows.every((r) => r.values.every((v) => v !== null)));
  assert.equal(dropped.removedRowIds.length, 5);
  const allMissing = makeDataset(['a', 'b'], [[1, null], [null, 2]]);
  assert.throws(() => handleMissingOp(allMissing, 'drop'), UserError);
});

test('constant columns are scaled to 0 instead of dividing by zero', () => {
  const ds = makeDataset(['a'], [[5], [5], [5]]);
  assert.ok(scaleOp(ds, 'minmax').after.rows.every((r) => r.values[0] === 0));
  assert.ok(scaleOp(ds, 'standard').after.rows.every((r) => r.values[0] === 0));
  assert.match(scaleOp(ds, 'minmax').process[0], /dividing by zero/);
});

test('a column that is entirely missing is left unchanged with a note', () => {
  const ds = makeDataset(['a', 'b'], [[1, null], [2, null]]);
  const out = handleMissingOp(ds, 'mean');
  assert.equal(out.changes.length, 0);
  assert.match(out.process[0], /every value is missing/);
});

test('pipeline runs selected steps and validates input', () => {
  const out = runPreprocessing(students(), { removeDuplicates: true, missingStrategy: 'mean', encodeCategorical: true, scaling: 'minmax' });
  assert.equal(out.steps.length, 4);
  assert.equal(out.result.rows.length, 12);
  assert.ok(out.result.rows.every((r) => r.values.every((v) => typeof v === 'number' && Number.isFinite(v))));
  assert.throws(() => runPreprocessing(students(), {}), /at least one/);
  assert.throws(() => runPreprocessing(makeDataset(['a'], []), { removeDuplicates: true }), /empty/);
  // processed data round-trips through CSV
  assert.equal(parseCSV(toCSV(out.result.headers, out.result.rows.map((r) => r.values))).rows.length, 12);
});
