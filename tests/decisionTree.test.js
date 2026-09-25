import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionTree, classifySample, entropy, entropyFormula, informationGain, layoutTree } from '../src/algorithms/decisionTree.js';
import { UserError } from '../src/utils/errors.js';
import { TREE_DATASETS } from '../src/data/datasets.js';
import { close } from './helpers.js';

function tennisRows() {
  const { columns, rows } = TREE_DATASETS.tennis;
  return rows.map((r, i) => ({ __id: i + 1, ...Object.fromEntries(columns.map((c, j) => [c, r[j]])) }));
}

test('entropy of pure, 50/50, 9/5 and three-way sets', () => {
  assert.equal(entropy([]), 0);
  assert.equal(entropy(['Yes', 'Yes', 'Yes']), 0);
  close(entropy(['Yes', 'No']), 1);
  close(entropy(['a', 'b', 'c']), Math.log2(3));
  // Play Tennis: 9 Yes / 5 No
  close(entropy([...Array(9).fill('Yes'), ...Array(5).fill('No')]), 0.9403);
  assert.equal(entropyFormula({ Yes: 9, No: 5 }), '−(9/14)·log₂(9/14) − (5/14)·log₂(5/14)');
});

test('information gain matches the textbook Play Tennis values', () => {
  const rows = tennisRows();
  close(informationGain(rows, 'Outlook', 'Play').gain, 0.2467);
  close(informationGain(rows, 'Humidity', 'Play').gain, 0.1518);
  close(informationGain(rows, 'Wind', 'Play').gain, 0.0481);
  close(informationGain(rows, 'Temperature', 'Play').gain, 0.0292);
  const outlook = informationGain(rows, 'Outlook', 'Play');
  close(outlook.weightedEntropy, 0.6935);
  assert.deepEqual(outlook.branches.map((b) => [b.value, b.count]), [['Sunny', 5], ['Overcast', 4], ['Rain', 5]]);
});

test('an attribute with a single value has zero gain', () => {
  const rows = [
    { a: 'x', y: 'Yes' },
    { a: 'x', y: 'No' },
  ];
  assert.equal(informationGain(rows, 'a', 'y').gain, 0);
});

test('ID3 builds the classic tree and classifies samples', () => {
  const tree = buildDecisionTree(tennisRows(), ['Outlook', 'Temperature', 'Humidity', 'Wind'], 'Play');
  assert.equal(tree.root.attribute, 'Outlook');
  const byValue = (n, v) => n.children.find((c) => c.branchValue === v);
  assert.equal(byValue(tree.root, 'Sunny').attribute, 'Humidity');
  assert.equal(byValue(tree.root, 'Overcast').prediction, 'Yes');
  assert.equal(byValue(tree.root, 'Rain').attribute, 'Wind');
  assert.equal(Object.values(tree.nodes).filter((n) => n.type === 'leaf').length, 5);
  assert.equal(tree.trace.at(-1).type, 'done');

  const s1 = classifySample(tree, { Outlook: 'Sunny', Temperature: 'Cool', Humidity: 'High', Wind: 'Strong' });
  assert.equal(s1.prediction, 'No');
  assert.equal(s1.path.length, 3);
  assert.equal(classifySample(tree, { Outlook: 'Rain', Temperature: 'Mild', Humidity: 'High', Wind: 'Weak' }).prediction, 'Yes');

  const { leaves, depth } = layoutTree(tree.root);
  assert.equal(leaves, 5);
  assert.equal(depth, 2);
});

test('unseen attribute values fall back to the majority class', () => {
  const tree = buildDecisionTree(tennisRows(), ['Outlook', 'Temperature', 'Humidity', 'Wind'], 'Play');
  const r = classifySample(tree, { Outlook: 'Foggy', Temperature: 'Hot', Humidity: 'High', Wind: 'Weak' });
  assert.equal(r.prediction, 'Yes');
  assert.match(r.note, /never saw Outlook = "Foggy"/);
});

test('XOR-style data has no informative split, so the root is a leaf', () => {
  const rows = [
    { __id: 1, a: 'p', b: 'x', y: 'Yes' },
    { __id: 2, a: 'p', b: 'z', y: 'No' },
    { __id: 3, a: 'q', b: 'x', y: 'No' },
    { __id: 4, a: 'q', b: 'z', y: 'Yes' },
  ];
  const tree = buildDecisionTree(rows, ['a', 'b'], 'y');
  assert.equal(tree.root.type, 'leaf');
  assert.equal(tree.root.leafReason, 'no-gain');
});

test('invalid input gives friendly errors', () => {
  assert.throws(() => buildDecisionTree([], ['a'], 'y'), (e) => e instanceof UserError && /empty/.test(e.message));
  assert.throws(() => buildDecisionTree([{ a: 'x', y: 'Yes' }], [], 'y'), /At least one attribute/);
  assert.throws(() => buildDecisionTree([{ a: 'x', y: 'Yes' }], ['a'], ''), /target/);
  assert.throws(() => buildDecisionTree([{ a: 'x', y: null }], ['a'], 'y'), /no value for the target/);
});
