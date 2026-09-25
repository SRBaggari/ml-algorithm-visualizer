import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import AlgorithmCard from '../components/AlgorithmCard.jsx';
import MetricsCard from '../components/MetricsCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Card, EmptyState } from '../components/ui.jsx';
import { useApp } from '../context/AppContext.jsx';
import { ALGORITHMS, TOPIC_IDS } from '../data/algorithms.js';
import { timeAgo } from '../utils/format.js';

const PATH = [
  { to: '/preprocessing', label: 'Clean the data', icon: 'filter', topic: 'preprocessing' },
  { to: '/train-test-split', label: 'Split train / test', icon: 'split', topic: 'train-test-split' },
  { to: '/linear-regression', label: 'Linear Regression', icon: 'trend', algo: 'linear-regression' },
  { to: '/knn', label: 'KNN Classification', icon: 'target', algo: 'knn' },
  { to: '/decision-tree', label: 'Decision Tree', icon: 'tree', algo: 'decision-tree' },
  { to: '/kmeans', label: 'K-Means Clustering', icon: 'cluster', algo: 'kmeans' },
  { to: '/evaluation', label: 'Evaluate models', icon: 'gauge', topic: 'evaluation' },
  { to: '/quiz', label: 'Test yourself', icon: 'quiz', quiz: true },
];

// Quick starts open a page in demo mode: the sample dataset is loaded and the walkthrough starts at step 1.
const QUICK_START = [
  { to: '/linear-regression?demo=1', label: 'Fit a line', icon: 'trend' },
  { to: '/knn?demo=1', label: 'Classify a point', icon: 'target' },
  { to: '/decision-tree?demo=1', label: 'Grow a tree', icon: 'tree' },
  { to: '/kmeans?demo=1', label: 'Find clusters', icon: 'cluster' },
  { to: '/playground', label: 'Open the playground', icon: 'spark' },
  { to: '/quiz', label: 'Take the quiz', icon: 'quiz' },
];

function statusOf(progress, id) {
  if (progress.finished[id]) return 'completed';
  if (progress.explored[id]) return 'explored';
  if (progress.opened[id]) return 'opened';
  return 'new';
}

export default function Dashboard() {
  const { progress, resetProgress } = useApp();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const completed = ALGORITHMS.filter((a) => progress.finished[a.id]).length;
  const learned = TOPIC_IDS.filter((t) => progress.completed[t]).length;
  const best = progress.quiz.best;
  // Overall progress: completed walkthroughs + learned lessons + having taken the quiz.
  const milestones = completed + learned + (best ? 1 : 0);
  const totalMilestones = ALGORITHMS.length + TOPIC_IDS.length + 1;
  const learningPercent = Math.round((milestones / totalMilestones) * 100);
  const recent = progress.recent.map((r) => ({ ...r, algo: ALGORITHMS.find((a) => a.id === r.id) })).filter((r) => r.algo);
  const isNewUser = Object.keys(progress.opened).length === 0 && !best && learned === 0;

  const isDone = (p) => (p.algo ? progress.finished[p.algo] : p.topic ? progress.completed[p.topic] : p.quiz ? best : false);
  const nextStep = PATH.find((p) => !isDone(p)) || PATH[0];

  return (
    <div className="page dashboard">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__text">
          <span className="eyebrow">Frontend-only ML learning platform</span>
          <h1 id="hero-title">ML Algorithm Visualizer</h1>
          <p className="hero__lead">Learn Machine Learning algorithms through interactive visualizations.</p>
          <p className="hero__sub">
            Run Linear Regression, KNN, Decision Trees and K-Means on real sample data and watch every calculation step by step - from cleaning the data to
            evaluating the model. Everything runs offline in your browser.
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => navigate(isNewUser ? '/linear-regression?demo=1' : nextStep.to)}>
              <Icon name="play" size={16} /> {isNewUser ? 'Start with Linear Regression' : `Continue: ${nextStep.label}`}
            </button>
            <Link to="/playground" className="btn btn--secondary btn--lg">
              <Icon name="spark" size={16} /> Algorithm Playground
            </Link>
          </div>
        </div>
        <ol className="hero-steps" aria-label="How to use the app">
          <li>
            <span>1</span> Pick an algorithm
          </li>
          <li>
            <span>2</span> Load the sample dataset
          </li>
          <li>
            <span>3</span> Run it
          </li>
          <li>
            <span>4</span> Use <strong>Next step</strong> to follow each calculation
          </li>
          <li>
            <span>5</span> Read the result and the explanation
          </li>
        </ol>
      </section>

      {isNewUser && (
        <div className="welcome-banner" role="note">
          <Icon name="spark" size={18} />
          <p>
            <strong>New here?</strong> Start with Linear Regression - the demo loads the “Hours Studied vs Exam Score” sample and pauses at step 1 so you can
            press <strong>Next step</strong> and follow along.
          </p>
          <Link to="/linear-regression?demo=1" className="btn btn--primary btn--sm">
            Try the demo
          </Link>
        </div>
      )}

      <div className="stats-grid stats-grid--4">
        <MetricsCard label="Algorithms available" value={ALGORITHMS.length} icon={<Icon name="layers" size={16} />} footer={<span className="muted">plus preprocessing, splitting and evaluation</span>} />
        <MetricsCard
          label="Learning progress"
          value={learningPercent}
          format={(v) => `${Math.round(v)}%`}
          icon={<Icon name="book" size={16} />}
          footer={
            <>
              <ProgressBar value={learningPercent} max={100} label="Learning progress" />
              <span className="muted small">
                {learned}/{TOPIC_IDS.length} lessons learned
              </span>
            </>
          }
          hint="Completed algorithm walkthroughs, lessons marked as learned and taking the quiz."
        />
        <MetricsCard
          label="Algorithms completed"
          value={completed}
          format={(v) => `${Math.round(v)} / ${ALGORITHMS.length}`}
          icon={<Icon name="check" size={16} />}
          footer={<ProgressBar value={completed} max={ALGORITHMS.length} label="Algorithms completed" />}
          hint="An algorithm is completed when you step through its walkthrough to the final step."
        />
        <MetricsCard
          label="Quiz best score"
          value={best ? best.percent : null}
          format={(v) => `${Math.round(v)}%`}
          icon={<Icon name="trophy" size={16} />}
          footer={
            best ? (
              <span className="muted">
                {best.score}/{best.total} correct · {progress.quiz.attempts} attempt{progress.quiz.attempts === 1 ? '' : 's'}
              </span>
            ) : (
              <Link to="/quiz" className="link">
                Take the quiz →
              </Link>
            )
          }
        />
      </div>

      <div className="grid-2 grid-2--wide-left">
        <Card title="Quick start" icon="spark" subtitle="Each demo loads a sample dataset and starts the walkthrough - no setup needed.">
          <div className="quick-grid">
            {QUICK_START.map((q) => (
              <Link key={q.to} to={q.to} className="quick-btn">
                <Icon name={q.icon} size={18} />
                <span>{q.label}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card title="Recently viewed" icon="clock">
          {recent.length ? (
            <ul className="recent-list">
              {recent.map(({ algo, time }) => (
                <li key={algo.id}>
                  <span className="algo-card__icon algo-card__icon--sm" aria-hidden="true">
                    <Icon name={algo.icon} size={18} />
                  </span>
                  <div>
                    <strong>{algo.name}</strong>
                    <span className="muted small">
                      {timeAgo(time)} · {progress.finished[algo.id] ? 'completed' : progress.explored[algo.id] ? 'in progress' : 'opened'}
                    </span>
                  </div>
                  <Link to={algo.path} className="btn btn--ghost btn--sm" aria-label={`Open ${algo.name}`}>
                    Open <Icon name="arrowRight" size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="eye" title="Nothing viewed yet">
              Open any algorithm and it will appear here.
            </EmptyState>
          )}
        </Card>
      </div>

      <section aria-labelledby="algos-heading">
        <div className="section-head">
          <h2 id="algos-heading">Algorithms</h2>
          <Link to="/comparison" className="link">
            Compare all →
          </Link>
        </div>
        <div className="algo-grid">
          {ALGORITHMS.map((a) => (
            <AlgorithmCard key={a.id} algorithm={a} status={statusOf(progress, a.id)} learned={Boolean(progress.completed[a.id])} />
          ))}
        </div>
      </section>

      <div className="grid-2">
        <Card title="Learning path" icon="flag" subtitle="A suggested order - each step builds on the last.">
          <ol className="path-list">
            {PATH.map((p, i) => {
              const done = isDone(p);
              const current = p === nextStep && !done;
              return (
                <li key={p.to} className={`${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}>
                  <Link to={p.to}>
                    <span className="path-list__num">{done ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}</span>
                    <Icon name={p.icon} size={16} />
                    <span className="path-list__label">
                      {p.label}
                      {done && <span className="sr-only"> (done)</span>}
                    </span>
                    {current && <span className="badge badge--accent">Next</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
        </Card>
        <Card
          title="Recent activity"
          icon="clock"
          actions={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmReset(true)}>
              <Icon name="trash" size={14} /> Reset Learning Progress
            </button>
          }
        >
          {progress.activity.length === 0 ? (
            <EmptyState icon="clock" title="No activity yet">
              Run an algorithm, finish a lesson or take the quiz - your recent actions appear here. Progress is saved only in this browser.
            </EmptyState>
          ) : (
            <ul className="activity-list">
              {progress.activity.map((a) => (
                <li key={`${a.text}-${a.time}`}>
                  <span className="activity-list__icon" aria-hidden="true">
                    <Icon name={a.icon || 'spark'} size={15} />
                  </span>
                  {a.path ? (
                    <Link to={a.path} className="activity-list__text">
                      {a.text}
                    </Link>
                  ) : (
                    <span className="activity-list__text">{a.text}</span>
                  )}
                  <time className="muted" dateTime={new Date(a.time).toISOString()}>
                    {timeAgo(a.time)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset learning progress?"
        confirmLabel="Reset progress"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetProgress();
          setConfirmReset(false);
        }}
      >
        This clears opened and completed algorithms, learned lessons, quiz scores, recent activity and dismissed tips on this device. Your theme choice is kept.
        This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}

function ProgressBar({ value, max, label }) {
  return (
    <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}
