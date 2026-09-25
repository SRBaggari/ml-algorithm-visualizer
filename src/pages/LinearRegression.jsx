import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ChartFrame, { paddedDomain } from '../components/ChartFrame.jsx';
import StepController from '../components/StepController.jsx';
import ConceptFlow from '../components/ConceptFlow.jsx';
import ReportButton from '../components/ReportButton.jsx';
import LearningPanel from '../components/LearningPanel.jsx';
import { getTopic } from '../data/learningContent.js';
import DatasetInfo from '../components/DatasetInfo.jsx';
import ExplainStep from '../components/ExplainStep.jsx';
import FormulaPanel from '../components/FormulaPanel.jsx';
import { AlgorithmIntro, GuideHint, KeyTakeaways, ResultCard } from '../components/AlgorithmSections.jsx';
import { GUIDES } from '../data/algorithmGuides.js';
import { IDLE_EXPLANATIONS, linearRegressionStep } from '../data/stepExplanations.js';
import ColumnPicker, { defaultColumns, pointsFromColumns } from '../components/ColumnPicker.jsx';
import { Alert, Card, Formula, Legend, PageHeader, Segmented } from '../components/ui.jsx';
import { useStepPlayer } from '../hooks/useStepPlayer.js';
import { useAlgorithmTracking, useApp } from '../context/AppContext.jsx';
import { fitLinearRegression, LINREG_STEPS, predict } from '../algorithms/linearRegression.js';
import { randomRegressionPoints, REGRESSION_DATASETS } from '../data/datasets.js';
import { randomSeed } from '../utils/random.js';
import { fmt, paren, signed } from '../utils/format.js';
import { friendlyError } from '../utils/errors.js';

let nextId = 1;
const withIds = (pts) => pts.map((p) => ({ ...p, id: nextId++ }));

const ACTIVE_FORMULAS = [[], ['slope'], ['intercept'], ['prediction'], ['mse', 'r2'], ['prediction']];

const DATASET_OPTIONS = [
  ...Object.values(REGRESSION_DATASETS).map((d) => ({ value: d.id, label: d.name })),
  { value: 'random', label: 'Random dataset' },
];

export default function LinearRegression({ embedded = false }) {
  const { markExplored } = useApp();
  const [datasetId, setDatasetId] = useState('study');
  const [points, setPoints] = useState(() => withIds(REGRESSION_DATASETS.study.points));
  const [axis, setAxis] = useState({ x: REGRESSION_DATASETS.study.xLabel, y: REGRESSION_DATASETS.study.yLabel });
  const [upload, setUpload] = useState(null);
  const [cols, setCols] = useState(null);
  const [mode, setMode] = useState('add');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [stepMode, setStepMode] = useState(false);
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState({ x: '', y: '' });
  const [predX, setPredX] = useState('');
  const [showTable, setShowTable] = useState(false);
  const player = useStepPlayer(LINREG_STEPS.length, { interval: 1900 });

  const xDomain = useMemo(() => paddedDomain(points.map((p) => p.x), { includeZero: true }), [points]);
  const yDomain = useMemo(() => paddedDomain(points.map((p) => p.y)), [points]);
  const step = model ? player.step : -1;
  const [searchParams, setSearchParams] = useSearchParams();
  useAlgorithmTracking('linear-regression', 'Linear Regression', Boolean(model) && player.isLast);
  const tableHeaders = useMemo(() => [axis.x, axis.y], [axis]);
  const tableRows = useMemo(() => points.map((p) => [p.x, p.y]), [points]);

  function invalidate() {
    setModel(null);
    player.reset();
  }

  function updatePoints(next) {
    setPoints(next);
    setSelectedIds(new Set());
    invalidate();
    setError(null);
  }

  function loadDataset(id) {
    setDatasetId(id);
    setUpload(null);
    setNotice(null);
    if (id === 'random') {
      updatePoints(withIds(randomRegressionPoints(randomSeed())));
      setAxis({ x: 'x', y: 'y' });
      return;
    }
    const d = REGRESSION_DATASETS[id];
    updatePoints(withIds(d.points));
    setAxis({ x: d.xLabel, y: d.yLabel });
  }

  function applyColumns(u, c) {
    const { points: pts, skipped } = pointsFromColumns(u.rows, c.x, c.y);
    if (pts.length < 2) {
      setError('Fewer than 2 rows have numeric values in both chosen columns. Pick other columns or another file.');
      return;
    }
    setCols(c);
    updatePoints(withIds(pts.slice(0, 300)));
    setAxis({ x: u.headers[c.x], y: u.headers[c.y] });
    setNotice(
      [skipped ? `${skipped} row(s) with missing or non-numeric values were skipped.` : null, pts.length > 300 ? 'Only the first 300 points are shown.' : null]
        .filter(Boolean)
        .join(' ') || null,
    );
  }

  function onUpload(u) {
    const { cols: c, error: err } = defaultColumns(u);
    if (err) {
      setError(err);
      return;
    }
    setUpload(u);
    setDatasetId('upload');
    applyColumns(u, c);
  }

  function onPlotClick(d) {
    if (mode !== 'add') return;
    updatePoints([...points, { x: Number(d.x.toFixed(2)), y: Number(d.y.toFixed(2)), id: nextId++ }]);
  }

  function onPointClick(id) {
    if (mode !== 'select') return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeSelected() {
    updatePoints(points.filter((p) => !selectedIds.has(p.id)));
  }

  function addFromForm(e) {
    e.preventDefault();
    const x = Number(form.x);
    const y = Number(form.y);
    if (form.x.trim() === '' || form.y.trim() === '' || !Number.isFinite(x) || !Number.isFinite(y)) {
      setError('Please enter valid numbers for both x and y.');
      return;
    }
    updatePoints([...points, { x, y, id: nextId++ }]);
    setForm({ x: '', y: '' });
  }

  function train(pts = points, autoplay = !stepMode) {
    try {
      const m = fitLinearRegression(pts);
      setModel(m);
      setError(null);
      player.start(0, autoplay);
      markExplored('linear-regression', 'Trained a Linear Regression model', '/linear-regression', 'trend');
    } catch (err) {
      setModel(null);
      setError(friendlyError(err));
    }
  }

  // Demo mode: load the sample dataset and start the walkthrough paused at step 1.
  function runDemo() {
    const d = REGRESSION_DATASETS.study;
    const pts = withIds(d.points);
    setDatasetId('study');
    setUpload(null);
    setNotice(null);
    setPoints(pts);
    setSelectedIds(new Set());
    setAxis({ x: d.xLabel, y: d.yLabel });
    train(pts, false);
  }

  // Demo mode (?demo=1): load the sample and start paused, then drop the flag from the URL
  // so it also works when the page is already open and does not re-run on refresh.
  useEffect(() => {
    if (!searchParams.get('demo')) return;
    runDemo();
    const next = new URLSearchParams(searchParams);
    next.delete('demo');
    setSearchParams(next, { replace: true });
  }, [searchParams]);

  const predValue = predX.trim() === '' ? null : Number(predX);
  const predValid = predValue !== null && Number.isFinite(predValue);
  const yHatPred = model && predValid ? predict(model, predValue) : null;

  return (
    <div className={embedded ? 'page page--embedded' : 'page'}>
      {!embedded && (
      <PageHeader
        icon="trend"
        eyebrow="Algorithm · Supervised regression"
        title="Linear Regression"
        subtitle="Find the straight line ŷ = b₀ + b₁x that best fits the points by minimising the squared vertical errors."
        actions={
          <ReportButton
            disabled={!model}
            getReport={() =>
              model && {
                algorithm: 'Linear Regression',
                dataset: datasetId === 'upload' ? upload?.fileName : DATASET_OPTIONS.find((o) => o.value === datasetId)?.label || 'Custom points',
                parameters: { method: 'Ordinary least squares', points: model.n, xLabel: axis.x, yLabel: axis.y },
                results: { equation: `y = ${fmt(model.slope, 4)}x ${signed(model.intercept, 4)}`, meanX: model.meanX, meanY: model.meanY, slope: model.slope, intercept: model.intercept },
                metrics: { mse: model.mse, rmse: model.rmse, r2: model.r2, sse: model.sse },
              }
            }
          />
        }
      />
      )}
      {!embedded && <AlgorithmIntro guide={GUIDES['linear-regression']} onDemo={runDemo} />}
      {!model && (
        <GuideHint id="lr-start">
          New here? Keep the sample dataset, press <strong>Train Model</strong>, then use <strong>Next step</strong> to follow each calculation.
        </GuideHint>
      )}

      <ConceptFlow
        label="Linear regression flow"
        active={model ? step + 1 : points.length ? 0 : -1}
        stages={[
          { label: 'Data', icon: 'table' },
          { label: 'Means', icon: 'target' },
          { label: 'Slope', icon: 'trend' },
          { label: 'Intercept', icon: 'flag' },
          { label: 'Predictions', icon: 'eye' },
          { label: 'Error', icon: 'alert' },
          { label: 'Best-fit line', icon: 'check' },
        ]}
      />

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert type="info" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <Card>
        <div className="toolbar">
          <label className="field field--inline">
            <span className="field__label">Dataset</span>
            <select value={datasetId} onChange={(e) => loadDataset(e.target.value)}>
              {DATASET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              {upload && <option value="upload">Uploaded: {upload.fileName}</option>}
            </select>
          </label>
          <div className="toolbar__spacer" />
          <button type="button" className="btn btn--ghost" onClick={() => loadDataset('random')} title="Generate a new random dataset">
            <Icon name="dice" size={16} /> Random
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => (datasetId === 'upload' ? applyColumns(upload, cols) : loadDataset(datasetId))} title="Restore the selected dataset">
            <Icon name="reset" size={16} /> Reset data
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => updatePoints([])} disabled={points.length === 0}>
            <Icon name="trash" size={16} /> Clear
          </button>
          <label className="check">
            <input type="checkbox" checked={stepMode} onChange={(e) => setStepMode(e.target.checked)} />
            <span>Step-by-step (no autoplay)</span>
          </label>
          <button type="button" className="btn btn--primary" onClick={() => train()} disabled={points.length === 0}>
            <Icon name="play" size={16} /> Train Model
          </button>
        </div>
        {points.length < 2 && <p className="hint">Add at least 2 points with different x values to train the model.</p>}
        {upload && datasetId === 'upload' && cols && <ColumnPicker upload={upload} cols={cols} onChange={(c) => applyColumns(upload, c)} />}
      </Card>

      <DatasetInfo
        name={datasetId === 'upload' ? upload?.fileName : DATASET_OPTIONS.find((o) => o.value === datasetId)?.label || 'Custom points'}
        headers={tableHeaders}
        rows={tableRows}
        target={axis.y}
        onUpload={onUpload}
        onError={setError}
        onReset={() => loadDataset('study')}
        downloadName="linear-regression-data.csv"
        uploadHelp="Upload a CSV with at least two numerical columns, then choose the X and Y columns."
      />

      <div className="viz-layout">
        <div className="viz-main">
          <Card
            title="Scatter plot"
            icon="trend"
            subtitle={mode === 'add' ? 'Click an empty area of the graph to add a point.' : 'Click points to select them, then remove the selection.'}
            actions={
              <>
                <Segmented
                  size="sm"
                  label="Editing mode"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'add', label: '+ Add points' },
                    { value: 'select', label: 'Select points' },
                  ]}
                />
                {mode === 'select' && (
                  <button type="button" className="btn btn--secondary btn--sm" onClick={removeSelected} disabled={!selectedIds.size}>
                    <Icon name="trash" size={14} /> Remove selected ({selectedIds.size})
                  </button>
                )}
              </>
            }
          >
            <ChartFrame
              xDomain={xDomain}
              yDomain={yDomain}
              xLabel={axis.x}
              yLabel={axis.y}
              onPlotClick={onPlotClick}
              cursor={mode === 'add' ? 'crosshair' : 'default'}
              ariaLabel={`Scatter plot of ${points.length} points${model ? `, fitted line y = ${fmt(model.slope)}x ${signed(model.intercept)}` : ''}`}
              caption={
                model
                  ? `${points.length} points of ${axis.y} against ${axis.x}. Step ${step + 1}: ${LINREG_STEPS[step].title.toLowerCase()}. Best-fit line ŷ = ${fmt(model.slope, 3)}x ${signed(model.intercept, 3)}, R² = ${fmt(model.r2, 3)}.`
                  : `${points.length} points of ${axis.y} against ${axis.x}. No line has been fitted yet.`
              }
            >
              {({ sx, sy }) => (
                <g>
                  {model && step >= 0 && (
                    <g className={`fade-in ${step === 0 ? 'is-focus' : ''}`}>
                      <line className="guide-line" x1={sx(model.meanX)} x2={sx(model.meanX)} y1={sy(yDomain[0])} y2={sy(yDomain[1])} />
                      <line className="guide-line" x1={sx(xDomain[0])} x2={sx(xDomain[1])} y1={sy(model.meanY)} y2={sy(model.meanY)} />
                      <text className="guide-label" x={sx(model.meanX) + 6} y={sy(yDomain[1]) + 14}>
                        x̄ = {fmt(model.meanX)}
                      </text>
                      <text className="guide-label" x={sx(xDomain[1]) - 6} y={sy(model.meanY) - 6} textAnchor="end">
                        ȳ = {fmt(model.meanY)}
                      </text>
                    </g>
                  )}
                  {model && step === 1 &&
                    model.rows.map((r) => (
                      <g key={`dev${r.id}`} className={`deviation ${r.dxdy >= 0 ? 'is-pos' : 'is-neg'}`}>
                        <line x1={sx(r.x)} x2={sx(model.meanX)} y1={sy(r.y)} y2={sy(r.y)} />
                        <line x1={sx(r.x)} x2={sx(r.x)} y1={sy(r.y)} y2={sy(model.meanY)} />
                      </g>
                    ))}
                  {model && step >= 2 && step < 5 && (
                    <line
                      className="fit-line fit-line--preview"
                      x1={sx(xDomain[0])}
                      x2={sx(xDomain[1])}
                      y1={sy(predict(model, xDomain[0]))}
                      y2={sy(predict(model, xDomain[1]))}
                    />
                  )}
                  {model && step === 2 && xDomain[0] <= 0 && (
                    <g className="fade-in">
                      <circle className="intercept-dot" cx={sx(0)} cy={sy(model.intercept)} r={7} />
                      <text className="guide-label" x={sx(0) + 10} y={sy(model.intercept) - 10}>
                        b₀ = {fmt(model.intercept)}
                      </text>
                    </g>
                  )}
                  {model && step >= 4 &&
                    model.rows.map((r) => (
                      <line key={`res${r.id}`} className={`residual ${step === 4 ? 'is-focus' : ''}`} x1={sx(r.x)} x2={sx(r.x)} y1={sy(r.y)} y2={sy(r.yHat)} />
                    ))}
                  {model && step >= 5 && (
                    <line
                      className="fit-line fit-line--draw"
                      x1={sx(xDomain[0])}
                      x2={sx(xDomain[1])}
                      y1={sy(predict(model, xDomain[0]))}
                      y2={sy(predict(model, xDomain[1]))}
                      pathLength={1}
                    />
                  )}
                  {points.map((p) => (
                    <circle
                      key={p.id}
                      className={`pt pt--data ${mode === 'select' ? 'is-removable' : ''} ${selectedIds.has(p.id) ? 'is-selected' : ''}`}
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r={6}
                      onClick={() => onPointClick(p.id)}
                    >
                      <title>{`(${fmt(p.x)}, ${fmt(p.y)})${mode === 'select' ? (selectedIds.has(p.id) ? ' - selected' : ' - click to select') : ''}`}</title>
                    </circle>
                  ))}
                  {model && step >= 3 &&
                    model.rows.map((r) => (
                      <circle key={`hat${r.id}`} className={`pt pt--pred ${step === 3 ? 'is-focus' : ''}`} cx={sx(r.x)} cy={sy(r.yHat)} r={4}>
                        <title>{`ŷ(${fmt(r.x)}) = ${fmt(r.yHat)}`}</title>
                      </circle>
                    ))}
                  {model && step >= 0 && (
                    <circle className="pt pt--mean" cx={sx(model.meanX)} cy={sy(model.meanY)} r={5}>
                      <title>{`Mean point (x̄, ȳ) = (${fmt(model.meanX)}, ${fmt(model.meanY)}) - the best-fit line always passes through it`}</title>
                    </circle>
                  )}
                  {yHatPred !== null && step >= 3 && (
                    <g className="fade-in">
                      <circle className="pt pt--query" cx={sx(predValue)} cy={sy(yHatPred)} r={7} />
                      <text className="guide-label guide-label--strong" x={sx(predValue) + 10} y={sy(yHatPred) + 4}>
                        ŷ = {fmt(yHatPred)}
                      </text>
                    </g>
                  )}
                </g>
              )}
            </ChartFrame>
            <div className="chart-footer">
              <Legend
                items={[
                  { label: 'Data point', color: 'var(--s1)' },
                  { label: 'Prediction ŷ', color: 'var(--accent)', shape: 'ring' },
                  { label: 'Residual (error)', color: 'var(--danger)', shape: 'line' },
                  { label: 'Best-fit line', color: 'var(--text)', shape: 'line' },
                ]}
              />
              <form className="inline-form" onSubmit={addFromForm}>
                <input type="number" step="any" placeholder="x" aria-label="New point x" value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} />
                <input type="number" step="any" placeholder="y" aria-label="New point y" value={form.y} onChange={(e) => setForm({ ...form, y: e.target.value })} />
                <button type="submit" className="btn btn--secondary btn--sm">
                  <Icon name="plus" size={14} /> Add point
                </button>
              </form>
            </div>
          </Card>
        </div>

        <aside className="viz-side">
          <ExplainStep explanation={model ? linearRegressionStep(model, step) : IDLE_EXPLANATIONS['linear-regression']} stepLabel={model ? `Step ${step + 1} of ${LINREG_STEPS.length}` : 'Not started'} />
          <StepExplanation model={model} step={step} />
        </aside>
      </div>

      <Card>
        <StepController player={player} steps={LINREG_STEPS} disabled={!model} emptyText="Press “Train Model” to start the step-by-step walkthrough" />
      </Card>

      <CalculationLedger model={model} step={step} />

      <ResultCard
        algorithm="Linear Regression"
        emptyText="Train the model and step to the end to see the final result."
        final={model && player.isLast ? ['Final equation', `ŷ = ${fmt(model.slope, 3)}x ${signed(model.intercept, 3)}`] : null}
        rows={
          model
            ? [
                ['Dataset', datasetId === 'upload' ? upload?.fileName : DATASET_OPTIONS.find((o) => o.value === datasetId)?.label || 'Custom points'],
                ['Data points', model.n],
                ['Slope (b₁)', fmt(model.slope, 4)],
                ['Intercept (b₀)', fmt(model.intercept, 4)],
                ['Mean Squared Error', fmt(model.mse, 4)],
                ['R² score', `${fmt(model.r2, 4)} (${fmt(model.r2 * 100, 1)}% of variation explained)`],
              ]
            : []
        }
      />

      <div className="grid-2">
        <Card title="Make a prediction" icon="target">
          <label className="field">
            <span className="field__label">Enter an x value ({axis.x})</span>
            <input type="number" step="any" value={predX} onChange={(e) => setPredX(e.target.value)} placeholder="e.g. 6" />
          </label>
          {!model && <p className="muted">Train the model first.</p>}
          {model && predX.trim() !== '' && !predValid && <p className="error-text">Please enter a valid number.</p>}
          {model && predValid && (
            <Formula>
              ŷ = {fmt(model.intercept, 3)} + {paren(model.slope, 3)} × {paren(predValue)} = <strong>{fmt(yHatPred, 3)}</strong>
            </Formula>
          )}
          {model && predValid && step < 3 && <p className="hint">Advance to step 4 to see the prediction on the chart.</p>}
        </Card>
        <Card title="Why squared errors?" icon="info">
          <p className="muted">
            Squaring each residual makes every error positive (so misses above and below the line cannot cancel out) and makes large misses count much more than
            small ones. The least-squares line is the one position where the total of these squared gaps is as small as possible.
          </p>
        </Card>
      </div>

      {model && (
        <Card
          title="Full calculation table"
          icon="table"
          actions={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
              {showTable ? 'Hide' : 'Show'} table
            </button>
          }
        >
          {showTable ? <CalcTable model={model} /> : <p className="muted">Every intermediate number for all {model.n} points.</p>}
        </Card>
      )}

      {!embedded && (
        <>
          <FormulaPanel algorithm="linear-regression" active={model ? ACTIVE_FORMULAS[step] : []} />
          <KeyTakeaways items={GUIDES['linear-regression'].takeaways} />
          <LearningPanel topic={getTopic('linear-regression')} compact />
        </>
      )}
    </div>
  );
}

const LEDGER_LABELS = ['Mean X (x̄)', 'Mean Y (ȳ)', 'Slope (b₁)', 'Intercept (b₀)', 'Predictions (ŷ)', 'Residuals (y − ŷ)', 'MSE', 'R²'];

/** Every calculated quantity, revealed as the walkthrough reaches it; the current step's rows are highlighted. */
function CalculationLedger({ model, step }) {
  const preview = (rows, pick) => rows.slice(0, 3).map(pick).join(' · ') + (rows.length > 3 ? ' · …' : '');
  const rows = model
    ? [
        { step: 0, value: fmt(model.meanX, 4), detail: `Σx / n = ${fmt(model.sumX, 3)} / ${model.n}` },
        { step: 0, value: fmt(model.meanY, 4), detail: `Σy / n = ${fmt(model.sumY, 3)} / ${model.n}` },
        { step: 1, value: fmt(model.slope, 4), detail: `Σ(x−x̄)(y−ȳ) / Σ(x−x̄)² = ${fmt(model.sxy, 3)} / ${fmt(model.sxx, 3)}` },
        { step: 2, value: fmt(model.intercept, 4), detail: `ȳ − b₁·x̄ = ${fmt(model.meanY, 3)} − ${paren(model.slope, 3)} × ${paren(model.meanX, 3)}` },
        { step: 3, value: `${model.n} values`, detail: preview(model.rows, (r) => `ŷ(${fmt(r.x)}) = ${fmt(r.yHat, 2)}`) },
        { step: 4, value: `Σ(y − ŷ)² = ${fmt(model.sse, 3)}`, detail: preview(model.rows, (r) => fmt(r.residual, 2)) },
        { step: 4, value: fmt(model.mse, 4), detail: `Σ(y − ŷ)² / n = ${fmt(model.sse, 3)} / ${model.n}` },
        { step: 4, value: fmt(model.r2, 4), detail: `1 − SSE / SST = 1 − ${fmt(model.sse, 3)} / ${fmt(model.sst, 3)}` },
      ]
    : LEDGER_LABELS.map(() => ({ step: Infinity }));
  return (
    <Card title="Calculation ledger" icon="table" subtitle={model ? 'Values appear as each step is reached; the current step is highlighted.' : 'Train the model to fill in the calculations.'}>
      <div className="ledger" role="list">
        {rows.map((r, i) => {
          const reached = model && step >= r.step;
          return (
            <div key={LEDGER_LABELS[i]} role="listitem" className={`ledger__row ${reached ? 'is-reached' : ''} ${model && step === r.step ? 'is-current' : ''}`}>
              <span className="ledger__label">{LEDGER_LABELS[i]}</span>
              <span className="ledger__value">{reached ? r.value : '—'}</span>
              <span className="ledger__detail">{reached ? r.detail : 'waiting…'}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function StepExplanation({ model, step }) {
  if (!model) {
    return (
      <Card title="How it works" icon="book">
        <ol className="plain-steps">
          {LINREG_STEPS.map((s) => (
            <li key={s.id}>{s.title}</li>
          ))}
        </ol>
        <p className="muted small">Press “Train Model” to run these calculations on your points.</p>
      </Card>
    );
  }
  const m = model;
  const content = [
    <>
      <p>Find the “center” of the data by averaging each coordinate.</p>
      <Formula>
        x̄ = Σx / n = {fmt(m.sumX, 3)} / {m.n} = <strong>{fmt(m.meanX, 3)}</strong>
      </Formula>
      <Formula>
        ȳ = Σy / n = {fmt(m.sumY, 3)} / {m.n} = <strong>{fmt(m.meanY, 3)}</strong>
      </Formula>
      <p className="muted small">The dashed lines on the chart mark the means.</p>
    </>,
    <>
      <p>Measure how x and y move together. Green lines: point is on the same side of both means (pushes the slope up). Red: opposite sides (pushes it down).</p>
      <Formula>
        b₁ = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)² = {fmt(m.sxy, 3)} / {fmt(m.sxx, 3)} = <strong>{fmt(m.slope, 4)}</strong>
      </Formula>
      <MiniTable rows={m.rows.slice(0, 4)} cols={[['x', 'x'], ['y', 'y'], ['x − x̄', 'dx'], ['y − ȳ', 'dy'], ['product', 'dxdy'], ['(x − x̄)²', 'dx2']]} more={m.n - 4} />
    </>,
    <>
      <p>The best-fit line always passes through (x̄, ȳ), so the intercept follows from the slope.</p>
      <Formula>
        b₀ = ȳ − b₁·x̄ = {fmt(m.meanY, 3)} − {paren(m.slope, 4)} × {paren(m.meanX, 3)} = <strong>{fmt(m.intercept, 4)}</strong>
      </Formula>
      <p className="muted small">The dashed preview line uses these values.</p>
    </>,
    <>
      <p>Plug every x into the equation to get a prediction ŷ (hollow circles).</p>
      <Formula>
        ŷ = {fmt(m.intercept, 3)} + {fmt(m.slope, 3)}·x
      </Formula>
      <MiniTable rows={m.rows.slice(0, 5)} cols={[['x', 'x'], ['y (actual)', 'y'], ['ŷ (predicted)', 'yHat']]} more={m.n - 5} />
    </>,
    <>
      <p>The red lines are residuals (y − ŷ). Square them, add them up and average.</p>
      <Formula>
        MSE = Σ(y − ŷ)² / n = {fmt(m.sse, 3)} / {m.n} = <strong>{fmt(m.mse, 3)}</strong>
      </Formula>
      <Formula>
        R² = 1 − SSE / SST = 1 − {fmt(m.sse, 3)} / {fmt(m.sst, 3)} = <strong>{fmt(m.r2, 4)}</strong>
      </Formula>
      <p className="muted small">RMSE = √MSE = {fmt(m.rmse, 3)} - a “typical” error in the units of y.</p>
    </>,
    <>
      <p>This is the line with the smallest possible sum of squared errors for these points.</p>
      <Formula>
        <strong>
          ŷ = {fmt(m.slope, 3)}x {signed(m.intercept, 3)}
        </strong>
      </Formula>
      <p>
        Each extra unit of x changes the prediction by <strong>{fmt(m.slope, 3)}</strong>. The model explains <strong>{fmt(m.r2 * 100, 1)}%</strong> of the
        variation in y.
      </p>
    </>,
  ];
  return (
    <Card title="Calculation details" subtitle={`Step ${step + 1}: ${LINREG_STEPS[step].title}`} icon="spark" className="step-explain" key={step}>
      {content[step]}
    </Card>
  );
}

function MiniTable({ rows, cols, more }) {
  return (
    <div className="table-wrap">
      <table className="data-table data-table--mini">
        <thead>
          <tr>
            {cols.map(([h]) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {cols.map(([h, k]) => (
                <td key={h}>{fmt(r[k], 2)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {more > 0 && <p className="muted small">…and {more} more rows (see the full table below).</p>}
    </div>
  );
}

function CalcTable({ model }) {
  return (
    <div className="table-wrap table-wrap--scroll">
      <table className="data-table">
        <thead>
          <tr>
            {['x', 'y', 'x − x̄', 'y − ȳ', '(x − x̄)(y − ȳ)', '(x − x̄)²', 'ŷ', 'y − ŷ', '(y − ŷ)²'].map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.rows.map((r) => (
            <tr key={r.id}>
              {['x', 'y', 'dx', 'dy', 'dxdy', 'dx2', 'yHat', 'residual', 'sq'].map((k) => (
                <td key={k}>{fmt(r[k], 3)}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Σ / mean</th>
            <td>ȳ = {fmt(model.meanY, 3)}</td>
            <td />
            <td />
            <td>{fmt(model.sxy, 3)}</td>
            <td>{fmt(model.sxx, 3)}</td>
            <td />
            <td />
            <td>{fmt(model.sse, 3)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
