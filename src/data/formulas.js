// Formulas shown in the FormulaPanel, each with a plain-language explanation.

export const FORMULAS = {
  'linear-regression': [
    { id: 'slope', name: 'Slope', formula: 'b₁ = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²', explanation: 'How much ŷ changes when x grows by 1. The top measures how x and y move together; the bottom measures how spread out x is.' },
    { id: 'intercept', name: 'Intercept', formula: 'b₀ = ȳ − b₁ · x̄', explanation: 'Where the line crosses x = 0. It is chosen so the line passes through the mean point (x̄, ȳ).' },
    { id: 'prediction', name: 'Prediction', formula: 'ŷ = b₀ + b₁ · x', explanation: 'Plug any x into the line to get the predicted value ŷ.' },
    { id: 'mse', name: 'Mean Squared Error', formula: 'MSE = Σ(y − ŷ)² / n', explanation: 'The average squared gap between actual and predicted values. Lower is better; squaring makes big misses count more.' },
    { id: 'r2', name: 'R² score', formula: 'R² = 1 − Σ(y − ŷ)² / Σ(y − ȳ)²', explanation: 'The share of the variation in y that the line explains: 1 is a perfect fit, 0 is no better than always predicting the mean.' },
  ],
  knn: [
    { id: 'distance', name: 'Euclidean distance', formula: 'd = √((x₁ − x₂)² + (y₁ − y₂)²)', explanation: 'The straight-line distance between two points (Pythagoras). Smaller means more similar.' },
    { id: 'vote', name: 'Majority vote', formula: 'ŷ = most common class among the K nearest points', explanation: 'Each of the K closest training points votes for its own class; the class with the most votes is the prediction.' },
  ],
  'decision-tree': [
    { id: 'entropy', name: 'Entropy', formula: 'H(S) = −Σ pᵢ · log₂(pᵢ)', explanation: 'Measures how mixed the classes are. 0 means every row has the same label; 1 means a 50/50 mix of two classes (maximum uncertainty).' },
    { id: 'gain', name: 'Information gain', formula: 'Gain(S, A) = H(S) − Σᵥ (|Sᵥ| / |S|) · H(Sᵥ)', explanation: 'How much splitting on attribute A reduces entropy. The attribute with the largest gain gives the most useful question.' },
  ],
  kmeans: [
    { id: 'distance', name: 'Euclidean distance', formula: 'd(p, c) = √((xₚ − x_c)² + (yₚ − y_c)²)', explanation: 'How far a point is from a centroid. Each point joins the centroid with the smallest distance.' },
    { id: 'mean', name: 'Centroid mean', formula: 'c = ( Σx / n , Σy / n )', explanation: 'A centroid moves to the average position of the n points assigned to it - that is where the name K-Means comes from.' },
  ],
  evaluation: [
    { id: 'accuracy', name: 'Accuracy', formula: '(TP + TN) / (TP + TN + FP + FN)', explanation: 'The share of all predictions that were correct.' },
    { id: 'precision', name: 'Precision', formula: 'TP / (TP + FP)', explanation: 'Of everything predicted positive, how much really was positive. High precision = few false alarms.' },
    { id: 'recall', name: 'Recall', formula: 'TP / (TP + FN)', explanation: 'Of all real positives, how many were found. High recall = few misses.' },
    { id: 'f1', name: 'F1 score', formula: '2 · Precision · Recall / (Precision + Recall)', explanation: 'The harmonic mean of precision and recall; it is only high when both are high.' },
  ],
};
