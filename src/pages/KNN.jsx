import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ChartFrame, { paddedDomain } from '../components/ChartFrame.jsx';
import StepController from '../components/StepController.jsx';
import ConceptFlow from '../components/ConceptFlow.jsx';
import ReportButton from '../components/ReportButton.jsx';
import LearningPanel from '../components/LearningPanel.jsx';
import Marker, { MarkerSwatch } from '../components/Marker.jsx';
import DatasetInfo from '../components/DatasetInfo.jsx';
import ExplainStep from '../components/ExplainStep.jsx';
import FormulaPanel from '../components/FormulaPanel.jsx';
import { AlgorithmIntro, GuideHint, KeyTakeaways, ResultCard } from '../components/AlgorithmSections.jsx';
import { GUIDES } from '../data/algorithmGuides.js';
import { IDLE_EXPLANATIONS, knnStep } from '../data/stepExplanations.js';
import ColumnPicker, { defaultColumns, pointsFromColumns } from '../components/ColumnPicker.jsx';
import { Alert, Card, Formula, Legend, PageHeader, Segmented } from '../components/ui.jsx';
import { useStepPlayer } from '../hooks/useStepPlayer.js';
import { useAlgorithmTracking, useApp } from '../context/AppContext.jsx';
import { decisionGrid, KNN_STEPS, knnClassify, validateK } from '../algorithms/knn.js';
import { KNN_DATASETS } from '../data/datasets.js';
import { getTopic } from '../data/learningContent.js';
import { fmt, paren } from '../utils/format.js';

const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];
const STEP = { query: 0, distance: 1, sort: 2, neighbors: 3, vote: 4, predict: 5 };
const ACTIVE_FORMULAS = [[], ['distance'], ['distance'], ['distance'], ['vote'], ['vote']];
let nextId = 1;
const withIds = (pts) => pts.map((p) => ({ ...p, id: nextId++ }));

function pickMeta(d) {
  return { name: d.name, xLabel: d.xLabel, yLabel: d.yLabel, xDomain: d.xDomain, yDomain: d.yDomain, classes: d.classes };
}

export default function KNN({ embedded = false }) {
  const { markExplored } = useApp();
  const [datasetId, setDatasetId] = useState('simple');
  const [points, setPoints] = useState(() => withIds(KNN_DATASETS.simple.points));
  const [meta, setMeta] = useState(() => pickMeta(KNN_DATASETS.simple));
  const [query, setQuery] = useState(KNN_DATASETS.simple.query);
  const [k, setK] = useState(5);
  const [mode, setMode] = useState('query');
  const [addClass, setAddClass] = useState(KNN_DATASETS.simple.classes[0]);
  const [classified, setClassified] = useState(false);
  const [showRegions, setShowRegions] = useState(false);
  const [upload, setUpload] = useState(null);
  const [cols, setCols] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const dragging = useRef(false);
  const player = useStepPlayer(KNN_STEPS.length, { interval: 1800 });

  const classes = useMemo(() => {
    const found = [...new Set(points.map((p) => p.label))];
    return [...meta.classes, ...found.filter((c) => !meta.classes.includes(c))];
  }, [points, meta]);
  const classIndex = (label) => Math.max(0, classes.indexOf(label));
  const colorOf = (label) => COLORS[classIndex(label) % COLORS.length];

  const kError = validateK(k, points.length);
  // The classification is recomputed live when the query, K or points change.
  const result = useMemo(() => {
    if (!classified || kError) return null;
    try {
      return knnClassify(points, query, k);
    } catch {
      return null;
    }
  }, [classified, kError, points, query, k]);
  const step = result ? player.step : -1;
  const [searchParams, setSearchParams] = useSearchParams();
  useAlgorithmTracking('knn', 'KNN', Boolean(result) && step === STEP.predict);
  const tableHeaders = useMemo(() => [meta.xLabel, meta.yLabel, 'Class'], [meta]);
  const tableRows = useMemo(() => points.map((p) => [p.x, p.y, p.label]), [points]);

  const grid = useMemo(
    () => (result && showRegions && step >= STEP.predict ? decisionGrid(points, k, meta.xDomain, meta.yDomain, 44, 30) : []),
    [result, showRegions, step, points, k, meta],
  );

  function loadDataset(id) {
    const d = KNN_DATASETS[id];
    setDatasetId(id);
    setPoints(withIds(d.points));
    setMeta(pickMeta(d));
    setQuery(d.query);
    setAddClass(d.classes[0]);
    setClassified(false);
    setUpload(null);
    setNotice(null);
    setError(null);
    player.reset();
  }

  function applyColumns(u, c) {
    const { points: pts, skipped } = pointsFromColumns(u.rows, c.x, c.y, c.label);
    if (pts.length < 2) {
      setError('Fewer than 2 usable rows. Each row needs numeric X and Y values and a class label.');
      return;
    }
    const labels = [...new Set(pts.map((p) => p.label))].sort();
    if (labels.length > COLORS.length) {
      setError(`The label column has ${labels.length} different values. Choose a column with at most ${COLORS.length} classes.`);
      return;
    }
    const limited = pts.slice(0, 200);
    const xDomain = paddedDomain(limited.map((p) => p.x));
    const yDomain = paddedDomain(limited.map((p) => p.y));
    setCols(c);
    setPoints(withIds(limited));
    setMeta({ name: u.fileName, xLabel: u.headers[c.x], yLabel: u.headers[c.y], xDomain, yDomain, classes: labels });
    setQuery({ x: Number(((xDomain[0] + xDomain[1]) / 2).toFixed(2)), y: Number(((yDomain[0] + yDomain[1]) / 2).toFixed(2)) });
    setAddClass(labels[0]);
    setClassified(false);
    player.reset();
    setError(null);
    setNotice([skipped ? `${skipped} incomplete row(s) skipped.` : null, pts.length > 200 ? 'Only the first 200 rows are used.' : null].filter(Boolean).join(' ') || null);
  }

  function onUpload(u) {
    const { cols: c, error: err } = defaultColumns(u, true);
    if (err) {
      setError(err);
      return;
    }
    setUpload(u);
    setDatasetId('upload');
    applyColumns(u, c);
  }

  function clampToDomain(d) {
    return {
      x: Number(Math.min(meta.xDomain[1], Math.max(meta.xDomain[0], d.x)).toFixed(2)),
      y: Number(Math.min(meta.yDomain[1], Math.max(meta.yDomain[0], d.y)).toFixed(2)),
    };
  }

  function onPlotClick(d) {
    if (mode === 'query') setQuery(clampToDomain(d));
    else if (mode === 'add') setPoints((pts) => [...pts, { ...clampToDomain(d), label: addClass, id: nextId++ }]);
  }

  function onPointClick(id) {
    if (mode === 'remove') setPoints((pts) => pts.filter((p) => p.id !== id));
  }

  function classify() {
    const err = validateK(k, points.length);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setClassified(true);
    player.start(0, true);
    markExplored('knn', `Classified a point with KNN (K = ${k})`, '/knn', 'target');
  }

  // Demo mode: restore the two-class sample and start the walkthrough paused at step 1.
  function runDemo() {
    loadDataset('simple');
    setK(5);
    setClassified(true);
    player.start(0, false);
    markExplored('knn', 'Classified a point with KNN (K = 5)', '/knn', 'target');
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

  function setQueryField(key, value) {
    const v = Number(value);
    if (value === '' || !Number.isFinite(v)) return;
    setQuery((q) => ({ ...q, [key]: v }));
  }

  const neighborIds = new Set(result ? result.neighbors.map((n) => n.point.id) : []);
  const rankOf = new Map(result ? result.ranked.map((r) => [r.point.id, r.rank]) : []);
  const distOf = new Map(result ? result.distances.map((d) => [d.point.id, d.distance]) : []);

  return (
    <div className={embedded ? 'page page--embedded' : 'page'}>
      {!embedded && (
      <PageHeader
        icon="target"
        eyebrow="Algorithm · Supervised classification"
        title="K-Nearest Neighbors"
        subtitle="Classify a new point by measuring its distance to every labelled point and letting the K closest ones vote."
        actions={
          <ReportButton
            disabled={!result}
            getReport={() =>
              result && {
                algorithm: 'K-Nearest Neighbors',
                dataset: meta.name,
                parameters: { k, distance: 'Euclidean', query: `(${query.x}, ${query.y})`, labelledPoints: points.length },
                results: {
                  prediction: result.prediction,
                  neighbors: result.neighbors.map((n) => `${n.point.label} (${fmt(n.point.x)}, ${fmt(n.point.y)}) d=${fmt(n.distance, 3)}`),
                  tieBreak: result.tieNote,
                },
                metrics: Object.fromEntries(result.votes.map((v) => [`votes: ${v.label}`, v.count])),
              }
            }
          />
        }
      />
      )}
      {!embedded && <AlgorithmIntro guide={GUIDES.knn} onDemo={runDemo} />}
      {!result && (
        <GuideHint id="knn-start">
          Try the sample dataset: press <strong>Classify</strong>, then use <strong>Next step</strong> to see distances, neighbors and the vote.
        </GuideHint>
      )}

      <ConceptFlow
        label="KNN flow"
        active={step}
        stages={[
          { label: 'Query point', icon: 'target' },
          { label: 'Distances', icon: 'move' },
          { label: 'Sorted', icon: 'compare' },
          { label: 'K neighbors', icon: 'layers' },
          { label: 'Voting', icon: 'check' },
          { label: 'Prediction', icon: 'flag' },
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
            <select value={datasetId} onChange={(e) => (e.target.value === 'upload' ? applyColumns(upload, cols) : loadDataset(e.target.value))}>
              {Object.values(KNN_DATASETS).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              {upload && <option value="upload">Uploaded: {upload.fileName}</option>}
            </select>
          </label>
          <div className="toolbar__spacer" />
          <div className="field field--inline k-field">
            <label className="field__label" htmlFor="knn-k">
              K = <strong>{k}</strong>
            </label>
            <input id="knn-k" type="range" min={1} max={9} value={k} onChange={(e) => setK(Number(e.target.value))} aria-valuetext={`K equals ${k}`} />
          </div>
          <button type="button" className="btn btn--primary" onClick={classify}>
            <Icon name="target" size={16} /> Classify
          </button>
        </div>
        {upload && datasetId === 'upload' && cols && <ColumnPicker upload={upload} cols={cols} needLabel onChange={(c) => applyColumns(upload, c)} />}
        {k % 2 === 0 && classes.length === 2 && <p className="hint">Tip: with two classes an odd K avoids tied votes.</p>}
        {kError && points.length > 0 && <p className="error-text">{kError}</p>}
      </Card>

      <DatasetInfo
        name={meta.name}
        headers={tableHeaders}
        rows={tableRows}
        target="Class"
        onUpload={onUpload}
        onError={setError}
        onReset={() => loadDataset('simple')}
        downloadName="knn-data.csv"
        uploadHelp="Upload a CSV with two numerical feature columns and one class-label column."
      />

      <div className="viz-layout">
        <div className="viz-main">
          <Card
            title="Feature space"
            icon="target"
            subtitle={
              mode === 'query' ? 'Drag the ★ query point, or click anywhere to move it.' : mode === 'add' ? `Click to add a “${addClass}” training point.` : 'Click a point to remove it.'
            }
            actions={
              <Segmented
                size="sm"
                label="Interaction mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'query', label: 'Move query' },
                  { value: 'add', label: '+ Add points' },
                  { value: 'remove', label: '− Remove' },
                ]}
              />
            }
          >
            {mode === 'add' && (
              <div className="class-picker" role="radiogroup" aria-label="Class of new points">
                <span className="field__label">Class to add:</span>
                {classes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={addClass === c}
                    className={`class-chip ${addClass === c ? 'is-active' : ''}`}
                    style={{ '--c': colorOf(c) }}
                    onClick={() => setAddClass(c)}
                  >
                    <MarkerSwatch shape={classIndex(c)} color={colorOf(c)} /> {c}
                  </button>
                ))}
              </div>
            )}
            <ChartFrame
              xDomain={meta.xDomain}
              yDomain={meta.yDomain}
              xLabel={meta.xLabel}
              yLabel={meta.yLabel}
              onPlotClick={onPlotClick}
              cursor={mode === 'remove' ? 'default' : 'crosshair'}
              onPointerMove={(d) => dragging.current && setQuery(clampToDomain(d))}
              onPointerUp={() => {
                dragging.current = false;
              }}
              caption={
                result
                  ? `Step ${step + 1}: ${KNN_STEPS[step].title.toLowerCase()}. Query at (${fmt(query.x)}, ${fmt(query.y)}), K = ${k}.${step >= STEP.predict ? ` Predicted class: ${result.prediction}.` : ''}`
                  : `${points.length} labelled points in ${classes.length} classes (each class has its own marker shape) and one query point (★).`
              }
              ariaLabel={`KNN plot with ${points.length} labelled points and a query point at (${fmt(query.x)}, ${fmt(query.y)})${result && step >= STEP.predict ? `, predicted ${result.prediction}` : ''}`}
              background={({ sx, sy }) =>
                grid.map((c, i) => (
                  <rect
                    key={i}
                    className="region-cell"
                    x={sx(c.x0)}
                    y={sy(c.y0 + c.h)}
                    width={Math.abs(sx(c.x0 + c.w) - sx(c.x0)) + 0.5}
                    height={Math.abs(sy(c.y0) - sy(c.y0 + c.h)) + 0.5}
                    style={{ fill: colorOf(c.label) }}
                  />
                ))
              }
            >
              {({ sx, sy }) => (
                <g>
                  {result && step >= STEP.distance &&
                    result.distances.map((d) => {
                      const isN = neighborIds.has(d.point.id);
                      if (step >= STEP.neighbors && !isN) return null;
                      return (
                        <line
                          key={`l${d.point.id}`}
                          className={`dist-line ${step >= STEP.neighbors ? 'is-neighbor' : ''}`}
                          x1={sx(query.x)}
                          y1={sy(query.y)}
                          x2={sx(d.point.x)}
                          y2={sy(d.point.y)}
                          style={step >= STEP.vote ? { stroke: colorOf(d.point.label) } : undefined}
                        />
                      );
                    })}
                  {result && step === STEP.distance &&
                    result.distances.map((d) => (
                      <text key={`dl${d.point.id}`} className="dist-label" x={(sx(query.x) + sx(d.point.x)) / 2} y={(sy(query.y) + sy(d.point.y)) / 2 - 3} textAnchor="middle">
                        {fmt(d.distance, 1)}
                      </text>
                    ))}
                  {result && step >= STEP.neighbors && (
                    <ellipse
                      className="radius-ring"
                      cx={sx(query.x)}
                      cy={sy(query.y)}
                      rx={Math.abs(sx(query.x + result.radius) - sx(query.x))}
                      ry={Math.abs(sy(query.y + result.radius) - sy(query.y))}
                    />
                  )}
                  {points.map((p) => {
                    const isN = neighborIds.has(p.id) && step >= STEP.neighbors;
                    const dim = result && step >= STEP.neighbors && !neighborIds.has(p.id);
                    const rank = rankOf.get(p.id);
                    return (
                      <g key={p.id}>
                        <Marker
                          x={sx(p.x)}
                          y={sy(p.y)}
                          r={isN ? 7.5 : 6}
                          shape={classIndex(p.label)}
                          className={`pt ${isN ? 'is-neighbor' : ''} ${dim ? 'is-dim' : ''} ${mode === 'remove' ? 'is-removable' : ''}`}
                          style={{ fill: colorOf(p.label) }}
                          onClick={() => onPointClick(p.id)}
                          title={`${p.label} (${fmt(p.x)}, ${fmt(p.y)})${result ? ` · distance ${fmt(distOf.get(p.id), 3)} · rank ${rank}` : ''}`}
                        />
                        {result && (step === STEP.sort || step === STEP.neighbors) && rank <= Math.max(k, 6) && (
                          <text className="rank-label" x={sx(p.x) + 9} y={sy(p.y) - 9}>
                            #{rank}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <g
                    className={`query ${mode === 'query' ? 'is-draggable' : ''} ${step === STEP.query ? 'is-focus' : ''}`}
                    transform={`translate(${sx(query.x)} ${sy(query.y)})`}
                    onPointerDown={(e) => {
                      if (mode !== 'query') return;
                      e.preventDefault();
                      dragging.current = true;
                    }}
                  >
                    <circle r={16} className="query__halo" />
                    {step === STEP.query && <circle r={24} className="query__pulse" />}
                    <path
                      d="M0,-10 L2.9,-3.1 10,-3.1 4.3,1.3 6.5,8.5 0,4.3 -6.5,8.5 -4.3,1.3 -10,-3.1 -2.9,-3.1Z"
                      className="query__star"
                      style={result && step >= STEP.predict ? { fill: colorOf(result.prediction) } : undefined}
                    />
                    <title>{`Query point (${fmt(query.x)}, ${fmt(query.y)})`}</title>
                  </g>
                  {result && step >= STEP.predict && (
                    <text className="guide-label guide-label--strong" x={sx(query.x) + 16} y={sy(query.y) - 14}>
                      → {result.prediction}
                    </text>
                  )}
                </g>
              )}
            </ChartFrame>
            <div className="chart-footer">
              <Legend items={[...classes.map((c) => ({ label: c, color: colorOf(c), marker: classIndex(c) })), { label: 'Query point', color: 'var(--text)', shape: 'star' }]} />
              <div className="inline-form">
                <span className="field__label">Query</span>
                <input type="number" step="any" aria-label="Query x" value={query.x} onChange={(e) => setQueryField('x', e.target.value)} />
                <input type="number" step="any" aria-label="Query y" value={query.y} onChange={(e) => setQueryField('y', e.target.value)} />
                <label className="check check--sm">
                  <input type="checkbox" checked={showRegions} onChange={(e) => setShowRegions(e.target.checked)} />
                  <span>Decision regions</span>
                </label>
              </div>
            </div>
          </Card>
        </div>
        <aside className="viz-side">
          <ExplainStep explanation={result ? knnStep(result, step, k) : IDLE_EXPLANATIONS.knn} stepLabel={result ? `Step ${step + 1} of ${KNN_STEPS.length}` : 'Not started'} />
          <KnnExplanation result={result} step={step} k={k} colorOf={colorOf} classIndex={classIndex} />
        </aside>
      </div>

      <Card>
        <StepController player={player} steps={KNN_STEPS} disabled={!result} emptyText="Press “Classify” to start the walkthrough" />
        {result && <VoteSummary result={result} k={k} step={step} />}
        {result && <p className="hint">The classification updates live - drag the query point or change K and watch the neighbors change.</p>}
      </Card>

      <DistanceTable points={points} result={result} step={step} k={k} colorOf={colorOf} classIndex={classIndex} />

      <ResultCard
        algorithm="K-Nearest Neighbors"
        emptyText="Press “Classify” and step to the prediction to see the result."
        final={result && step >= STEP.predict ? ['Final prediction', result.prediction] : null}
        rows={
          result
            ? [
                ['K value', k],
                ['Query point', `(${fmt(query.x)}, ${fmt(query.y)})`],
                ['Nearest neighbors', result.neighbors.length],
                ...result.votes.map((v) => [`${v.label} votes`, v.count]),
                ['Distance to farthest neighbor', fmt(result.radius, 3)],
              ]
            : []
        }
      >
        {result?.tieNote && <p className="hint">{result.tieNote}</p>}
      </ResultCard>


      {!embedded && (
        <>
          <FormulaPanel algorithm="knn" active={result ? ACTIVE_FORMULAS[step] : []} />
          <KeyTakeaways items={GUIDES.knn.takeaways} />
          <LearningPanel topic={getTopic('knn')} compact />
        </>
      )}
    </div>
  );
}

function VoteSummary({ result, k, step }) {
  if (step < STEP.vote) return null;
  return (
    <p className="vote-summary" aria-live="polite">
      <span>
        K = <strong>{k}</strong>
      </span>
      {result.votes.map((v) => (
        <span key={v.label}>
          {v.label} = <strong>{v.count}</strong> vote{v.count === 1 ? '' : 's'}
        </span>
      ))}
      {step >= STEP.predict && (
        <span className="vote-summary__result">
          Prediction = <strong>{result.prediction}</strong>
        </span>
      )}
    </p>
  );
}

/** Point | Distance | Class - unsorted while distances are computed, sorted from step 3, neighbors marked from step 4. */
function DistanceTable({ points, result, step, k, colorOf, classIndex }) {
  const sorted = result && step >= STEP.sort;
  const rows = result ? (sorted ? result.ranked : result.distances.map((d) => ({ ...d, rank: result.ranked.find((r) => r.point.id === d.point.id).rank }))) : points.map((p) => ({ point: p }));
  const showDist = result && step >= STEP.distance;
  return (
    <Card
      title="Distance table"
      icon="table"
      subtitle={
        !result
          ? 'Distances appear once you press “Classify”.'
          : sorted
            ? `Sorted from nearest to farthest${step >= STEP.neighbors ? ` - the top ${k} are the neighbors` : ''}.`
            : step >= STEP.distance
              ? 'Distances in the original order of the points.'
              : 'Next step: calculate the distances.'
      }
    >
      <div className="table-wrap table-wrap--scroll">
        <table className="data-table">
          <thead>
            <tr>
              {sorted && <th scope="col">Rank</th>}
              <th scope="col">Point</th>
              <th scope="col">Distance</th>
              <th scope="col">Class</th>
              <th scope="col">
                <span className="sr-only">Status</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isNeighbor = result && step >= STEP.neighbors && r.rank <= k;
              return (
                <tr key={r.point.id} className={isNeighbor ? 'row--highlight' : result && step >= STEP.neighbors ? 'row--muted' : ''}>
                  {sorted && <td>{r.rank}</td>}
                  <td>
                    ({fmt(r.point.x)}, {fmt(r.point.y)})
                  </td>
                  <td>{showDist ? fmt(r.distance, 3) : '—'}</td>
                  <td>
                    <span className="class-cell">
                      <MarkerSwatch shape={classIndex(r.point.label)} color={colorOf(r.point.label)} /> {r.point.label}
                    </span>
                  </td>
                  <td>{isNeighbor && <span className="badge badge--accent">neighbor</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function KnnExplanation({ result, step, k, colorOf, classIndex }) {
  if (!result) {
    return (
      <Card title="How it works" icon="book">
        <ol className="plain-steps">
          {KNN_STEPS.map((s) => (
            <li key={s.id}>{s.title}</li>
          ))}
        </ol>
        <p className="muted small">Place the query point, choose K and press “Classify”.</p>
      </Card>
    );
  }
  const q = result.query;
  const nearest = result.ranked[0];
  const maxVotes = Math.max(...result.votes.map((v) => v.count));
  const body = [
    <>
      <p>
        The star is the <strong>query point</strong> at ({fmt(q.x)}, {fmt(q.y)}). Its class is unknown - KNN will decide it using the {result.distances.length}{' '}
        labelled points around it.
      </p>
      <p className="muted small">Drag it or type new coordinates at any time.</p>
    </>,
    <>
      <p>Measure the straight-line distance from the query to every labelled point (the labels on the lines).</p>
      <Formula>d = √((x − x_q)² + (y − y_q)²)</Formula>
      <p className="muted small">Example - the point ({fmt(nearest.point.x)}, {fmt(nearest.point.y)}):</p>
      <Formula>
        √(({fmt(nearest.point.x)} − {paren(q.x)})² + ({fmt(nearest.point.y)} − {paren(q.y)})²) = √({fmt(nearest.dx ** 2, 3)} + {fmt(nearest.dy ** 2, 3)}) ={' '}
        <strong>{fmt(nearest.distance, 3)}</strong>
      </Formula>
    </>,
    <>
      <p>Sort all points from nearest to farthest. The rank numbers (#1, #2, …) appear on the chart and in the distance table.</p>
      <p>
        Nearest: <strong>{nearest.point.label}</strong> at distance {fmt(nearest.distance, 3)}.
      </p>
    </>,
    <>
      <p>
        Keep only the <strong>K = {k}</strong> nearest. The ring's radius is the distance to the {k === 1 ? 'nearest' : `${k}th nearest`} neighbor (
        {fmt(result.radius, 3)}); everything outside is ignored.
      </p>
    </>,
    <>
      <p>Each neighbor casts one vote for its own class.</p>
      <VoteBars votes={result.votes} k={k} colorOf={colorOf} classIndex={classIndex} />
    </>,
    <>
      <VoteBars votes={result.votes} k={k} colorOf={colorOf} classIndex={classIndex} />
      <div className="decision" style={{ '--c': colorOf(result.prediction) }}>
        <span>Prediction</span>
        <strong>{result.prediction}</strong>
        <span className="muted small">
          {maxVotes} of {k} votes
        </span>
      </div>
      {result.tieNote && <Alert type="warning">{result.tieNote}</Alert>}
      <p className="muted small">Tick “Decision regions” below the chart to see the prediction for every location.</p>
    </>,
  ];
  return (
    <Card title="Calculation details" subtitle={`Step ${step + 1}: ${KNN_STEPS[step].title}`} icon="spark" className="step-explain" key={step}>
      {body[step]}
    </Card>
  );
}

function VoteBars({ votes, k, colorOf, classIndex }) {
  return (
    <div className="vote-bars">
      {votes.map((v) => (
        <div key={v.label} className="vote-bar">
          <span className="vote-bar__label">
            <MarkerSwatch shape={classIndex(v.label)} color={colorOf(v.label)} /> {v.label}
          </span>
          <div className="vote-bar__track">
            <span className="vote-bar__fill" style={{ width: `${(v.count / k) * 100}%`, background: colorOf(v.label) }} />
          </div>
          <span className="vote-bar__count">
            {v.count} vote{v.count === 1 ? '' : 's'}
          </span>
        </div>
      ))}
    </div>
  );
}
