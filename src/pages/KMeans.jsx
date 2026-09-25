import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ChartFrame, { paddedDomain } from '../components/ChartFrame.jsx';
import StepController from '../components/StepController.jsx';
import ConceptFlow from '../components/ConceptFlow.jsx';
import ReportButton from '../components/ReportButton.jsx';
import LearningPanel from '../components/LearningPanel.jsx';
import Marker, { MarkerSwatch } from '../components/Marker.jsx';
import MetricsCard from '../components/MetricsCard.jsx';
import DatasetInfo from '../components/DatasetInfo.jsx';
import ExplainStep from '../components/ExplainStep.jsx';
import FormulaPanel from '../components/FormulaPanel.jsx';
import { AlgorithmIntro, GuideHint, KeyTakeaways, ResultCard } from '../components/AlgorithmSections.jsx';
import { GUIDES } from '../data/algorithmGuides.js';
import { IDLE_EXPLANATIONS, kmeansStep } from '../data/stepExplanations.js';
import ColumnPicker, { defaultColumns, pointsFromColumns } from '../components/ColumnPicker.jsx';
import { LineChart } from '../components/MiniCharts.jsx';
import { Alert, Card, Formula, Legend, PageHeader, Segmented } from '../components/ui.jsx';
import { useStepPlayer } from '../hooks/useStepPlayer.js';
import { useAlgorithmTracking, useApp } from '../context/AppContext.jsx';
import { distance, KMEANS_PHASES, runKMeans } from '../algorithms/kmeans.js';
import { CLUSTER_DATASETS, randomClusterPoints } from '../data/datasets.js';
import { getTopic } from '../data/learningContent.js';
import { randomSeed } from '../utils/random.js';
import { fmt, paren } from '../utils/format.js';
import { friendlyError } from '../utils/errors.js';

const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
const FLOW_STAGE = { init: 1, distance: 2, assign: 2, update: 3, converged: 4 };
const ACTIVE_FORMULAS = { init: [], distance: ['distance'], assign: ['distance'], update: ['mean'], converged: [] };
let nextId = 1;
const withIds = (pts) => pts.map((p) => ({ ...p, id: nextId++ }));

function phaseLabel(s) {
  if (s.phase === 'init') return 'Initialize centroids';
  if (s.phase === 'distance') return 'Calculate distances';
  if (s.phase === 'assign') return s.iteration === 1 ? 'Assign clusters' : 'Reassign clusters';
  if (s.phase === 'update') return s.iteration === 1 ? 'Recalculate centroids' : 'Move centroids';
  return s.converged ? 'Converged' : 'Stopped (iteration limit)';
}

function stateTitle(s) {
  if (s.phase === 'init') return 'Iteration 1 · Initialize centroids';
  if (s.phase === 'converged') return s.converged ? `Converged after ${s.iteration} iteration${s.iteration === 1 ? '' : 's'}` : `Stopped at the iteration limit (${s.iteration})`;
  return `Iteration ${s.iteration} · ${KMEANS_PHASES[s.phase]}`;
}

export default function KMeans({ embedded = false }) {
  const { markExplored } = useApp();
  const base = CLUSTER_DATASETS.customers;
  const baseMeta = { xLabel: base.xLabel, yLabel: base.yLabel, xDomain: base.xDomain, yDomain: base.yDomain, name: base.name };
  const [points, setPoints] = useState(() => withIds(base.points));
  const [meta, setMeta] = useState(baseMeta);
  const [k, setK] = useState(3);
  const [method, setMethod] = useState('random');
  const [seed, setSeed] = useState(7);
  const [run, setRun] = useState(null);
  const [inspect, setInspect] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [upload, setUpload] = useState(null);
  const [cols, setCols] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const states = run?.states || [];
  const player = useStepPlayer(states.length, { interval: 1500 });
  const state = run ? states[player.step] : null;
  const steps = useMemo(() => states.map((s, i) => ({ id: i, title: stateTitle(s), description: phaseDescription(s) })), [states]);
  const [searchParams, setSearchParams] = useSearchParams();
  useAlgorithmTracking('kmeans', 'K-Means', Boolean(run) && player.isLast);
  const tableHeaders = useMemo(() => [meta.xLabel, meta.yLabel], [meta]);
  const tableRows = useMemo(() => points.map((p) => [p.x, p.y]), [points]);

  function invalidate() {
    setRun(null);
    player.reset();
  }

  function compute(pts = points, clusters = k) {
    try {
      const r = runKMeans(pts, clusters, { seed, method });
      setRun(r);
      setError(null);
      if (!inspect || !pts.some((p) => p.id === inspect)) setInspect(pts[0]?.id ?? null);
      markExplored('kmeans', `Ran K-Means with K = ${clusters}`, '/kmeans', 'cluster');
      return r;
    } catch (err) {
      setError(friendlyError(err));
      setRun(null);
      return null;
    }
  }

  // Step: advance one state (computing the run first if needed).
  function stepOnce() {
    if (!run) {
      if (compute()) player.start(0, false);
      return;
    }
    player.pause();
    player.next();
  }

  // Run: animate automatically from the current state (or from the start).
  function runAuto() {
    if (!run) {
      if (compute()) player.start(0, true);
      return;
    }
    player.play();
  }

  // Demo mode: restore the customer sample with K = 3 and start paused at step 1.
  function runDemo() {
    const pts = withIds(base.points);
    setPoints(pts);
    setMeta(baseMeta);
    setUpload(null);
    setNotice(null);
    setK(3);
    if (compute(pts, 3)) player.start(0, false);
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

  function setData(pts, m) {
    setPoints(withIds(pts));
    setMeta(m);
    setUpload(null);
    setNotice(null);
    setError(null);
    invalidate();
  }

  function applyColumns(u, c) {
    const { points: pts, skipped } = pointsFromColumns(u.rows, c.x, c.y);
    if (pts.length < 2) {
      setError('Fewer than 2 rows have numeric values in both chosen columns.');
      return;
    }
    const limited = pts.slice(0, 300);
    setCols(c);
    setPoints(withIds(limited));
    setMeta({
      xLabel: u.headers[c.x],
      yLabel: u.headers[c.y],
      xDomain: paddedDomain(limited.map((p) => p.x)),
      yDomain: paddedDomain(limited.map((p) => p.y)),
      name: u.fileName,
    });
    setError(null);
    setNotice([skipped ? `${skipped} incomplete row(s) skipped.` : null, pts.length > 300 ? 'Only the first 300 points are used.' : null].filter(Boolean).join(' ') || null);
    invalidate();
  }

  function onUpload(u) {
    const { cols: c, error: err } = defaultColumns(u);
    if (err) {
      setError(err);
      return;
    }
    setUpload(u);
    applyColumns(u, c);
  }

  function onPlotClick(d) {
    if (!addMode) return;
    setPoints((pts) => [...pts, { x: Number(d.x.toFixed(1)), y: Number(d.y.toFixed(1)), id: nextId++ }]);
    invalidate();
  }

  // Centroid trails: every distinct centroid position up to the current state.
  const trails = useMemo(() => {
    if (!run) return [];
    const upto = states.slice(0, player.step + 1);
    return Array.from({ length: k }, (_, c) => {
      const pts = [];
      upto.forEach((s) => {
        const p = s.centroids[c];
        if (p && (pts.length === 0 || pts[pts.length - 1].x !== p.x || pts[pts.length - 1].y !== p.y)) pts.push(p);
      });
      return pts;
    });
  }, [run, states, player.step, k]);

  const inertiaData = useMemo(() => states.filter((s) => s.phase === 'assign').map((s) => ({ iteration: s.iteration, inertia: s.inertia })), [states]);
  const assignments = state?.assignments;
  const inspectIdx = points.findIndex((p) => p.id === inspect);
  const inspectPoint = points[inspectIdx];
  const final = states[states.length - 1];
  const lastInertia = [...states.slice(0, player.step + 1)].reverse().find((s) => Number.isFinite(s.inertia))?.inertia ?? null;

  return (
    <div className={embedded ? 'page page--embedded' : 'page'}>
      {!embedded && (
      <PageHeader
        icon="cluster"
        eyebrow="Algorithm · Unsupervised clustering"
        title="K-Means Clustering"
        subtitle="Group unlabeled points into K clusters: assign each point to its nearest centroid, move centroids to the mean, repeat until nothing changes."
        actions={
          <ReportButton
            disabled={!run}
            getReport={() =>
              run && {
                algorithm: 'K-Means Clustering',
                dataset: meta.name,
                parameters: { k, initialization: method, seed, points: points.length },
                results: {
                  converged: run.converged,
                  iterations: run.iterations,
                  centroids: final.centroids.map((c, i) => `C${i + 1} (${fmt(c.x, 3)}, ${fmt(c.y, 3)}) · ${final.sizes[i]} points`),
                },
                metrics: { inertia: final.inertia, ...Object.fromEntries(inertiaData.map((d) => [`inertia after iteration ${d.iteration}`, d.inertia])) },
              }
            }
          />
        }
      />
      )}
      {!embedded && <AlgorithmIntro guide={GUIDES.kmeans} onDemo={runDemo} />}
      {!run && (
        <GuideHint id="kmeans-start">
          Try the customer sample: press <strong>Step</strong> to move one stage at a time, or <strong>Run</strong> to watch the centroids settle.
        </GuideHint>
      )}

      <ConceptFlow
        label="K-Means flow"
        active={state ? (state.phase === 'converged' ? 5 : FLOW_STAGE[state.phase]) : points.length ? 0 : -1}
        stages={[
          { label: 'Points', icon: 'table' },
          { label: 'Centroids', icon: 'target' },
          { label: 'Assignment', icon: 'cluster' },
          { label: 'Recalculation', icon: 'move' },
          { label: 'Convergence', icon: 'check' },
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
          <div className="field field--inline">
            <span className="field__label">Clusters</span>
            <Segmented
              label="Number of clusters K"
              value={k}
              onChange={(v) => {
                setK(v);
                invalidate();
              }}
              options={[2, 3, 4, 5].map((v) => ({ value: v, label: `K = ${v}` }))}
            />
          </div>
          <label className="field field--inline">
            <span className="field__label">Initialization</span>
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                invalidate();
              }}
            >
              <option value="random">Random points</option>
              <option value="kmeans++">K-Means++</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setSeed(randomSeed());
              invalidate();
            }}
            title="Choose different starting centroids"
          >
            <Icon name="shuffle" size={16} /> New start
          </button>
          <div className="toolbar__spacer" />
          <div className="btn-row">
            <button type="button" className="btn btn--secondary" onClick={stepOnce} disabled={Boolean(run) && player.isLast}>
              <Icon name="next" size={16} /> Step
            </button>
            <button type="button" className="btn btn--primary" onClick={runAuto} disabled={player.playing}>
              <Icon name="play" size={16} /> Run
            </button>
            <button type="button" className="btn btn--secondary" onClick={player.pause} disabled={!player.playing}>
              <Icon name="pause" size={16} /> Pause
            </button>
            <button type="button" className="btn btn--secondary" onClick={player.reset} disabled={!run}>
              <Icon name="reset" size={16} /> Reset
            </button>
          </div>
        </div>
      </Card>

      <DatasetInfo
        name={meta.name}
        headers={tableHeaders}
        rows={tableRows}
        targetNote="None - K-Means is unsupervised, so the data has no labels"
        onUpload={onUpload}
        onError={setError}
        onReset={() => setData(base.points, baseMeta)}
        downloadName="kmeans-data.csv"
        uploadHelp="Upload a CSV with at least two numerical columns, then choose the X and Y columns."
      />

      <div className="viz-layout">
        <div className="viz-main">
          <Card
            title={state ? stateTitle(state) : meta.name}
            icon="cluster"
            subtitle={addMode ? 'Click the graph to add points.' : 'Click a point to inspect its distances.'}
            actions={
              <div className="btn-row">
                <button type="button" className={`btn btn--sm ${addMode ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setAddMode((a) => !a)} aria-pressed={addMode}>
                  <Icon name="plus" size={14} /> Add points
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setData(randomClusterPoints(randomSeed(), 45), { ...baseMeta, name: 'Random points' })}>
                  <Icon name="dice" size={14} /> Random
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setData(base.points, baseMeta)}>
                  <Icon name="reset" size={14} /> Reset data
                </button>
              </div>
            }
          >
            {upload && cols && <ColumnPicker upload={upload} cols={cols} onChange={(c) => applyColumns(upload, c)} />}
            <ChartFrame
              xDomain={meta.xDomain}
              yDomain={meta.yDomain}
              xLabel={meta.xLabel}
              yLabel={meta.yLabel}
              onPlotClick={onPlotClick}
              cursor={addMode ? 'crosshair' : 'default'}
              caption={
                state
                  ? `${stateTitle(state)}. ${points.length} points, K = ${k}. Each cluster has its own marker shape; numbered diamonds are the centroids.`
                  : `${points.length} unlabeled points (grey). Press Step or Run to cluster them into ${k} groups.`
              }
              ariaLabel={`K-Means plot with ${points.length} points and K = ${k}${state ? `, ${stateTitle(state)}` : ''}`}
            >
              {({ sx, sy }) => (
                <g>
                  {state?.phase === 'distance' &&
                    points.map((p, i) =>
                      state.centroids.map((c, ci) => (
                        <line
                          key={`d${p.id}-${ci}`}
                          className={`dist-line dist-line--faint ${i === inspectIdx ? 'is-inspect' : ''}`}
                          x1={sx(p.x)}
                          y1={sy(p.y)}
                          x2={sx(c.x)}
                          y2={sy(c.y)}
                          style={i === inspectIdx ? { stroke: COLORS[ci] } : undefined}
                        />
                      )),
                    )}
                  {state?.phase === 'distance' &&
                    inspectPoint &&
                    state.centroids.map((c, ci) => (
                      <text key={`dl${ci}`} className="guide-label" x={(sx(inspectPoint.x) + sx(c.x)) / 2 + 4} y={(sy(inspectPoint.y) + sy(c.y)) / 2 - 4}>
                        {fmt(state.distances[inspectIdx][ci], 1)}
                      </text>
                    ))}
                  {(state?.phase === 'assign' || state?.phase === 'converged') &&
                    points.map((p, i) => {
                      const c = state.centroids[assignments[i]];
                      return <line key={`s${p.id}`} className="spoke" x1={sx(p.x)} y1={sy(p.y)} x2={sx(c.x)} y2={sy(c.y)} style={{ stroke: COLORS[assignments[i]] }} />;
                    })}
                  {trails.map((t, ci) =>
                    t.length > 1 ? <polyline key={`t${ci}`} className="trail" points={t.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} style={{ stroke: COLORS[ci] }} /> : null,
                  )}
                  {points.map((p, i) => {
                    const a = assignments ? assignments[i] : null;
                    return (
                      <Marker
                        key={p.id}
                        x={sx(p.x)}
                        y={sy(p.y)}
                        r={p.id === inspect ? 7 : 5.5}
                        shape={a === null ? 'circle' : a}
                        className={`pt pt--cluster ${p.id === inspect ? 'is-inspect' : ''}`}
                        style={{ fill: a === null ? 'var(--point-neutral)' : COLORS[a] }}
                        onClick={() => setInspect(p.id)}
                        title={`(${fmt(p.x)}, ${fmt(p.y)})${a !== null ? ` · cluster ${a + 1}` : ' · not assigned yet'}`}
                      />
                    );
                  })}
                  {state?.centroids.map((c, ci) => (
                    <g key={`c${ci}`} className="centroid" style={{ transform: `translate(${sx(c.x)}px, ${sy(c.y)}px)` }}>
                      <rect x={-9} y={-9} width={18} height={18} rx={3} transform="rotate(45)" style={{ fill: COLORS[ci] }} />
                      <text y={4} textAnchor="middle" className="centroid__label">
                        {ci + 1}
                      </text>
                      <title>{`Centroid ${ci + 1}: (${fmt(c.x, 2)}, ${fmt(c.y, 2)})`}</title>
                    </g>
                  ))}
                </g>
              )}
            </ChartFrame>
            <div className="chart-footer">
              <Legend
                items={[
                  ...Array.from({ length: k }, (_, i) => ({ label: `Cluster ${i + 1}`, color: COLORS[i], marker: i })),
                  { label: 'Centroid (numbered)', color: 'var(--text)', shape: 'diamond' },
                  { label: 'Unassigned', color: 'var(--point-neutral)' },
                ]}
              />
            </div>
          </Card>
        </div>
        <aside className="viz-side">
          <ExplainStep explanation={state ? kmeansStep(state, k) : IDLE_EXPLANATIONS.kmeans} stepLabel={state ? `Step ${player.step + 1} of ${states.length}` : 'Not started'} />
          <PhaseExplanation state={state} k={k} method={method} points={points} inspectIdx={inspectIdx} />
          <IterationLog states={states} current={player.step} onJump={(i) => {
            player.pause();
            player.goTo(i);
          }} />
        </aside>
      </div>

      <Card>
        <StepController player={player} steps={steps} disabled={!run} compact emptyText="Press “Step” or “Run” to start" />
      </Card>

      <div className="stats-grid">
        <MetricsCard label="Current iteration" value={state ? Math.max(1, state.iteration) : null} icon={<Icon name="reset" size={16} />} />
        <MetricsCard
          label="Total iterations"
          value={run && player.isLast ? run.iterations : null}
          footer={run && player.isLast ? <span className="muted">{final.converged ? 'converged' : 'hit the limit'}</span> : <span className="muted">shown at the end</span>}
        />
        <MetricsCard
          label="Inertia (SSE)"
          value={lastInertia}
          format={(v) => fmt(v, 1)}
          hint="Sum of squared distances from each point to its assigned centroid. K-Means tries to make this as small as possible."
        />
      </div>

      <ResultCard
        algorithm="K-Means Clustering"
        emptyText="Run K-Means to the end (or jump to “Result” in the iteration log) to see the result."
        final={run && player.isLast ? ['Final clusters', `${k} clusters of ${final.sizes.join(', ')} points`] : null}
        rows={
          run
            ? [
                ['K value', k],
                ['Initialization', method === 'kmeans++' ? 'K-Means++' : 'Random data points'],
                ['Iterations', `${run.iterations} (${run.converged ? 'converged' : 'iteration limit reached'})`],
                ['Final inertia (SSE)', fmt(final.inertia, 1)],
                ...final.centroids.map((c, i) => [`Centroid ${i + 1}`, `(${fmt(c.x, 2)}, ${fmt(c.y, 2)})`]),
              ]
            : []
        }
      />

      <AssignmentTable points={points} state={state} inspect={inspect} onInspect={setInspect} meta={meta} />

      <div className="grid-2">
        <Card title="Inertia per iteration" icon="trend" subtitle="It never increases - each step can only tighten the clusters.">
          {inertiaData.length > 0 ? (
            <LineChart
              data={inertiaData}
              xKey="iteration"
              series={[{ key: 'inertia', label: 'Inertia', color: 'var(--accent)' }]}
              xDomain={[1, Math.max(2, inertiaData.length)]}
              yDomain={[0, paddedDomain(inertiaData.map((d) => d.inertia))[1]]}
              xLabel="Iteration"
              yLabel="Inertia"
              highlightX={state && state.iteration > 0 ? state.iteration : undefined}
              valueFormat={(v, key) => (key === 'iteration' ? v : fmt(v, 1))}
              ariaLabel="Inertia after each iteration"
            />
          ) : (
            <p className="muted">Run K-Means to see how the inertia drops.</p>
          )}
        </Card>
        <Card title="Final centroids" icon="flag">
          {run && player.isLast ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Cluster</th>
                    <th scope="col">{meta.xLabel}</th>
                    <th scope="col">{meta.yLabel}</th>
                    <th scope="col">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {final.centroids.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <span className="class-cell">
                          <MarkerSwatch shape={i} color={COLORS[i]} /> Cluster {i + 1}
                        </span>
                      </td>
                      <td>{fmt(c.x, 2)}</td>
                      <td>{fmt(c.y, 2)}</td>
                      <td>{final.sizes[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Shown when the algorithm finishes.</p>
          )}
        </Card>
      </div>


      {!embedded && (
        <>
          <FormulaPanel algorithm="kmeans" active={state ? ACTIVE_FORMULAS[state.phase] : []} />
          <KeyTakeaways items={GUIDES.kmeans.takeaways} />
          <LearningPanel topic={getTopic('kmeans')} compact />
        </>
      )}
    </div>
  );
}

function phaseDescription(s) {
  switch (s.phase) {
    case 'init':
      return 'Place K starting centroids.';
    case 'distance':
      return 'Measure the distance from every point to every centroid.';
    case 'assign':
      return `Each point joins its nearest centroid (${s.changed} point${s.changed === 1 ? '' : 's'} ${s.iteration === 1 ? 'assigned' : 'changed'}).`;
    case 'update':
      return 'Move each centroid to the mean of its points.';
    default:
      return 'No point changes cluster any more.';
  }
}

/** Iteration 1 → Initialize → Distances → Assign → Recalculate, Iteration 2 → … */
function IterationLog({ states, current, onJump }) {
  if (!states.length) return null;
  const groups = [];
  states.forEach((s, i) => {
    const iter = s.phase === 'init' ? 1 : s.phase === 'converged' ? null : s.iteration;
    if (iter === null) {
      groups.push({ label: 'Result', items: [{ s, i }] });
      return;
    }
    let g = groups.find((x) => x.iter === iter);
    if (!g) {
      g = { iter, label: `Iteration ${iter}`, items: [] };
      groups.push(g);
    }
    g.items.push({ s, i });
  });
  return (
    <Card title="Iteration log" icon="clock" subtitle="Click any step to jump to it.">
      <ol className="iter-log">
        {groups.map((g) => (
          <li key={g.label}>
            <span className="iter-log__title">{g.label}</span>
            <ol>
              {g.items.map(({ s, i }) => (
                <li key={i}>
                  <button type="button" className={`iter-log__item ${i === current ? 'is-current' : ''} ${i < current ? 'is-done' : ''}`} onClick={() => onJump(i)} aria-current={i === current ? 'step' : undefined}>
                    → {phaseLabel(s)}
                    {s.phase === 'assign' && <span className="muted small"> ({s.changed} changed)</span>}
                  </button>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Distance from every point to every current centroid, and its cluster. */
function AssignmentTable({ points, state, inspect, onInspect, meta }) {
  if (!state) {
    return (
      <Card title="Distance calculations & cluster assignments" icon="table">
        <p className="muted">Start the algorithm to see the distance from every point to every centroid.</p>
      </Card>
    );
  }
  const centroids = state.centroids;
  const dists = state.distances || points.map((p) => centroids.map((c) => distance(p, c)));
  return (
    <Card
      title="Distance calculations & cluster assignments"
      icon="table"
      subtitle={`Distances to the ${state.phase === 'update' ? 'new ' : ''}centroids · the smallest distance in each row is bold. Click a row to inspect that point.`}
    >
      <div className="table-wrap table-wrap--scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Point ({meta.xLabel.split(' ')[0]}, {meta.yLabel.split(' ')[0]})</th>
              {centroids.map((c, i) => (
                <th scope="col" key={i}>
                  <span className="class-cell">
                    <MarkerSwatch shape={i} color={COLORS[i]} /> d(C{i + 1})
                  </span>
                </th>
              ))}
              <th scope="col">Cluster</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => {
              const row = dists[i];
              const nearest = row.indexOf(Math.min(...row));
              const a = state.assignments ? state.assignments[i] : null;
              return (
                <tr key={p.id} className={p.id === inspect ? 'row--highlight' : ''} onClick={() => onInspect(p.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    ({fmt(p.x)}, {fmt(p.y)})
                  </td>
                  {row.map((d, ci) => (
                    <td key={ci} className={ci === nearest ? 'td--strong' : ''}>
                      {fmt(d, 2)}
                    </td>
                  ))}
                  <td>
                    {a === null ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className="class-cell">
                        <MarkerSwatch shape={a} color={COLORS[a]} /> {a + 1}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PhaseExplanation({ state, k, method, points, inspectIdx }) {
  if (!state) {
    return (
      <Card title="How it works" icon="book">
        <ol className="plain-steps">
          <li>Initialize K centroids.</li>
          <li>Calculate the distance from each point to each centroid.</li>
          <li>Assign each point to its nearest centroid.</li>
          <li>Move each centroid to the mean of its points.</li>
          <li>Repeat until assignments stop changing.</li>
        </ol>
        <p className="muted small">Press “Step” to go one step at a time, or “Run” to animate.</p>
      </Card>
    );
  }
  const p = points[inspectIdx];
  let body;
  if (state.phase === 'init') {
    body = (
      <>
        <p>
          {method === 'kmeans++'
            ? 'K-Means++ picks the first centroid at random, then prefers points far away from the centroids chosen so far.'
            : `Pick ${k} distinct data points at random as the starting centroids.`}
        </p>
        <CentroidList centroids={state.centroids} />
      </>
    );
  } else if (state.phase === 'distance') {
    const d = state.distances[inspectIdx];
    const best = d ? d.indexOf(Math.min(...d)) : -1;
    body = (
      <>
        <p>Compute the Euclidean distance from every point to all {k} centroids. For the highlighted point:</p>
        {p && d && (
          <ul className="size-list">
            {state.centroids.map((c, ci) => (
              <li key={ci} className={ci === best ? 'is-best' : ''}>
                <MarkerSwatch shape={ci} color={COLORS[ci]} /> C{ci + 1} ({fmt(c.x, 1)}, {fmt(c.y, 1)}): <strong>{fmt(d[ci], 2)}</strong>
                {ci === best && ' ← nearest'}
              </li>
            ))}
          </ul>
        )}
        {p && d && best >= 0 && (
          <Formula>
            d(P, C{best + 1}) = √(({fmt(p.x)} − {paren(Number(state.centroids[best].x.toFixed(2)))})² + ({fmt(p.y)} − {paren(Number(state.centroids[best].y.toFixed(2)))})²) ={' '}
            <strong>{fmt(d[best], 2)}</strong>
          </Formula>
        )}
      </>
    );
  } else if (state.phase === 'assign') {
    body = (
      <>
        <p>Each point joins the cluster of its nearest centroid.</p>
        <p>
          <strong>{state.changed}</strong> point{state.changed === 1 ? '' : 's'} {state.iteration === 1 ? 'assigned' : 'changed cluster'} this iteration.
        </p>
        <ul className="size-list">
          {state.sizes.map((s, i) => (
            <li key={i}>
              <MarkerSwatch shape={i} color={COLORS[i]} /> Cluster {i + 1}: <strong>{s}</strong> points
            </li>
          ))}
        </ul>
        {state.changed === 0 && <Alert type="success">No point changed cluster - the algorithm has converged.</Alert>}
      </>
    );
  } else if (state.phase === 'update') {
    const ci = state.assignments[inspectIdx] ?? 0;
    const members = points.filter((_, i) => state.assignments[i] === ci);
    const sumX = members.reduce((a, m) => a + m.x, 0);
    const sumY = members.reduce((a, m) => a + m.y, 0);
    body = (
      <>
        <p>Move every centroid to the average position (mean) of its assigned points.</p>
        <ul className="size-list">
          {state.centroids.map((c, i) => (
            <li key={i}>
              <MarkerSwatch shape={i} color={COLORS[i]} /> C{i + 1}: ({fmt(state.previousCentroids[i].x, 1)}, {fmt(state.previousCentroids[i].y, 1)}) → ({fmt(c.x, 1)}, {fmt(c.y, 1)}){' '}
              <span className="muted">moved {fmt(state.shifts[i], 2)}</span>
            </li>
          ))}
        </ul>
        {members.length > 0 && (
          <Formula>
            C{ci + 1} = ({fmt(sumX, 1)} / {members.length}, {fmt(sumY, 1)} / {members.length}) = <strong>({fmt(sumX / members.length, 2)}, {fmt(sumY / members.length, 2)})</strong>
          </Formula>
        )}
        {state.emptyClusters.length > 0 && <Alert type="warning">Cluster {state.emptyClusters.map((c) => c + 1).join(', ')} had no points, so its centroid stays in place.</Alert>}
      </>
    );
  } else {
    body = (
      <>
        <p>
          {state.converged
            ? `After ${state.iteration} iteration${state.iteration === 1 ? '' : 's'} no point changed cluster, so the centroids are stable.`
            : 'The iteration limit was reached before full convergence.'}
        </p>
        <CentroidList centroids={state.centroids} sizes={state.sizes} />
        <p className="muted small">Final inertia: {fmt(state.inertia, 1)}</p>
      </>
    );
  }
  return (
    <Card title="Calculation details" subtitle={stateTitle(state)} icon="spark" className="step-explain" key={`${state.phase}-${state.iteration}`}>
      {body}
    </Card>
  );
}

function CentroidList({ centroids, sizes }) {
  return (
    <ul className="size-list">
      {centroids.map((c, i) => (
        <li key={i}>
          <MarkerSwatch shape={i} color={COLORS[i]} /> C{i + 1} = ({fmt(c.x, 2)}, {fmt(c.y, 2)}){sizes ? ` · ${sizes[i]} points` : ''}
        </li>
      ))}
    </ul>
  );
}
