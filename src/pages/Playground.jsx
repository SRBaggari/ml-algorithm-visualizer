import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { PageHeader } from '../components/ui.jsx';
import { ALGORITHMS } from '../data/algorithms.js';
import LinearRegression from './LinearRegression.jsx';
import KNN from './KNN.jsx';
import DecisionTree from './DecisionTree.jsx';
import KMeans from './KMeans.jsx';

const LABS = {
  'linear-regression': LinearRegression,
  knn: KNN,
  'decision-tree': DecisionTree,
  kmeans: KMeans,
};

/**
 * One experimentation area for every algorithm: pick an algorithm, then choose a
 * dataset, change parameters, run, step through and read the result - all in the browser.
 */
export default function Playground() {
  const [params, setParams] = useSearchParams();
  const algoId = LABS[params.get('algo')] ? params.get('algo') : 'linear-regression';
  const algo = ALGORITHMS.find((a) => a.id === algoId);
  const Lab = LABS[algoId];

  return (
    <div className="page">
      <PageHeader
        icon="spark"
        eyebrow="Experiment"
        title="Algorithm Playground"
        subtitle="Select an algorithm, choose a dataset, change the parameters, run it and step through the calculations - everything runs locally in your browser."
      />

      <section className="card playground-picker" aria-label="Choose an algorithm">
        <div className="playground-picker__label">1. Select algorithm</div>
        <div className="playground-picker__options" role="radiogroup" aria-label="Algorithm">
          {ALGORITHMS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={a.id === algoId}
              className={`playground-option ${a.id === algoId ? 'is-active' : ''}`}
              onClick={() => setParams({ algo: a.id })}
            >
              <Icon name={a.icon} size={18} />
              <span>
                <strong>{a.name}</strong>
                <span className="muted small">
                  {a.type} · {a.supervision}
                </span>
              </span>
            </button>
          ))}
        </div>
        <ol className="playground-steps">
          <li>2. Choose a dataset or upload a CSV</li>
          <li>3. Set the parameters</li>
          <li>4. Run, then step through the calculation</li>
          <li>5. Read the result</li>
        </ol>
        <p className="muted small">
          {algo.short}{' '}
          <Link to={algo.path} className="link">
            Open the full {algo.name} lesson page →
          </Link>
        </p>
      </section>

      {/* key: switching algorithm starts a fresh lab with its sample dataset */}
      <Lab key={algoId} embedded />
    </div>
  );
}
