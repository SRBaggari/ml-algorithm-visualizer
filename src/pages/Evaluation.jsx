import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ConfusionMatrix from '../components/ConfusionMatrix.jsx';
import MetricsCard from '../components/MetricsCard.jsx';
import StepController from '../components/StepController.jsx';
import ReportButton from '../components/ReportButton.jsx';
import LearningPanel from '../components/LearningPanel.jsx';
import ExplainStep from '../components/ExplainStep.jsx';
import FormulaPanel from '../components/FormulaPanel.jsx';
import { ResultCard } from '../components/AlgorithmSections.jsx';
import { EVALUATION_IDLE, evaluationStep } from '../data/stepExplanations.js';
import Marker from '../components/Marker.jsx';
import { LineChart } from '../components/MiniCharts.jsx';
import { Alert, Card, Explain, Legend, PageHeader, Segmented } from '../components/ui.jsx';
import { useStepPlayer } from '../hooks/useStepPlayer.js';
import { useElementSize } from '../hooks/useElementSize.js';
import { useApp } from '../context/AppContext.jsx';
import { EVALUATION_SAMPLES } from '../data/datasets.js';
import { getTopic } from '../data/learningContent.js';
import { computeMetrics, confusionMatrix, thresholdPredictions, thresholdSweep } from '../utils/metrics.js';
import { fmt, pct } from '../utils/format.js';

const STEPS = [
  { id: 'compare', title: 'Compare each prediction with the actual label', short: 'Compare', cells: ['tp', 'fn', 'fp', 'tn'], description: 'Every sample lands in exactly one cell of the matrix.' },
  { id: 'count', title: 'Count TP, FN, FP and TN', short: 'Count', cells: ['tp', 'fn', 'fp', 'tn'], description: 'The four counts summarise all correct and incorrect predictions.' },
  { id: 'accuracy', title: 'Accuracy = (TP + TN) / Total', short: 'Accuracy', cells: ['tp', 'tn'], metric: 'accuracy', description: 'Uses the diagonal: every correct prediction.' },
  { id: 'precision', title: 'Precision = TP / (TP + FP)', short: 'Precision', cells: ['tp', 'fp'], metric: 'precision', description: 'Uses the “Predicted positive” column.' },
  { id: 'recall', title: 'Recall = TP / (TP + FN)', short: 'Recall', cells: ['tp', 'fn'], metric: 'recall', description: 'Uses the “Actual positive” row.' },
  { id: 'f1', title: 'F1 = 2 · P · R / (P + R)', short: 'F1', cells: ['tp', 'fp', 'fn'], metric: 'f1', description: 'Combines precision and recall into one number.' },
];

const OUTCOME = {
  tp: { label: 'TP', text: 'TP - spam caught', color: 'var(--success)', shape: 'circle' },
  tn: { label: 'TN', text: 'TN - normal email passed', color: 'var(--s1)', shape: 'square' },
  fp: { label: 'FP', text: 'FP - false alarm', color: 'var(--warn)', shape: 'triangle' },
  fn: { label: 'FN', text: 'FN - spam missed', color: 'var(--danger)', shape: 'cross' },
};

const EXPLAIN = {
  accuracy: 'Out of every prediction, how many were right? Easy to understand, but misleading when one class is rare.',
  precision: 'When the model says “positive”, how often is it right? High precision means few false alarms.',
  recall: 'Out of all real positives, how many did the model find? High recall means few misses.',
  f1: 'The harmonic mean of precision and recall - it is only high when both are high.',
};

function outcome(actual, predicted) {
  if (actual === 1) return predicted === 1 ? 'tp' : 'fn';
  return predicted === 1 ? 'fp' : 'tn';
}

export default function Evaluation() {
  const { logActivity } = useApp();
  const [source, setSource] = useState('custom');
  const [threshold, setThreshold] = useState(0.5);
  const [custom, setCustom] = useState({ tp: '40', fn: '10', fp: '5', tn: '45' });
  const [walkthrough, setWalkthrough] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const player = useStepPlayer(STEPS.length, { interval: 2000 });

  const predictions = useMemo(() => thresholdPredictions(EVALUATION_SAMPLES.map((s) => s.score), threshold), [threshold]);
  const sweep = useMemo(() => thresholdSweep(EVALUATION_SAMPLES, 40), []);

  const customError = useMemo(() => {
    for (const [key, v] of Object.entries(custom)) {
      if (String(v).trim() === '' || !/^\d+$/.test(String(v).trim())) return `${key.toUpperCase()} must be a whole number of 0 or more.`;
      if (Number(v) > 1e7) return `${key.toUpperCase()} is too large.`;
    }
    if (Object.values(custom).every((v) => Number(v) === 0)) return 'At least one count must be greater than 0.';
    return null;
  }, [custom]);

  const matrix = useMemo(() => {
    if (source === 'custom') {
      return Object.fromEntries(Object.entries(custom).map(([k, v]) => [k, /^\d+$/.test(String(v).trim()) ? Number(v) : 0]));
    }
    return confusionMatrix(EVALUATION_SAMPLES.map((s) => s.actual), predictions);
  }, [source, custom, predictions]);
  const invalid = source === 'custom' && Boolean(customError);
  const m = invalid ? { total: 0, accuracy: null, precision: null, recall: null, f1: null } : computeMetrics(matrix);
  const step = walkthrough ? STEPS[player.step] : null;

  function startWalkthrough() {
    setWalkthrough(true);
    player.start(0, true);
    logActivity('Walked through model evaluation metrics', '/evaluation', 'gauge');
  }

  const focus = (metric) => (step ? (step.metric === metric ? 'focus' : 'dim') : 'default');
  const undefinedNote = (name, why) => `${name} is undefined here (${why} = 0, division by zero).`;

  return (
    <div className="page">
      <PageHeader
        icon="gauge"
        eyebrow="Evaluate"
        title="Model Evaluation"
        subtitle="Measure a classifier with a confusion matrix, accuracy, precision, recall and F1. Change any count and every metric updates instantly."
        actions={
          <ReportButton
            disabled={invalid}
            getReport={() => ({
              algorithm: 'Classification evaluation',
              dataset: source === 'custom' ? 'Custom confusion matrix' : `Spam filter (${EVALUATION_SAMPLES.length} emails)`,
              parameters: source === 'custom' ? { mode: 'custom counts' } : { mode: 'threshold', threshold },
              results: { ...matrix, total: m.total },
              metrics: { accuracy: m.accuracy, precision: m.precision, recall: m.recall, f1: m.f1 },
            })}
          />
        }
      />

      <Card>
        <div className="toolbar">
          <Segmented
            label="Data source"
            value={source}
            onChange={setSource}
            options={[
              { value: 'custom', label: 'Interactive confusion matrix' },
              { value: 'threshold', label: 'Spam filter + threshold' },
            ]}
          />
          <div className="toolbar__spacer" />
          <button type="button" className="btn btn--primary" onClick={startWalkthrough} disabled={invalid}>
            <Icon name="play" size={16} /> Explain step by step
          </button>
        </div>
        {walkthrough && <StepController player={player} steps={STEPS} />}
      </Card>

      {source === 'threshold' && (
        <Card title="Spam filter predictions" icon="target" subtitle={`${EVALUATION_SAMPLES.length} emails. The model outputs a spam probability; emails at or above the threshold are flagged as spam.`}>
          <div className="threshold-control">
            <label htmlFor="threshold" className="field__label">
              Classification threshold: <strong>{threshold.toFixed(2)}</strong>
            </label>
            <input id="threshold" type="range" min={0.05} max={0.95} step={0.01} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          </div>
          <ScoreStrip threshold={threshold} predictions={predictions} onPick={setThreshold} highlight={step?.cells} />
          <Legend items={Object.values(OUTCOME).map((o) => ({ label: o.text, color: o.color, marker: o.shape }))} />
        </Card>
      )}

      <div className="viz-layout viz-layout--even">
        <div className="viz-main">
          <Card
            title="Confusion matrix"
            icon="table"
            subtitle={step ? step.title : source === 'custom' ? 'Type a number or use − / + in any cell. Rows are the truth, columns are the predictions.' : 'Rows are the truth, columns are the model’s predictions.'}
          >
            <ConfusionMatrix
              matrix={matrix}
              highlight={step ? step.cells : []}
              positiveLabel={source === 'custom' ? 'Positive' : 'Spam'}
              negativeLabel={source === 'custom' ? 'Negative' : 'Not spam'}
              editable={source === 'custom'}
              values={custom}
              onChange={(key, value) => setCustom((c) => ({ ...c, [key]: value }))}
            />
            {customError && source === 'custom' && <Alert type="error">{customError}</Alert>}
            {step && step.id === 'compare' && <p className="hint">Correct predictions sit on the diagonal (TP, TN, marked ✓); mistakes are off the diagonal (FP, FN, marked ✗).</p>}
            {step && step.id === 'count' && (
              <p className="hint">
                TP = {matrix.tp}, FN = {matrix.fn}, FP = {matrix.fp}, TN = {matrix.tn} → total = {m.total}
              </p>
            )}
          </Card>
        </div>
        <aside className="viz-side">
          <div className="metric-stack">
            <MetricsCard
              label="Accuracy"
              value={m.accuracy}
              format={pct}
              tone={focus('accuracy')}
              formula={`(${matrix.tp} + ${matrix.tn}) / ${m.total}`}
              footer={<span className="metric-explain">{EXPLAIN.accuracy}</span>}
            />
            <MetricsCard
              label="Precision"
              value={m.precision}
              format={pct}
              tone={focus('precision')}
              formula={m.precision === null && !invalid ? undefinedNote('Precision', 'TP + FP') : `${matrix.tp} / (${matrix.tp} + ${matrix.fp})`}
              footer={<span className="metric-explain">{EXPLAIN.precision}</span>}
            />
            <MetricsCard
              label="Recall"
              value={m.recall}
              format={pct}
              tone={focus('recall')}
              formula={m.recall === null && !invalid ? undefinedNote('Recall', 'TP + FN') : `${matrix.tp} / (${matrix.tp} + ${matrix.fn})`}
              footer={<span className="metric-explain">{EXPLAIN.recall}</span>}
            />
            <MetricsCard
              label="F1 score"
              value={m.f1}
              format={pct}
              tone={focus('f1')}
              formula={m.f1 === null && !invalid ? 'Undefined: precision or recall is undefined, or both are 0.' : `2 · ${fmt(m.precision, 3)} · ${fmt(m.recall, 3)} / (${fmt(m.precision, 3)} + ${fmt(m.recall, 3)})`}
              footer={<span className="metric-explain">{EXPLAIN.f1}</span>}
            />
          </div>
        </aside>
      </div>

      <div className="grid-2">
        <ExplainStep explanation={step ? evaluationStep(step.id, matrix, m) : EVALUATION_IDLE} stepLabel={step ? `Step ${player.step + 1} of ${STEPS.length}` : 'Overview'} />
        <ResultCard
          algorithm="Classification metrics"
          emptyText={customError || 'Enter valid counts to see the result.'}
          final={invalid ? null : ['F1 score', m.f1 === null ? 'undefined' : pct(m.f1)]}
          rows={
            invalid
              ? []
              : [
                  ['Samples', m.total],
                  ['TP / FN / FP / TN', `${matrix.tp} / ${matrix.fn} / ${matrix.fp} / ${matrix.tn}`],
                  ['Accuracy', pct(m.accuracy)],
                  ['Precision', m.precision === null ? 'undefined' : pct(m.precision)],
                  ['Recall', m.recall === null ? 'undefined' : pct(m.recall)],
                ]
          }
        />
      </div>

      {source === 'threshold' && (
        <div className="grid-2">
          <Card title="Metrics vs threshold" icon="trend" subtitle="Raising the threshold usually raises precision and lowers recall.">
            <LineChart
              data={sweep}
              xKey="threshold"
              series={[
                { key: 'precision', label: 'Precision', color: 'var(--s4)' },
                { key: 'recall', label: 'Recall', color: 'var(--s2)' },
                { key: 'f1', label: 'F1', color: 'var(--s3)' },
                { key: 'accuracy', label: 'Accuracy', color: 'var(--s1)', dashed: true },
              ]}
              xDomain={[0, 1]}
              yDomain={[0, 1]}
              xLabel="Threshold"
              yFormat={(v) => `${Math.round(v * 100)}%`}
              valueFormat={(v, key) => (key === 'threshold' ? v.toFixed(2) : pct(v))}
              refX={threshold}
              ariaLabel="Precision, recall, F1 and accuracy for every threshold"
            />
          </Card>
          <Card
            title="Every prediction"
            icon="table"
            actions={
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
                {showTable ? 'Hide' : 'Show'}
              </button>
            }
          >
            {showTable ? (
              <div className="table-wrap table-wrap--scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Email</th>
                      <th scope="col">Score</th>
                      <th scope="col">Actual</th>
                      <th scope="col">Predicted</th>
                      <th scope="col">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EVALUATION_SAMPLES.map((s, i) => {
                      const o = outcome(s.actual, predictions[i]);
                      return (
                        <tr key={s.id}>
                          <td>{s.id}</td>
                          <td>{s.score.toFixed(2)}</td>
                          <td>{s.actual ? 'Spam' : 'Not spam'}</td>
                          <td>{predictions[i] ? 'Spam' : 'Not spam'}</td>
                          <td>
                            <span className="outcome-pill" style={{ '--c': OUTCOME[o].color }}>
                              {OUTCOME[o].label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">A table of all {EVALUATION_SAMPLES.length} emails with their score, true label, prediction at threshold {threshold.toFixed(2)} and outcome.</p>
            )}
          </Card>
        </div>
      )}

      <Explain title="Which metric should I use?">
        There is no single best metric - it depends on which mistake costs more. A spam filter should avoid false alarms (high precision), because losing
        an important email is worse than seeing one spam. A disease screening test should avoid misses (high recall). F1 balances both. Accuracy is easy to
        understand, but if 95% of emails are normal, a model that never flags spam is still 95% “accurate”.
      </Explain>

      <FormulaPanel algorithm="evaluation" active={step?.metric ? [step.metric] : []} />
      <LearningPanel topic={getTopic('evaluation')} compact />
    </div>
  );
}

/** Scores laid out on a 0-1 axis: spam on the top row, normal emails below. Shapes encode the outcome. */
function ScoreStrip({ threshold, predictions, onPick, highlight }) {
  const [ref, { width }] = useElementSize(640);
  const h = 150;
  const padX = 24;
  const x = (v) => padX + v * (width - padX * 2);
  const rows = { 1: 44, 0: 108 };
  return (
    <div ref={ref} className="score-strip">
      <svg
        width={width}
        height={h}
        role="img"
        aria-label={`Scores of ${EVALUATION_SAMPLES.length} emails with threshold at ${threshold.toFixed(2)}. Click to move the threshold.`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const v = (e.clientX - rect.left - padX) / (width - padX * 2);
          onPick(Math.min(0.95, Math.max(0.05, Number(v.toFixed(2)))));
        }}
      >
        <rect x={x(threshold)} y={14} width={Math.max(0, x(1) - x(threshold))} height={h - 34} className="score-strip__zone" />
        <text x={x(1) - 4} y={28} textAnchor="end" className="score-strip__zone-label">
          predicted spam →
        </text>
        <text x={padX} y={rows[1] - 18} className="score-strip__row">
          Actually spam
        </text>
        <text x={padX} y={rows[0] - 18} className="score-strip__row">
          Actually not spam
        </text>
        <line x1={x(0)} x2={x(1)} y1={h - 20} y2={h - 20} className="score-strip__axis" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={t} x={x(t)} y={h - 5} textAnchor="middle" className="score-strip__tick">
            {t}
          </text>
        ))}
        {EVALUATION_SAMPLES.map((s, i) => {
          const o = outcome(s.actual, predictions[i]);
          const jitter = ((i * 37) % 11) - 5;
          const dim = highlight && highlight.length < 4 && !highlight.includes(o);
          return (
            <Marker
              key={s.id}
              x={x(s.score)}
              y={rows[s.actual] + jitter * 2}
              r={5.5}
              shape={OUTCOME[o].shape}
              className={`score-dot ${dim ? 'is-dim' : ''}`}
              style={{ fill: OUTCOME[o].color }}
              title={`${s.id}: score ${s.score.toFixed(2)}, actually ${s.actual ? 'spam' : 'not spam'} → ${OUTCOME[o].label}`}
            />
          );
        })}
        <line x1={x(threshold)} x2={x(threshold)} y1={10} y2={h - 20} className="score-strip__threshold" />
        <text x={x(threshold)} y={10} textAnchor="middle" className="score-strip__tlabel">
          {threshold.toFixed(2)}
        </text>
      </svg>
    </div>
  );
}
