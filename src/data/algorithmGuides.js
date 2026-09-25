// Page intros ("what problem does it solve?") and key takeaways for each algorithm page.

export const GUIDES = {
  'linear-regression': {
    summary: 'Linear regression draws the straight line that best fits a set of points, then uses that line to predict a number.',
    problem: 'Predicting a continuous value from an input - for example, the exam score of a student who studies 6 hours.',
    start: 'Start with the sample dataset: press “Train Model”, then use Next Step to follow each calculation.',
    takeaways: [
      'The best-fit line always passes through the mean point (x̄, ȳ).',
      'The slope tells you how much the prediction changes when x increases by one unit.',
      'Least squares minimises the sum of squared residuals, so large errors (and outliers) have a big influence.',
      'R² close to 1 means the line explains most of the variation in y - but it does not prove that x causes y.',
    ],
  },
  knn: {
    summary: 'K-Nearest Neighbors classifies a new point by looking at the K labelled points closest to it and taking a majority vote.',
    problem: 'Assigning a category to a new example when you have labelled examples - for example, deciding which class a new data point belongs to.',
    start: 'Press “Classify” with the sample data, then drag the ★ query point or change K and watch the vote change.',
    takeaways: [
      'KNN has no training phase: it stores the data and does all the work at prediction time.',
      'Only the K closest points vote; everything else is ignored.',
      'Small K follows local detail (and noise); large K gives smoother, more general boundaries.',
      'Distances depend on the scale of each feature, so features should be scaled to comparable ranges.',
    ],
  },
  'decision-tree': {
    summary: 'A decision tree learns a sequence of questions. ID3 chooses each question by measuring which attribute reduces uncertainty (entropy) the most.',
    problem: 'Making a classification with human-readable rules - for example, deciding whether the weather is good for playing tennis.',
    start: 'Press “Build Decision Tree”, step through the entropy and gain calculations, then classify a sample.',
    takeaways: [
      'Entropy measures how mixed the labels are: 0 is pure, 1 is a 50/50 mix of two classes.',
      'Information gain is the drop in entropy after a split; ID3 always picks the highest gain.',
      'A branch stops when its rows are pure or no attributes are left, creating a leaf.',
      'Every root-to-leaf path is an if-then rule, which makes trees easy to explain.',
    ],
  },
  kmeans: {
    summary: 'K-Means groups unlabeled points into K clusters by repeatedly assigning points to the nearest centroid and moving each centroid to the mean of its points.',
    problem: 'Discovering natural groups when there are no labels - for example, segmenting customers by income and spending.',
    start: 'Press “Step” to move one stage at a time, or “Run” to animate until the clusters stop changing.',
    takeaways: [
      'K-Means is unsupervised: it finds groups without being told the answers.',
      'Each iteration has two moves - assign points, then update centroids - and the inertia never increases.',
      'It stops (converges) when no point changes cluster.',
      'Different starting centroids can give different results; K-Means++ spreads the starting points out.',
    ],
  },
};
