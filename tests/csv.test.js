import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertValue, numericColumnIndices, parseCSV, toCSV } from '../src/utils/csvParser.js';
import { UserError } from '../src/utils/errors.js';

test('parses headers, numbers, text and missing tokens', () => {
  const p = parseCSV('a,b,c\n1,hello,NA\n2.5,,?\n1e3,x,null');
  assert.deepEqual(p.headers, ['a', 'b', 'c']);
  assert.deepEqual(p.rows, [
    [1, 'hello', null],
    [2.5, null, null],
    [1000, 'x', null],
  ]);
  assert.equal(p.warnings.length, 0);
});

test('quoted fields: commas, escaped quotes and newlines', () => {
  const p = parseCSV('name,note\n"Smith, J","said ""hi"""\n"multi\nline",ok');
  assert.equal(p.rows[0][0], 'Smith, J');
  assert.equal(p.rows[0][1], 'said "hi"');
  assert.equal(p.rows[1][0], 'multi\nline');
});

test('semicolon and tab delimiters, CRLF line endings and a BOM', () => {
  assert.deepEqual(parseCSV('a;b\r\n1;2\r\n').rows, [[1, 2]]);
  assert.deepEqual(parseCSV('a\tb\n3\t4').rows, [[3, 4]]);
  assert.deepEqual(parseCSV('﻿x,y\n5,6').headers, ['x', 'y']);
});

test('warns about ragged rows and duplicate headers', () => {
  const p = parseCSV('a,a,b\n1,2\n3,4,5,6');
  assert.deepEqual(p.headers, ['a', 'a_2', 'b']);
  assert.deepEqual(p.rows[0], [1, 2, null]);
  assert.ok(p.warnings.some((w) => /different number of values/.test(w)));
  assert.ok(p.warnings.some((w) => /renamed/.test(w)));
});

test('invalid files give friendly errors', () => {
  assert.throws(() => parseCSV(''), (e) => e instanceof UserError && /empty/.test(e.message));
  assert.throws(() => parseCSV('   \n  '), /empty/);
  assert.throws(() => parseCSV('only,header'), /at least one data row/);
  assert.throws(() => parseCSV('a,b\n"unclosed,1'), /unclosed quote/);
  assert.throws(() => parseCSV('a,b\n1,\u00002'), /binary/);
});

test('value conversion and numeric column detection', () => {
  assert.equal(convertValue(' 42 '), 42);
  assert.equal(convertValue('-3.5'), -3.5);
  assert.equal(convertValue('12abc'), '12abc');
  assert.equal(convertValue('N/A'), null);
  assert.equal(convertValue(Infinity), null);
  assert.deepEqual(numericColumnIndices(['a', 'b', 'c'], [[1, 'x', null], [2, 'y', 3]]), [0, 2]);
});

test('CSV export escapes special characters and round-trips', () => {
  const headers = ['name', 'value'];
  const rows = [['a, b', 1], ['say "x"', null]];
  const csv = toCSV(headers, rows);
  assert.equal(csv, 'name,value\n"a, b",1\n"say ""x""",');
  assert.deepEqual(parseCSV(csv).rows, [['a, b', 1], ['say "x"', null]]);
});
