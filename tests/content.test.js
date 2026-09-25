import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTION_TYPES, QUIZ_QUESTIONS } from '../src/data/quizQuestions.js';
import { LEARNING_TOPICS } from '../src/data/learningContent.js';
import { ALGORITHMS, TOPIC_IDS } from '../src/data/algorithms.js';
import { FORMULAS } from '../src/data/formulas.js';
import { GUIDES } from '../src/data/algorithmGuides.js';
import { friendlyError, UserError } from '../src/utils/errors.js';
import { buildReport, reportToText, slugify } from '../src/utils/report.js';
import { fitLinearRegression } from '../src/algorithms/linearRegression.js';
import { linearRegressionStep } from '../src/data/stepExplanations.js';

test('quiz: at least 30 unique, well-formed questions of every type', () => {
  assert.ok(QUIZ_QUESTIONS.length >= 30);
  assert.equal(new Set(QUIZ_QUESTIONS.map((q) => q.question)).size, QUIZ_QUESTIONS.length, 'duplicate question');
  for (const q of QUIZ_QUESTIONS) {
    assert.ok(QUESTION_TYPES[q.type], `type for: ${q.question}`);
    assert.ok(q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, q.question);
    assert.equal(new Set(q.options).size, q.options.length, `duplicate option in: ${q.question}`);
    assert.ok(q.explanation && q.explanation.length > 20, `explanation for: ${q.question}`);
  }
  for (const type of Object.keys(QUESTION_TYPES)) assert.ok(QUIZ_QUESTIONS.filter((q) => q.type === type).length >= 5, `enough ${type} questions`);
});

test('lessons, formulas and page guides are complete', () => {
  assert.deepEqual(LEARNING_TOPICS.map((t) => t.id).sort(), [...TOPIC_IDS].sort());
  for (const t of LEARNING_TOPICS) {
    for (const key of ['definition', 'intuition', 'how', 'math', 'example', 'advantages', 'limitations', 'uses', 'keyTerms']) assert.ok(t[key], `${t.id}.${key}`);
  }
  for (const group of ['linear-regression', 'knn', 'decision-tree', 'kmeans', 'evaluation']) {
    assert.ok(FORMULAS[group].length >= 2, group);
    for (const f of FORMULAS[group]) assert.ok(f.formula && f.explanation, `${group}.${f.id}`);
  }
  for (const a of ALGORITHMS) {
    assert.ok(GUIDES[a.id]?.problem && GUIDES[a.id].takeaways.length >= 3, a.id);
    for (const key of ['type', 'supervision', 'mainIdea', 'input', 'output', 'use', 'keyParameter']) assert.ok(a[key], `${a.id}.${key}`);
  }
});

test('step explanations use the real calculated values', () => {
  const model = fitLinearRegression([{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }]);
  const slopeStep = linearRegressionStep(model, 1);
  assert.match(slopeStep.meaning, /b₁ = 1\.5/);
  for (let i = 0; i < 6; i++) {
    const e = linearRegressionStep(model, i);
    assert.ok(e.what && e.why && e.how && e.meaning, `step ${i}`);
  }
  // Negative intercepts are written as "− 2", never "+ -2".
  const neg = fitLinearRegression([{ x: 1, y: 0 }, { x: 2, y: 2 }]);
  assert.ok(!linearRegressionStep(neg, 5).how.includes('+ -'));
});

test('friendly errors never expose unexpected JavaScript errors', () => {
  assert.equal(friendlyError(new UserError('Please upload a CSV.')), 'Please upload a CSV.');
  assert.doesNotMatch(friendlyError(new TypeError("Cannot read properties of undefined (reading 'x')")), /undefined|TypeError/);
  assert.equal(friendlyError(new Error('boom'), 'Fallback'), 'Fallback');
});

test('reports serialise to JSON and text', () => {
  const r = buildReport({ algorithm: 'K-Nearest Neighbors', dataset: 'demo', parameters: { k: 5 }, results: { prediction: 'A' }, metrics: { votes: 3 } });
  assert.equal(r.app, 'ML Algorithm Visualizer');
  assert.ok(!Number.isNaN(Date.parse(r.generatedAt)));
  assert.match(reportToText(r), /Algorithm: K-Nearest Neighbors/);
  assert.match(reportToText(r), /- k: 5/);
  assert.equal(slugify('Decision Tree (ID3)'), 'decision-tree-id3');
});
