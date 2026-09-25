import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { Card, EmptyState, Explain, PageHeader, Segmented } from '../components/ui.jsx';
import { ALGORITHMS } from '../data/algorithms.js';

const COLUMNS = [
  ['type', 'Type'],
  ['supervision', 'Supervised / Unsupervised'],
  ['mainIdea', 'Main idea'],
  ['input', 'Input'],
  ['output', 'Output'],
  ['use', 'Common use'],
  ['keyParameter', 'Key parameter'],
];

// Practical characteristics - descriptive, not a ranking.
const TRAITS = [
  {
    trait: 'Training work',
    'linear-regression': 'One pass of sums (closed-form)',
    knn: 'None - just stores the data',
    'decision-tree': 'Evaluates splits at every node',
    kmeans: 'Repeats assign/update until stable',
  },
  {
    trait: 'Prediction work',
    'linear-regression': 'One multiplication and addition',
    knn: 'Distance to every stored point',
    'decision-tree': 'Follow one path root → leaf',
    kmeans: 'Distance to K centroids',
  },
  {
    trait: 'Interpretability',
    'linear-regression': 'Slope shows the effect of x',
    knn: 'Explain by showing the neighbors',
    'decision-tree': 'Readable if-then rules',
    kmeans: 'Centroids describe each group',
  },
  {
    trait: 'Feature scaling',
    'linear-regression': 'Not required for the fit',
    knn: 'Important (distance-based)',
    'decision-tree': 'Not required',
    kmeans: 'Important (distance-based)',
  },
];

export default function Comparison() {
  const [query, setQuery] = useState('');
  const [style, setStyle] = useState('all');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALGORITHMS.filter((a) => style === 'all' || a.supervision === style).filter(
      (a) => !q || [a.name, ...COLUMNS.map(([key]) => a[key])].some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [query, style]);

  return (
    <div className="page">
      <PageHeader
        icon="compare"
        eyebrow="Evaluate"
        title="Algorithm Comparison"
        subtitle="How the four algorithms differ in what they learn, what they need and what they produce."
      />

      <Card
        title="Overview"
        icon="table"
        actions={
          <div className="compare-filters">
            <label className="search-field">
              <Icon name="eye" size={15} />
              <span className="sr-only">Search algorithms</span>
              <input type="text" placeholder="Search e.g. “distance”, “labels”" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <Segmented
              size="sm"
              label="Filter by learning style"
              value={style}
              onChange={setStyle}
              options={[
                { value: 'all', label: 'All' },
                { value: 'Supervised', label: 'Supervised' },
                { value: 'Unsupervised', label: 'Unsupervised' },
              ]}
            />
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState icon="eye" title="No algorithms match">
            Try a different search term or filter.
          </EmptyState>
        ) : (
        <div className="table-wrap">
          <table className="data-table compare-table">
            <thead>
              <tr>
                <th scope="col">Algorithm</th>
                {COLUMNS.map(([, label]) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <th scope="row">
                    <Link to={a.path} className="compare-table__algo">
                      <Icon name={a.icon} size={16} /> {a.name}
                    </Link>
                  </th>
                  {COLUMNS.map(([key]) => (
                    <td key={key}>{key === 'type' || key === 'supervision' ? <span className="tag">{a[key]}</span> : a[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        <p className="hint">
          Showing {rows.length} of {ALGORITHMS.length} algorithms.
        </p>
      </Card>

      <Card title="Practical characteristics" icon="layers" subtitle="Descriptive differences - not a ranking.">
        <div className="table-wrap">
          <table className="data-table compare-table">
            <thead>
              <tr>
                <th scope="col">Characteristic</th>
                {ALGORITHMS.map((a) => (
                  <th scope="col" key={a.id}>
                    {a.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRAITS.map((t) => (
                <tr key={t.trait}>
                  <th scope="row">{t.trait}</th>
                  {ALGORITHMS.map((a) => (
                    <td key={a.id}>{t[a.id]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Which one fits my problem?" icon="flag">
        <div className="chooser">
          <div className="chooser__item">
            <span className="chooser__q">Predicting a number?</span>
            <span>
              A <strong>regression</strong> task → <Link to="/linear-regression" className="link">Linear Regression</Link> is a natural starting point.
            </span>
          </div>
          <div className="chooser__item">
            <span className="chooser__q">Predicting a category, with labelled examples?</span>
            <span>
              A <strong>classification</strong> task → <Link to="/knn" className="link">KNN</Link> or a <Link to="/decision-tree" className="link">Decision Tree</Link>. Trees give
              readable rules; KNN adapts to irregular boundaries.
            </span>
          </div>
          <div className="chooser__item">
            <span className="chooser__q">No labels, want to discover groups?</span>
            <span>
              A <strong>clustering</strong> task → <Link to="/kmeans" className="link">K-Means</Link>.
            </span>
          </div>
        </div>
      </Card>

      <Explain title="No algorithm is universally better">
        Each algorithm makes different assumptions about the data. Which one works best depends on the problem, the amount and type of data, and what you
        need (accuracy, speed, explanations). In practice, data scientists try several candidates and compare them on a held-out test set using the
        metrics from the <Link to="/evaluation" className="link">Model Evaluation</Link> page.
      </Explain>
    </div>
  );
}
