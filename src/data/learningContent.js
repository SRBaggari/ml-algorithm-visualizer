// Beginner-friendly lessons used by Learning Mode and the in-page learning panels.
// Every worked example uses small numbers that can be checked by hand.

export const LEARNING_TOPICS = [
  {
    id: 'preprocessing',
    title: 'Data Preprocessing',
    icon: 'filter',
    path: '/preprocessing',
    definition:
      'Preprocessing is cleaning and reshaping raw data so an algorithm can learn from it: removing repeated rows, filling gaps, turning text into numbers and putting features on comparable scales.',
    intuition:
      'Think of cooking: before you follow the recipe you wash, peel and chop the ingredients. A great recipe cannot fix rotten or uncut ingredients - a great algorithm cannot fix messy data.',
    how: [
      'Inspect the data: count rows and columns, detect numeric vs. text columns.',
      'Remove duplicate rows so no example is counted twice.',
      'Handle missing values by dropping rows or filling them with the mean, median or mode.',
      'Encode text categories as numbers (e.g. label encoding).',
      'Scale numeric features (Min-Max or standardization) so no feature dominates.',
    ],
    math: [
      { label: 'Mean imputation', formula: 'fill = (x₁ + x₂ + … + xₙ) / n' },
      { label: 'Min-Max scaling', formula: "x' = (x − min) / (max − min)   → range 0 … 1" },
      { label: 'Standardization (z-score)', formula: 'z = (x − mean) / std   → mean 0, std 1' },
    ],
    example: {
      intro: 'Ages: 20, 30, (missing), 40',
      steps: [
        'Mean of known ages = (20 + 30 + 40) / 3 = 30 → fill the gap with 30.',
        'Ages are now 20, 30, 30, 40. min = 20, max = 40.',
        'Min-Max: (20 − 20)/20 = 0, (30 − 20)/20 = 0.5, (40 − 20)/20 = 1.',
        'Result: 0, 0.5, 0.5, 1.',
      ],
    },
    advantages: ['Makes algorithms work at all (most cannot handle blanks or text).', 'Often improves results more than changing the algorithm.', 'Makes distance-based methods fair across features.'],
    limitations: ['Imputed values are guesses and can hide real patterns.', 'Label encoding implies an order between categories that may not exist.', 'Scaling parameters must come from the training data only, to avoid leakage.'],
    uses: ['Every real ML project', 'Data cleaning pipelines', 'Feature engineering'],
    keyTerms: [
      { term: 'Imputation', def: 'Filling missing values with an estimate such as the mean, median or mode.' },
      { term: 'Label encoding', def: 'Replacing each category with an integer code.' },
      { term: 'Normalization', def: 'Rescaling values to a fixed range such as 0-1 (Min-Max).' },
      { term: 'Standardization', def: 'Rescaling to mean 0 and standard deviation 1 (z-score).' },
    ],
  },
  {
    id: 'train-test-split',
    title: 'Train / Test Split',
    icon: 'split',
    path: '/train-test-split',
    definition:
      'Splitting divides the dataset into a training set, which the model learns from, and a test set, which stays hidden until the end to check how well the model handles new data.',
    intuition:
      'A teacher who puts the exact homework questions on the exam cannot tell who understood the topic and who memorised answers. New exam questions reveal real understanding - the test set plays that role.',
    how: [
      'Shuffle the rows randomly so the order of the file does not bias the split.',
      'Choose a ratio such as 80/20, 75/25 or 70/30.',
      'Put the first part in the training set and the rest in the test set.',
      'Train only on the training set; evaluate once on the test set.',
    ],
    math: [
      { label: 'Test size', formula: 'n_test = ceil(n × test_ratio)' },
      { label: 'Training size', formula: 'n_train = n − n_test' },
    ],
    example: {
      intro: '24 students, 80/20 split',
      steps: ['n_test = ceil(24 × 0.2) = ceil(4.8) = 5 students.', 'n_train = 24 − 5 = 19 students.', 'The model learns from 19 students and is graded on the 5 it never saw.'],
    },
    advantages: ['Simple and fast.', 'Gives an honest estimate of performance on new data.', 'Detects overfitting (great training score, poor test score).'],
    limitations: ['Results depend on which rows happen to land in each set.', 'Small datasets leave little data for testing.', 'Cross-validation gives a more stable estimate.'],
    uses: ['Model evaluation', 'Model selection', 'Detecting overfitting'],
    keyTerms: [
      { term: 'Training set', def: 'Data used to fit the model parameters.' },
      { term: 'Test set', def: 'Unseen data used only for the final evaluation.' },
      { term: 'Overfitting', def: 'Memorising training data so well that performance on new data drops.' },
      { term: 'Data leakage', def: 'Test information accidentally influencing training.' },
    ],
  },
  {
    id: 'linear-regression',
    title: 'Linear Regression',
    icon: 'trend',
    path: '/linear-regression',
    definition: 'Linear regression predicts a number by drawing the straight line ŷ = b₀ + b₁x that sits as close as possible to all the data points.',
    intuition:
      'Lay a ruler across a scatter of points and wiggle it until the vertical gaps between the points and the ruler are as small as possible overall. Least squares does this wiggling exactly, with a formula.',
    how: [
      'Compute the mean of x (x̄) and the mean of y (ȳ).',
      'Compute the slope from how x and y vary together.',
      'Compute the intercept so the line passes through (x̄, ȳ).',
      'Predict ŷ for every point.',
      'Measure the error: residual = y − ŷ, MSE = average squared residual.',
    ],
    math: [
      { label: 'Slope', formula: 'b₁ = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²' },
      { label: 'Intercept', formula: 'b₀ = ȳ − b₁·x̄' },
      { label: 'Mean Squared Error', formula: 'MSE = Σ(y − ŷ)² / n' },
      { label: 'R² score', formula: 'R² = 1 − Σ(y − ŷ)² / Σ(y − ȳ)²' },
    ],
    example: {
      intro: 'Points (1, 2), (2, 4), (3, 5)',
      steps: [
        'x̄ = 2, ȳ = 11/3 ≈ 3.667.',
        'Σ(x − x̄)(y − ȳ) = (−1)(−1.667) + 0 + (1)(1.333) = 3; Σ(x − x̄)² = 2.',
        'b₁ = 3 / 2 = 1.5; b₀ = 3.667 − 1.5 × 2 = 0.667.',
        'Line: ŷ = 0.667 + 1.5x. For x = 4 the prediction is 6.667.',
      ],
    },
    advantages: ['Very easy to understand and explain.', 'Fast to train, even on large data.', 'The slope shows the strength and direction of a relationship.'],
    limitations: ['Only captures straight-line relationships.', 'Sensitive to outliers (errors are squared).', 'Correlation is not causation.'],
    uses: ['Sales forecasting', 'Price estimation', 'Trend analysis in science and economics'],
    keyTerms: [
      { term: 'Slope (b₁)', def: 'Change in ŷ for each one-unit increase in x.' },
      { term: 'Intercept (b₀)', def: 'Predicted value when x = 0.' },
      { term: 'Residual', def: 'Actual minus predicted value for one point (y − ŷ).' },
      { term: 'MSE', def: 'Mean Squared Error - the average squared residual.' },
      { term: 'R²', def: 'Share of the variation in y explained by the model (1 is perfect).' },
    ],
  },
  {
    id: 'knn',
    title: 'K-Nearest Neighbors',
    icon: 'target',
    path: '/knn',
    definition: 'KNN classifies a new point by finding the K labelled points closest to it and taking a majority vote of their classes.',
    intuition: '“Tell me who your neighbors are and I will tell you who you are.” A new fruit that sits among apples on a size/colour chart is probably an apple.',
    how: [
      'Place the new (query) point among the labelled points.',
      'Compute the distance from the query to every labelled point.',
      'Sort the points from nearest to farthest.',
      'Keep the K nearest.',
      'Count votes per class and predict the most common one.',
    ],
    math: [
      { label: 'Euclidean distance', formula: 'd = √((x₁ − x₂)² + (y₁ − y₂)²)' },
      { label: 'Prediction', formula: 'ŷ = most common class among the K nearest neighbors' },
    ],
    example: {
      intro: 'Query (2, 2). Known: A(1, 1), A(2, 3), B(4, 4), B(5, 2). K = 3',
      steps: [
        'd to A(1,1) = √2 ≈ 1.41; to A(2,3) = 1; to B(4,4) = √8 ≈ 2.83; to B(5,2) = 3.',
        'Sorted: A(2,3) 1.00, A(1,1) 1.41, B(4,4) 2.83, B(5,2) 3.00.',
        'The 3 nearest are A, A, B → votes: A = 2, B = 1.',
        'Prediction: Class A.',
      ],
    },
    advantages: ['No training phase - just store the data.', 'Intuitive and works for many classes.', 'Can model complex, curved boundaries.'],
    limitations: ['Slow predictions on big datasets (distance to every point).', 'Needs feature scaling.', 'Choice of K matters: small K is noisy, large K blurs boundaries.'],
    uses: ['Recommendation systems', 'Handwriting recognition', 'Medical diagnosis prototypes'],
    keyTerms: [
      { term: 'K', def: 'Number of neighbors that vote.' },
      { term: 'Query point', def: 'The new, unlabelled point being classified.' },
      { term: 'Euclidean distance', def: 'Straight-line distance between two points.' },
      { term: 'Decision boundary', def: 'The border where the predicted class changes.' },
    ],
  },
  {
    id: 'decision-tree',
    title: 'Decision Tree',
    icon: 'tree',
    path: '/decision-tree',
    definition:
      'A decision tree predicts by asking a sequence of questions (Outlook? Humidity?) and following the branch that matches each answer until it reaches a leaf holding the prediction.',
    intuition:
      'It plays “20 Questions” with the data. A good first question splits the answers into groups that are as pure as possible - asking about the weather outlook tells you more about tennis than asking about temperature.',
    how: [
      'Measure how mixed the labels are with entropy.',
      'For each attribute, split the rows by its values and compute the weighted entropy of the parts.',
      'Information gain = parent entropy − weighted child entropy.',
      'Split on the attribute with the highest gain.',
      'Repeat on each branch until the rows are pure or no attributes remain.',
    ],
    math: [
      { label: 'Entropy', formula: 'H(S) = −Σ pᵢ · log₂(pᵢ)' },
      { label: 'Information gain', formula: 'Gain(S, A) = H(S) − Σᵥ (|Sᵥ| / |S|) · H(Sᵥ)' },
    ],
    example: {
      intro: 'Play Tennis: 9 Yes, 5 No (14 days)',
      steps: [
        'H(S) = −(9/14)·log₂(9/14) − (5/14)·log₂(5/14) ≈ 0.940.',
        'Outlook splits into Sunny (2 Yes/3 No, H 0.971), Overcast (4/0, H 0) and Rain (3/2, H 0.971).',
        'Weighted entropy = 5/14·0.971 + 4/14·0 + 5/14·0.971 ≈ 0.694.',
        'Gain(Outlook) = 0.940 − 0.694 ≈ 0.247 - the highest, so Outlook becomes the root.',
      ],
    },
    advantages: ['Easy to read as if-then rules.', 'Handles categorical data naturally.', 'Little preprocessing required.'],
    limitations: ['Can overfit when grown too deep.', 'Small data changes can produce a very different tree.', 'Greedy: the best split now is not always best overall.'],
    uses: ['Loan approval', 'Medical decision support', 'Customer churn analysis'],
    keyTerms: [
      { term: 'Root node', def: 'The first question, at the top of the tree.' },
      { term: 'Leaf', def: 'A final prediction.' },
      { term: 'Entropy', def: 'A measure of disorder: 0 when pure, 1 for a 50/50 two-class mix.' },
      { term: 'Information gain', def: 'How much a split reduces entropy.' },
      { term: 'ID3', def: 'A classic algorithm that builds trees using information gain.' },
    ],
  },
  {
    id: 'kmeans',
    title: 'K-Means Clustering',
    icon: 'cluster',
    path: '/kmeans',
    definition: 'K-Means finds K groups in unlabeled data. Each group has a center (centroid) and every point belongs to the nearest center.',
    intuition:
      'Drop K flags on a map of customers. Everyone walks to their nearest flag; then each flag moves to the middle of its crowd. Repeat until nobody switches flags.',
    how: [
      'Pick K starting centroids (e.g. random data points).',
      'Compute the distance from every point to every centroid.',
      'Assign each point to its nearest centroid.',
      'Move each centroid to the mean of its assigned points.',
      'Repeat until no point changes cluster (convergence).',
    ],
    math: [
      { label: 'Assignment', formula: 'cluster(p) = argminₖ ‖p − cₖ‖' },
      { label: 'Update', formula: 'cₖ = mean of the points assigned to cluster k' },
      { label: 'Inertia (objective)', formula: 'SSE = Σ ‖p − c_cluster(p)‖²' },
    ],
    example: {
      intro: 'Points 1, 2, 9, 10 on a line, K = 2, start centroids 1 and 2',
      steps: [
        'Assign: 1 → c₁(1); 2, 9, 10 → c₂(2) (nearest).',
        'Update: c₁ = 1; c₂ = (2 + 9 + 10)/3 = 7.',
        'Assign again: 1, 2 → c₁; 9, 10 → c₂. Update: c₁ = 1.5, c₂ = 9.5.',
        'Assign again: nothing changes → converged with clusters {1, 2} and {9, 10}.',
      ],
    },
    advantages: ['Simple and fast, scales to large datasets.', 'Easy-to-interpret centroids.', 'Always converges.'],
    limitations: ['You must choose K in advance.', 'Results depend on the starting centroids.', 'Assumes round, similar-sized clusters; sensitive to outliers and scale.'],
    uses: ['Customer segmentation', 'Image colour compression', 'Grouping similar documents'],
    keyTerms: [
      { term: 'Centroid', def: 'The mean position of the points in a cluster.' },
      { term: 'Cluster', def: 'A group of points assigned to the same centroid.' },
      { term: 'Inertia', def: 'Sum of squared distances from points to their centroid; lower is tighter.' },
      { term: 'Convergence', def: 'When assignments stop changing between iterations.' },
    ],
  },
  {
    id: 'evaluation',
    title: 'Model Evaluation',
    icon: 'gauge',
    path: '/evaluation',
    definition: 'Evaluation measures how good a classifier is by comparing its predictions with the true labels, usually summarised in a confusion matrix.',
    intuition:
      'A smoke alarm can fail in two ways: beeping at toast (false alarm) or staying silent in a fire (miss). Different metrics count different kinds of mistakes, and which one matters depends on the cost.',
    how: [
      'Predict on the test set.',
      'Count TP, TN, FP and FN in the confusion matrix.',
      'Accuracy: share of all predictions that were right.',
      'Precision: share of positive predictions that were right. Recall: share of actual positives that were found.',
      'F1 combines precision and recall.',
    ],
    math: [
      { label: 'Accuracy', formula: '(TP + TN) / (TP + TN + FP + FN)' },
      { label: 'Precision', formula: 'TP / (TP + FP)' },
      { label: 'Recall', formula: 'TP / (TP + FN)' },
      { label: 'F1 score', formula: '2 · Precision · Recall / (Precision + Recall)' },
    ],
    example: {
      intro: 'TP = 40, FN = 10, FP = 5, TN = 45',
      steps: ['Accuracy = (40 + 45) / 100 = 85%.', 'Precision = 40 / 45 ≈ 88.9%.', 'Recall = 40 / 50 = 80%.', 'F1 = 2·0.889·0.8 / (0.889 + 0.8) ≈ 84.2%.'],
    },
    advantages: ['Shows which kinds of mistakes a model makes.', 'Metrics can match the real cost of errors.', 'Threshold tuning trades precision for recall.'],
    limitations: ['Accuracy is misleading on imbalanced data.', 'A single number hides detail.', 'Metrics depend on the chosen threshold.'],
    uses: ['Comparing models', 'Choosing thresholds', 'Reporting results'],
    keyTerms: [
      { term: 'True positive (TP)', def: 'Predicted positive and actually positive.' },
      { term: 'False positive (FP)', def: 'Predicted positive but actually negative.' },
      { term: 'False negative (FN)', def: 'Predicted negative but actually positive.' },
      { term: 'Threshold', def: 'Score above which a sample is labelled positive.' },
    ],
  },
];

export function getTopic(id) {
  return LEARNING_TOPICS.find((t) => t.id === id);
}
