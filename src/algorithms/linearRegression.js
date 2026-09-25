import { UserError } from '../utils/errors.js';
// Simple linear regression (one feature) using ordinary least squares.
//   slope     b1 = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²
//   intercept b0 = ȳ − b1·x̄

export const LINREG_STEPS = [
  { id: 'mean', title: 'Calculate the means', short: 'x̄ and ȳ', description: 'Calculating the mean of X and Y - the “center” of the data.' },
  { id: 'slope', title: 'Calculate the slope', short: 'b₁', description: 'Measuring how X and Y move together to get the slope b₁.' },
  { id: 'intercept', title: 'Calculate the intercept', short: 'b₀', description: 'Placing the line through (x̄, ȳ) to get the intercept b₀.' },
  { id: 'predict', title: 'Generate predictions', short: 'ŷ', description: 'Plugging every x into ŷ = b₀ + b₁x.' },
  { id: 'error', title: 'Calculate the error', short: 'MSE', description: 'Measuring the residuals y − ŷ, the MSE and R².' },
  { id: 'line', title: 'Draw the best-fit line', short: 'line', description: 'The final least-squares line.' },
];

export function fitLinearRegression(points) {
  const clean = (points || []).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (clean.length < 2) {
    throw new UserError('At least 2 data points are needed to fit a line. Add more points or load a sample dataset.');
  }
  const n = clean.length;
  const sumX = clean.reduce((a, p) => a + p.x, 0);
  const sumY = clean.reduce((a, p) => a + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  const rows = clean.map((p) => {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    return { ...p, dx, dy, dxdy: dx * dy, dx2: dx * dx, dy2: dy * dy };
  });
  const sxy = rows.reduce((a, r) => a + r.dxdy, 0);
  const sxx = rows.reduce((a, r) => a + r.dx2, 0);
  if (sxx === 0) {
    throw new UserError(
      'All points share the same x value, so the slope would need a division by zero. Add points with different x values.',
    );
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  rows.forEach((r) => {
    r.yHat = slope * r.x + intercept;
    r.residual = r.y - r.yHat;
    r.sq = r.residual ** 2;
  });
  const sse = rows.reduce((a, r) => a + r.sq, 0);
  const sst = rows.reduce((a, r) => a + r.dy2, 0);
  const mse = sse / n;
  // If every y is identical (sst = 0) the line fits perfectly, so R² is defined as 1.
  const r2 = sst === 0 ? 1 : 1 - sse / sst;

  return { n, sumX, sumY, meanX, meanY, sxy, sxx, slope, intercept, rows, sse, sst, mse, rmse: Math.sqrt(mse), r2 };
}

export function predict(model, x) {
  return model.slope * x + model.intercept;
}
