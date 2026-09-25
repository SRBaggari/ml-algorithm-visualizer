import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useApp } from '../context/AppContext.jsx';
import { ALGORITHMS } from '../data/algorithms.js';

export const NAV_GROUPS = [
  { label: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: 'dashboard' }] },
  {
    label: 'Data',
    items: [
      { to: '/preprocessing', label: 'Data Preprocessing', icon: 'filter' },
      { to: '/train-test-split', label: 'Train / Test Split', icon: 'split' },
    ],
  },
  {
    label: 'Algorithms',
    items: [
      { to: '/playground', label: 'Algorithm Playground', icon: 'spark' },
      { to: '/linear-regression', label: 'Linear Regression', icon: 'trend', algo: 'linear-regression' },
      { to: '/knn', label: 'KNN Classification', icon: 'target', algo: 'knn' },
      { to: '/decision-tree', label: 'Decision Tree', icon: 'tree', algo: 'decision-tree' },
      { to: '/kmeans', label: 'K-Means Clustering', icon: 'cluster', algo: 'kmeans' },
    ],
  },
  {
    label: 'Evaluate',
    items: [
      { to: '/evaluation', label: 'Model Evaluation', icon: 'gauge' },
      { to: '/comparison', label: 'Algorithm Comparison', icon: 'compare' },
    ],
  },
  {
    label: 'Learn',
    items: [
      { to: '/learn', label: 'Learning Mode', icon: 'book' },
      { to: '/quiz', label: 'Quiz', icon: 'quiz' },
    ],
  },
];

export default function Sidebar({ open, onNavigate }) {
  const { progress } = useApp();
  const completedCount = ALGORITHMS.filter((a) => progress.finished[a.id]).length;

  return (
    <aside id="app-sidebar" className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar__brand">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="trend" size={18} strokeWidth={2.2} />
        </span>
        <div>
          <div className="brand-name">ML Visualizer</div>
          <div className="brand-sub">Learn by seeing</div>
        </div>
      </div>
      <nav className="sidebar__nav">
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group__label">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                onClick={onNavigate}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.algo && progress.finished[item.algo] && (
                  <span className="nav-link__done" title="Walkthrough completed" aria-label="completed">
                    <Icon name="check" size={13} strokeWidth={2.6} />
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar__footer">
        <div className="mini-progress">
          <div className="mini-progress__row">
            <span>Algorithms completed</span>
            <strong>
              {completedCount}/{ALGORITHMS.length}
            </strong>
          </div>
          <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={ALGORITHMS.length} aria-valuenow={completedCount} aria-label="Algorithms completed">
            <span style={{ width: `${(completedCount / ALGORITHMS.length) * 100}%` }} />
          </div>
        </div>
        <p className="sidebar__offline">
          <Icon name="check" size={14} /> Runs 100% in your browser
        </p>
      </div>
    </aside>
  );
}
