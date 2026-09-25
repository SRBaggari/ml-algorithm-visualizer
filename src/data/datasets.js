// Built-in datasets so every page works immediately (and offline).
// Randomised datasets use a fixed seed so they look the same on every visit.
import { createRng, gaussian, round } from '../utils/random.js';

/* ---------------- Linear regression ---------------- */

export const REGRESSION_DATASETS = {
  study: {
    id: 'study',
    name: 'Hours Studied vs Exam Score',
    xLabel: 'Hours studied',
    yLabel: 'Exam score',
    points: [
      [1, 52], [1.5, 55], [2, 58], [2.5, 57], [3, 64], [3.5, 66],
      [4, 70], [4.5, 69], [5, 76], [6, 80], [7, 85], [8, 90],
    ].map(([x, y]) => ({ x, y })),
  },
  salary: {
    id: 'salary',
    name: 'Experience vs Salary',
    xLabel: 'Years of experience',
    yLabel: 'Salary (k$)',
    points: [
      [1, 39], [1.5, 42], [2, 45], [3, 52], [3.5, 55], [4, 58],
      [5, 63], [6, 70], [7, 74], [8, 82], [9, 86], [10, 92],
    ].map(([x, y]) => ({ x, y })),
  },
  advertising: {
    id: 'advertising',
    name: 'Advertising vs Sales',
    xLabel: 'Advertising spend (k$)',
    yLabel: 'Sales (k units)',
    points: [
      [5, 12], [8, 14], [10, 17], [12, 16], [15, 21], [18, 22],
      [20, 25], [22, 24], [25, 29], [28, 31], [30, 33], [35, 36],
    ].map(([x, y]) => ({ x, y })),
  },
};

export function randomRegressionPoints(seed, n = 14) {
  const rng = createRng(seed);
  const slope = 0.6 + rng() * 2.4;
  const intercept = 5 + rng() * 25;
  const noise = 2 + rng() * 6;
  return Array.from({ length: n }, () => {
    const x = round(1 + rng() * 19, 1);
    return { x, y: round(intercept + slope * x + gaussian(rng, 0, noise), 1) };
  });
}

/* ---------------- KNN ---------------- */

function blobs(seed, specs, digits = 1, clamp = null) {
  const rng = createRng(seed);
  const out = [];
  for (const s of specs) {
    for (let i = 0; i < s.n; i++) {
      let x = gaussian(rng, s.x, s.sx);
      let y = gaussian(rng, s.y, s.sy);
      if (clamp) {
        x = Math.min(clamp.x[1], Math.max(clamp.x[0], x));
        y = Math.min(clamp.y[1], Math.max(clamp.y[0], y));
      }
      out.push({ x: round(x, digits), y: round(y, digits), label: s.label });
    }
  }
  return out;
}

export const KNN_DATASETS = {
  simple: {
    id: 'simple',
    name: 'Two classes (A / B)',
    xLabel: 'Feature 1',
    yLabel: 'Feature 2',
    xDomain: [0, 10],
    yDomain: [0, 10],
    classes: ['Class A', 'Class B'],
    query: { x: 5, y: 5 },
    points: blobs(7, [
      { label: 'Class A', n: 11, x: 3.3, y: 3.6, sx: 1.3, sy: 1.3 },
      { label: 'Class B', n: 11, x: 6.8, y: 6.6, sx: 1.3, sy: 1.2 },
    ], 1, { x: [0.3, 9.7], y: [0.3, 9.7] }),
  },
  iris: {
    id: 'iris',
    name: 'Iris-style flowers (3 classes)',
    xLabel: 'Petal length (cm)',
    yLabel: 'Petal width (cm)',
    xDomain: [0, 7.5],
    yDomain: [0, 3],
    classes: ['Setosa', 'Versicolor', 'Virginica'],
    query: { x: 4.9, y: 1.6 },
    points: blobs(11, [
      { label: 'Setosa', n: 10, x: 1.45, y: 0.25, sx: 0.18, sy: 0.08 },
      { label: 'Versicolor', n: 10, x: 4.3, y: 1.3, sx: 0.45, sy: 0.18 },
      { label: 'Virginica', n: 10, x: 5.6, y: 2.0, sx: 0.5, sy: 0.25 },
    ], 1, { x: [0.2, 7.3], y: [0.1, 2.9] }),
  },
};

/* ---------------- Decision tree ---------------- */

export const TREE_DATASETS = {
  tennis: {
    id: 'tennis',
    name: 'Play Tennis',
    target: 'Play',
    columns: ['Outlook', 'Temperature', 'Humidity', 'Wind', 'Play'],
    rows: [
      ['Sunny', 'Hot', 'High', 'Weak', 'No'],
      ['Sunny', 'Hot', 'High', 'Strong', 'No'],
      ['Overcast', 'Hot', 'High', 'Weak', 'Yes'],
      ['Rain', 'Mild', 'High', 'Weak', 'Yes'],
      ['Rain', 'Cool', 'Normal', 'Weak', 'Yes'],
      ['Rain', 'Cool', 'Normal', 'Strong', 'No'],
      ['Overcast', 'Cool', 'Normal', 'Strong', 'Yes'],
      ['Sunny', 'Mild', 'High', 'Weak', 'No'],
      ['Sunny', 'Cool', 'Normal', 'Weak', 'Yes'],
      ['Rain', 'Mild', 'Normal', 'Weak', 'Yes'],
      ['Sunny', 'Mild', 'Normal', 'Strong', 'Yes'],
      ['Overcast', 'Mild', 'High', 'Strong', 'Yes'],
      ['Overcast', 'Hot', 'Normal', 'Weak', 'Yes'],
      ['Rain', 'Mild', 'High', 'Strong', 'No'],
    ],
  },
  loan: {
    id: 'loan',
    name: 'Loan Approval',
    target: 'Approved',
    columns: ['Income', 'Credit', 'Employed', 'Approved'],
    rows: [
      ['High', 'Good', 'Yes', 'Yes'],
      ['High', 'Bad', 'Yes', 'Yes'],
      ['High', 'Bad', 'No', 'No'],
      ['Medium', 'Good', 'Yes', 'Yes'],
      ['Medium', 'Good', 'No', 'Yes'],
      ['Medium', 'Bad', 'Yes', 'No'],
      ['Medium', 'Bad', 'No', 'No'],
      ['Low', 'Good', 'Yes', 'Yes'],
      ['Low', 'Good', 'No', 'No'],
      ['Low', 'Bad', 'Yes', 'No'],
      ['Low', 'Bad', 'No', 'No'],
      ['High', 'Good', 'No', 'Yes'],
    ],
  },
};

/* ---------------- K-Means ---------------- */

export const CLUSTER_DATASETS = {
  customers: {
    id: 'customers',
    name: 'Customer segments',
    xLabel: 'Annual income (k$)',
    yLabel: 'Spending score (1-100)',
    xDomain: [0, 140],
    yDomain: [0, 100],
    points: blobs(21, [
      { label: '', n: 9, x: 28, y: 22, sx: 7, sy: 7 },
      { label: '', n: 9, x: 28, y: 78, sx: 7, sy: 7 },
      { label: '', n: 11, x: 62, y: 50, sx: 8, sy: 7 },
      { label: '', n: 9, x: 100, y: 20, sx: 8, sy: 7 },
      { label: '', n: 9, x: 100, y: 82, sx: 8, sy: 6 },
    ], 0, { x: [5, 135], y: [2, 98] }).map(({ x, y }) => ({ x, y })),
  },
};

export function randomClusterPoints(seed, n = 40) {
  const rng = createRng(seed);
  const centers = Math.floor(2 + rng() * 4);
  const specs = Array.from({ length: centers }, () => ({
    label: '',
    n: Math.ceil(n / centers),
    x: 15 + rng() * 110,
    y: 12 + rng() * 76,
    sx: 5 + rng() * 8,
    sy: 5 + rng() * 8,
  }));
  return blobs(seed + 1, specs, 0, { x: [3, 137], y: [2, 98] }).map(({ x, y }) => ({ x, y }));
}

/* ---------------- Train / test split ---------------- */

export const STUDENTS = (() => {
  const rng = createRng(5);
  return Array.from({ length: 24 }, (_, i) => {
    const hours = round(1 + rng() * 9, 1);
    const attendance = Math.round(55 + rng() * 45);
    const score = Math.max(20, Math.min(99, Math.round(18 + hours * 5.2 + (attendance - 55) * 0.45 + gaussian(rng, 0, 7))));
    return { id: `S${String(i + 1).padStart(2, '0')}`, hours, attendance, score, result: score >= 50 ? 'Pass' : 'Fail' };
  });
})();

/* ---------------- Preprocessing ---------------- */

export const RAW_STUDENT_CSV = `Age,Gender,City,StudyHours,Score,Passed
20,Male,Delhi,5,78,Yes
22,Female,Mumbai,3,65,Yes
,Female,Delhi,4,70,Yes
25,Male,Chennai,,55,No
21,Female,,6,88,Yes
23,Male,Mumbai,2,45,No
22,Female,Mumbai,3,65,Yes
24,,Delhi,5,,Yes
19,Male,Chennai,1,38,No
20,Female,Delhi,7,92,Yes
26,Male,Mumbai,4,,No
23,Female,Chennai,5,74,Yes
20,Male,Delhi,5,78,Yes
21,Male,Delhi,3,60,Yes`;

export const RAW_SALARY_CSV = `Experience,Education,Department,Salary
1,Bachelors,Sales,39000
3,Masters,Engineering,61000
5,Bachelors,,63000
,PhD,Engineering,98000
2,Bachelors,Sales,45000
8,Masters,Engineering,
3,Masters,Engineering,61000
10,PhD,Research,120000
4,,Sales,52000
6,Bachelors,Research,70000`;

/* ---------------- Model evaluation ---------------- */

// A spam filter's output: actual label (1 = spam) and the model's spam probability.
export const EVALUATION_SAMPLES = (() => {
  const rng = createRng(17);
  const clamp = (v) => Math.min(0.99, Math.max(0.01, v));
  const samples = [];
  for (let i = 0; i < 18; i++) samples.push({ actual: 1, score: round(clamp(gaussian(rng, 0.7, 0.17)), 2) });
  for (let i = 0; i < 22; i++) samples.push({ actual: 0, score: round(clamp(gaussian(rng, 0.32, 0.17)), 2) });
  return samples.map((s, i) => ({ ...s, id: `E${String(i + 1).padStart(2, '0')}` }));
})();
