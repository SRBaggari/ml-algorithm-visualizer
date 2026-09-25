import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
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
import { decisionTreeStep, IDLE_EXPLANATIONS } from '../data/stepExplanations.js';
import { Alert, Card, EmptyState, Formula, PageHeader } from '../components/ui.jsx';
import { useStepPlayer } from '../hooks/useStepPlayer.js';
import { useElementSize } from '../hooks/useElementSize.js';
import { useAlgorithmTracking, useApp } from '../context/AppContext.jsx';
import { buildDecisionTree, classifySample, entropyFormula, informationGain, layoutTree } from '../algorithms/decisionTree.js';
import { TREE_DATASETS } from '../data/datasets.js';
import { fmt } from '../utils/format.js';
import { friendlyError } from '../utils/errors.js';

const MAX_CATEGORIES = 10;
let nextRowId = 1;
const DEFAULT_SAMPLE = { Outlook: 'Sunny', Temperature: 'Cool', Humidity: 'High', Wind: 'Strong' };

const STEP_DESCRIPTIONS = {
  evaluate: 'Entropy of the rows at this node, then the information gain of every remaining attribute.',
  split: 'The highest-gain attribute becomes the question; rows are divided by its values.',
  leaf: 'The rows here need no more questions, so this node becomes a prediction.',
  done: 'Every branch ends in a leaf - read each root-to-leaf path as an if-then rule.',
};
const FLOW_STAGE = { evaluate: 2, split: 3, leaf: 3, done: 4 };
const ACTIVE_FORMULAS = { evaluate: ['entropy', 'gain'], split: ['gain'], leaf: ['entropy'], done: [] };

function toRowObjects(columns, rows) {
  return rows.map((r) => ({ __id: nextRowId++, ...Object.fromEntries(columns.map((c, i) => [c, String(r[i])])) }));
}

function nodeLabel(node) {
  if (!node || node.path.length === 0) return 'the root (all rows)';
  return node.path.map((p) => `${p.attribute} = ${p.value}`).join(' and ');
}

function stepTitle(entry, nodes) {
  const node = nodes[entry.nodeId];
  switch (entry.type) {
    case 'evaluate':
      return `Calculate entropy & information gain at ${nodeLabel(node)}`;
    case 'split':
      return `Split on “${node.attribute}” (highest gain)`;
    case 'leaf':
      return `Create leaf “${node.prediction}” for ${nodeLabel(node)}`;
    default:
      return 'Final decision tree';
  }
}

export default function DecisionTree({ embedded = false }) {
  const { markExplored } = useApp();
  const [datasetId, setDatasetId] = useState('tennis');
  const [columns, setColumns] = useState(TREE_DATASETS.tennis.columns);
  const [target, setTarget] = useState(TREE_DATASETS.tennis.target);
  const [rows, setRows] = useState(() => toRowObjects(TREE_DATASETS.tennis.columns, TREE_DATASETS.tennis.rows));
  const [upload, setUpload] = useState(null);
  const [tree, setTree] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [sample, setSample] = useState(DEFAULT_SAMPLE);
  const [pathStep, setPathStep] = useState(0);
  const [classification, setClassification] = useState(null);
  const [newRow, setNewRow] = useState({});

  const trace = tree?.trace || [];
  const player = useStepPlayer(trace.length, { interval: 2200 });
  const attributes = useMemo(() => columns.filter((c) => c !== target), [columns, target]);
  const valuesOf = useMemo(() => {
    const out = {};
    for (const c of columns) out[c] = [...new Set(rows.map((r) => r[c]))];
    return out;
  }, [columns, rows]);

  const steps = useMemo(() => trace.map((t, i) => ({ id: i, title: stepTitle(t, tree.nodes), description: STEP_DESCRIPTIONS[t.type] })), [trace, tree]);
  const rootGains = useMemo(() => {
    if (!rows.length || !attributes.length) return null;
    return attributes.map((a) => informationGain(rows, a, target)).sort((a, b) => b.gain - a.gain);
  }, [rows, attributes, target]);

  // Walk the classified sample down the tree one node at a time.
  useEffect(() => {
    if (!classification || pathStep >= classification.path.length) return undefined;
    const t = setTimeout(() => setPathStep((p) => p + 1), 650);
    return () => clearTimeout(t);
  }, [classification, pathStep]);
  const current = tree ? trace[player.step] : null;
  const currentNode = current && current.nodeId !== null ? tree.nodes[current.nodeId] : null;
  const [searchParams, setSearchParams] = useSearchParams();
  useAlgorithmTracking('decision-tree', 'Decision Tree', Boolean(tree) && player.isLast);
  const tableRows = useMemo(() => rows.map((r) => columns.map((c) => r[c])), [rows, columns]);

  function invalidate() {
    setTree(null);
    setClassification(null);
    player.reset();
  }

  function loadDataset(id) {
    const d = TREE_DATASETS[id];
    setDatasetId(id);
    setColumns(d.columns);
    setTarget(d.target);
    setRows(toRowObjects(d.columns, d.rows));
    setSample(id === 'tennis' ? DEFAULT_SAMPLE : {});
    setNewRow({});
    setError(null);
    setNotice(null);
    setUpload(null);
    invalidate();
  }

  function onUpload(u) {
    const usable = u.headers.filter((h, i) => new Set(u.rows.map((r) => r[i]).filter((v) => v !== null)).size <= MAX_CATEGORIES);
    const skippedCols = u.headers.filter((h) => !usable.includes(h));
    if (usable.length < 2) {
      setError(`Decision trees here need categorical columns with at most ${MAX_CATEGORIES} distinct values. Found only ${usable.length} such column(s).`);
      return;
    }
    const idx = usable.map((h) => u.headers.indexOf(h));
    const complete = u.rows.filter((r) => idx.every((i) => r[i] !== null)).slice(0, 200);
    if (complete.length < 2) {
      setError('Not enough complete rows (each row needs a value in every column).');
      return;
    }
    const newRows = toRowObjects(usable, complete.map((r) => idx.map((i) => r[i])));
    setUpload(u);
    setDatasetId('upload');
    setColumns(usable);
    setTarget(usable[usable.length - 1]);
    setRows(newRows);
    setSample({});
    setNewRow({});
    setError(null);
    invalidate();
    const msgs = [];
    if (skippedCols.length) msgs.push(`Skipped columns with too many distinct values (e.g. IDs or continuous numbers): ${skippedCols.join(', ')}.`);
    if (complete.length < u.rows.length) msgs.push(`${u.rows.length - complete.length} row(s) were skipped (missing values or over the 200-row limit).`);
    setNotice(msgs.join(' ') || null);
  }

  function build(buildRows = rows, buildAttributes = attributes, buildTarget = target, autoplay = true) {
    try {
      const t = buildDecisionTree(buildRows, buildAttributes, buildTarget);
      setTree(t);
      setError(null);
      setClassification(null);
      player.start(0, autoplay);
      markExplored('decision-tree', 'Built a Decision Tree with ID3', '/decision-tree', 'tree');
    } catch (err) {
      setError(friendlyError(err));
      setTree(null);
    }
  }

  // Demo mode: restore Play Tennis and start the walkthrough paused at step 1.
  function runDemo() {
    const d = TREE_DATASETS.tennis;
    const demoRows = toRowObjects(d.columns, d.rows);
    loadDataset('tennis');
    setRows(demoRows);
    build(demoRows, d.columns.filter((c) => c !== d.target), d.target, false);
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

  function classify() {
    if (!tree) return;
    const s = Object.fromEntries(tree.attributes.map((a) => [a, sample[a] ?? valuesOf[a][0]]));
    setClassification({ ...classifySample(tree, s), sample: s });
    setPathStep(1);
    player.goTo(trace.length - 1);
    player.pause();
  }

  function addRow(e) {
    e.preventDefault();
    const row = { __id: nextRowId++ };
    for (const c of columns) row[c] = newRow[c] ?? valuesOf[c][0];
    setRows((r) => [...r, row]);
    invalidate();
  }

  function deleteRow(id) {
    setRows((r) => r.filter((x) => x.__id !== id));
    invalidate();
  }

  const subsetIds = new Set(currentNode ? currentNode.rowIds : []);

  return (
    <div className={embedded ? 'page page--embedded' : 'page'}>
      {!embedded && (
      <PageHeader
        icon="tree"
        eyebrow="Algorithm · Supervised classification"
        title="Decision Tree (ID3)"
        subtitle="Grow a tree of questions by repeatedly choosing the attribute with the highest information gain."
        actions={
          <ReportButton
            disabled={!tree}
            getReport={() =>
              tree && {
                algorithm: 'Decision Tree (ID3)',
                dataset: datasetId === 'upload' ? upload?.fileName : TREE_DATASETS[datasetId]?.name,
                parameters: { criterion: 'Entropy / information gain', target, attributes, rows: rows.length },
                results: {
                  rootAttribute: tree.root.attribute || `leaf: ${tree.root.prediction}`,
                  rules: Object.values(tree.nodes)
                    .filter((n) => n.type === 'leaf')
                    .map((l) => `IF ${l.path.map((c) => `${c.attribute} = ${c.value}`).join(' AND ') || 'always'} THEN ${l.prediction}`),
                  sample: classification ? `${JSON.stringify(classification.sample)} → ${classification.prediction}` : null,
                },
                metrics: {
                  datasetEntropy: tree.root.entropy,
                  ...Object.fromEntries((rootGains || []).map((g) => [`gain(${g.attribute})`, g.gain])),
                  nodes: Object.keys(tree.nodes).length,
                },
              }
            }
          />
        }
      />
      )}
      {!embedded && <AlgorithmIntro guide={GUIDES['decision-tree']} onDemo={runDemo} />}
      {!tree && (
        <GuideHint id="tree-start">
          Start with the Play Tennis sample: press <strong>Build Decision Tree</strong>, then use <strong>Next step</strong> to see each entropy and gain calculation.
        </GuideHint>
      )}

      <ConceptFlow
        label="Decision tree flow"
        active={tree && current ? FLOW_STAGE[current.type] : rows.length ? 0 : -1}
        stages={[
          { label: 'Dataset', icon: 'table' },
          { label: 'Entropy', icon: 'gauge' },
          { label: 'Information gain', icon: 'trend' },
          { label: 'Split', icon: 'split' },
          { label: 'Tree', icon: 'tree' },
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
            <select value={datasetId} onChange={(e) => (e.target.value === 'upload' ? onUpload(upload) : loadDataset(e.target.value))}>
              {Object.values(TREE_DATASETS).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              {upload && <option value="upload">Uploaded: {upload.fileName}</option>}
            </select>
          </label>
          <label className="field field--inline">
            <span className="field__label">Target</span>
            <select
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                invalidate();
              }}
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <div className="toolbar__spacer" />
          <button type="button" className="btn btn--primary" onClick={() => build()} disabled={rows.length === 0}>
            <Icon name="tree" size={16} /> Build Decision Tree
          </button>
        </div>
      </Card>

      <DatasetInfo
        name={datasetId === 'upload' ? upload?.fileName : TREE_DATASETS[datasetId]?.name}
        headers={columns}
        rows={tableRows}
        target={target}
        onUpload={onUpload}
        onError={setError}
        onReset={() => loadDataset('tennis')}
        downloadName="decision-tree-data.csv"
        uploadHelp="Upload a CSV of categorical columns (at most 10 distinct values each); the last one becomes the target."
      />

      <Card title="Decision tree" icon="tree" subtitle={tree ? `${Object.keys(tree.nodes).length} nodes` : 'Press “Build Decision Tree” to grow the tree step by step.'}>
        {tree ? (
          <>
            <TreeView tree={tree} step={player.step} classification={classification} pathStep={pathStep} />
            <p className="chart-caption">
              {current?.type === 'done' || player.isLast
                ? `Complete tree: the root asks about ${tree.root.attribute || 'nothing (single leaf)'}, with ${Object.values(tree.nodes).filter((n) => n.type === 'leaf').length} leaves. Each node shows its entropy (H) and number of rows (n).`
                : `Growing the tree - step ${player.step + 1} of ${trace.length}: ${steps[player.step]?.title}.`}
              {classification && pathStep >= classification.path.length && ` The highlighted path classifies the sample as ${classification.prediction}.`}
            </p>
          </>
        ) : (
          <EmptyState icon="tree" title="No tree yet">
            The tree will appear here, node by node, as ID3 chooses each split.
          </EmptyState>
        )}
      </Card>

      <Card>
        <StepController player={player} steps={steps} disabled={!tree} compact={steps.length > 14} emptyText="Press “Build Decision Tree” to grow the tree step by step" />
      </Card>

      {rootGains && <RootSummary gains={rootGains} target={target} rowsCount={rows.length} chosen={tree?.root.attribute} />}

      <div className="viz-layout viz-layout--even">
        <div className="viz-main">
          {tree && current ? (
            <StepDetail entry={current} tree={tree} step={player.step} total={trace.length} />
          ) : (
            <Card title="How ID3 works" icon="book">
              <ol className="plain-steps">
                <li>Calculate the entropy (uncertainty) of the target labels.</li>
                <li>For each attribute, calculate the information gain of splitting on it.</li>
                <li>Select the attribute with the highest gain.</li>
                <li>Split the dataset by that attribute's values.</li>
                <li>Repeat recursively on each subset.</li>
                <li>Stop when a subset is pure (entropy 0) or no attributes remain → leaf.</li>
              </ol>
              <Formula>Entropy H(S) = −Σ pᵢ · log₂(pᵢ)</Formula>
              <Formula>Gain(S, A) = H(S) − Σ (|Sᵥ| / |S|) · H(Sᵥ)</Formula>
            </Card>
          )}
        </div>
        <aside className="viz-side">
          <ExplainStep
            explanation={tree && current ? decisionTreeStep(current, tree) : IDLE_EXPLANATIONS['decision-tree']}
            stepLabel={tree ? `Step ${player.step + 1} of ${trace.length}` : 'Not started'}
          />
          <Card title="Classify a new sample" icon="target">
            {!tree && <p className="muted small">Build the tree first.</p>}
            <div className="form-grid">
              {attributes.map((a) => (
                <label className="field" key={a}>
                  <span className="field__label">{a}</span>
                  <select value={sample[a] ?? valuesOf[a]?.[0] ?? ''} onChange={(e) => setSample({ ...sample, [a]: e.target.value })} disabled={!tree}>
                    {(valuesOf[a] || []).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button type="button" className="btn btn--primary btn--block" onClick={classify} disabled={!tree}>
              <Icon name="arrowRight" size={16} /> Classify sample
            </button>
            {classification && (
              <div className="classify-result">
                {pathStep >= classification.path.length && (
                  <div className="decision" style={{ '--c': 'var(--accent)' }}>
                    <span>{target} =</span>
                    <strong>{classification.prediction}</strong>
                  </div>
                )}
                <ol className="path-flow" aria-label="Path through the tree">
                  {classification.path.map((id, i) => {
                    const n = tree.nodes[id];
                    return (
                      <li key={id} className={i < pathStep ? 'is-shown' : ''}>
                        <span className="path-flow__kind">{i === 0 ? 'Root' : n.type === 'leaf' ? 'Prediction' : 'Condition'}</span>
                        {n.type === 'leaf' ? (
                          <strong>
                            {target} = {n.prediction}
                          </strong>
                        ) : (
                          <span>
                            {n.attribute}? → <strong>{classification.sample[n.attribute]}</strong>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {classification.note && <Alert type="warning">{classification.note}</Alert>}
              </div>
            )}
          </Card>
        </aside>
      </div>

      <ResultCard
        algorithm="Decision Tree (ID3)"
        emptyText="Build the tree and step to the end to see the result."
        final={
          tree && player.isLast
            ? classification && pathStep >= classification.path.length
              ? ['Sample prediction', `${target} = ${classification.prediction}`]
              : ['Root question', tree.root.attribute ? `${tree.root.attribute}?` : `always ${tree.root.prediction}`]
            : null
        }
        rows={
          tree
            ? [
                ['Training rows', rows.length],
                ['Target', target],
                ['Dataset entropy', fmt(tree.root.entropy, 3)],
                ['Best first split', tree.root.best ? `${tree.root.attribute} (gain ${fmt(tree.root.best.gain, 3)})` : 'none (already pure)'],
                ['Nodes / leaves', `${Object.keys(tree.nodes).length} / ${Object.values(tree.nodes).filter((n) => n.type === 'leaf').length}`],
                ...(classification ? [['Sample', Object.values(classification.sample).join(', ')]] : []),
              ]
            : []
        }
      />

      <Card
        title={`Training data (${rows.length} rows)`}
        icon="table"
        subtitle={currentNode ? `Highlighted: the ${currentNode.samples} rows that reach ${nodeLabel(currentNode)}` : 'Delete rows or add new ones, then rebuild the tree.'}
      >
        <div className="table-wrap table-wrap--scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                {columns.map((c) => (
                  <th scope="col" key={c} className={c === target ? 'th--target' : ''}>
                    {c}
                    {c === target && <span className="type-pill type-pill--target">target</span>}
                  </th>
                ))}
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.__id} className={currentNode ? (subsetIds.has(r.__id) ? 'row--highlight' : 'row--muted') : ''}>
                  <td>{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c} className={c === target ? 'td--target' : ''}>
                      {r[c]}
                    </td>
                  ))}
                  <td>
                    <button type="button" className="icon-btn icon-btn--sm" onClick={() => deleteRow(r.__id)} aria-label={`Delete row ${i + 1}`} title="Delete row">
                      <Icon name="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="add-row" onSubmit={addRow}>
          <span className="field__label">Add row:</span>
          {columns.map((c) => (
            <label key={c} className="field field--inline">
              <span className="sr-only">{c}</span>
              <select value={newRow[c] ?? valuesOf[c]?.[0] ?? ''} onChange={(e) => setNewRow({ ...newRow, [c]: e.target.value })} title={c}>
                {(valuesOf[c] || []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button type="submit" className="btn btn--secondary btn--sm" disabled={rows.length === 0}>
            <Icon name="plus" size={14} /> Add
          </button>
        </form>
      </Card>


      {!embedded && (
        <>
          <FormulaPanel algorithm="decision-tree" active={tree && current ? ACTIVE_FORMULAS[current.type] : []} />
          <KeyTakeaways items={GUIDES['decision-tree'].takeaways} />
          <LearningPanel topic={getTopic('decision-tree')} compact />
        </>
      )}
    </div>
  );
}

/** Dataset entropy, entropy after each possible split, information gain and the chosen attribute - for the full dataset. */
function RootSummary({ gains, target, rowsCount, chosen }) {
  const best = gains[0];
  const H = best.parentEntropy;
  const counts = best.branches.reduce((acc, b) => {
    for (const [k, v] of Object.entries(b.counts)) acc[k] = (acc[k] || 0) + v;
    return acc;
  }, {});
  return (
    <Card title="ID3 calculations for the whole dataset" icon="gauge" subtitle={`${rowsCount} rows · target “${target}”`}>
      <div className="root-summary">
        <div className="root-summary__entropy">
          <span className="eyebrow">Dataset entropy</span>
          <strong>{fmt(H, 3)}</strong>
          <span className="formula">H(S) = {entropyFormula(counts)}</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Attribute</th>
                <th scope="col">Entropy after split</th>
                <th scope="col">Information gain</th>
                <th scope="col">
                  <span className="sr-only">Selected</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {gains.map((g) => (
                <tr key={g.attribute} className={g.attribute === best.attribute ? 'row--highlight' : ''}>
                  <th scope="row">{g.attribute}</th>
                  <td>{fmt(g.weightedEntropy, 3)}</td>
                  <td>
                    <span className="gain-inline">
                      <span className="gain-inline__bar" style={{ width: `${H ? (g.gain / H) * 100 : 0}%` }} />
                      {fmt(g.gain, 3)}
                    </span>
                  </td>
                  <td>{g.attribute === best.attribute && <span className="badge badge--accent">{chosen === g.attribute ? 'selected (root)' : 'highest gain'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="hint">
        Gain = dataset entropy − entropy after split. <strong>{best.attribute}</strong> has the highest information gain ({fmt(best.gain, 3)}), so ID3 asks about it first.
      </p>
    </Card>
  );
}

/* ---------------- Tree rendering ---------------- */

const NODE_W = 124;
const NODE_H = 58;
const LEVEL_H = 112;

function TreeView({ tree, step, classification, pathStep = Infinity }) {
  const [ref, { width }] = useElementSize(700);
  const { positions, leaves, depth } = useMemo(() => layoutTree(tree.root), [tree]);

  // When does each node first appear, and when does a decision node get its attribute?
  const appear = {};
  const splitAt = {};
  tree.trace.forEach((t, i) => {
    if (t.nodeId === null) return;
    if (appear[t.nodeId] === undefined) appear[t.nodeId] = i;
    if (t.type === 'split') splitAt[t.nodeId] = i;
  });
  const current = tree.trace[step];
  const pathSet = new Set((classification?.path || []).slice(0, pathStep));
  const classes = Object.keys(tree.root.counts).sort();

  const svgW = Math.max(width, leaves * (NODE_W + 18));
  const svgH = (depth + 1) * LEVEL_H + 10;
  const colW = svgW / leaves;
  const px = (id) => (positions[id].x + 0.5) * colW;
  const py = (id) => positions[id].depth * LEVEL_H + 8;

  const nodes = Object.values(tree.nodes).filter((n) => appear[n.id] <= step);

  return (
    <div className="tree-scroll" ref={ref}>
      <svg width={svgW} height={svgH} role="img" aria-label="Decision tree diagram" className="tree-svg">
        {nodes
          .filter((n) => n.parentId !== null)
          .map((n) => {
            const x1 = px(n.parentId);
            const y1 = py(n.parentId) + NODE_H;
            const x2 = px(n.id);
            const y2 = py(n.id);
            const onPath = pathSet.has(n.id) && pathSet.has(n.parentId);
            const midY = (y1 + y2) / 2;
            return (
              <g key={`e${n.id}`} className={`tree-edge fade-in ${onPath ? 'is-path' : ''}`}>
                <path d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`} />
                <g transform={`translate(${(x1 + x2) / 2} ${midY})`}>
                  <rect x={-String(n.branchValue).length * 3.6 - 8} y={-10} width={String(n.branchValue).length * 7.2 + 16} height={20} rx={10} className="tree-edge__pill" />
                  <text textAnchor="middle" y={4}>
                    {n.branchValue}
                  </text>
                </g>
              </g>
            );
          })}
        {nodes.map((n) => {
          const x = px(n.id) - NODE_W / 2;
          const y = py(n.id);
          const isCurrent = current && current.nodeId === n.id;
          const decided = n.type === 'leaf' || splitAt[n.id] <= step;
          const onPath = pathSet.has(n.id);
          const total = n.samples;
          return (
            // Position on the outer group; the pop-in animation lives on the inner group so its
            // CSS transform can never override the SVG translate().
            <g key={n.id} transform={`translate(${x} ${y})`} data-node-id={n.id}>
            <g className={`tree-node ${n.type === 'leaf' ? 'tree-node--leaf' : ''} ${isCurrent ? 'is-current' : ''} ${onPath ? 'is-path' : ''}`}>
              <title>{`${nodeLabel(n)} · ${total} rows · entropy ${fmt(n.entropy, 3)}`}</title>
              <rect width={NODE_W} height={NODE_H} rx={10} />
              {n.type === 'leaf' ? (
                <>
                  <text x={NODE_W / 2} y={24} textAnchor="middle" className="tree-node__title">
                    {n.prediction}
                  </text>
                  <text x={NODE_W / 2} y={42} textAnchor="middle" className="tree-node__meta">
                    leaf · n = {total}
                  </text>
                </>
              ) : (
                <>
                  <text x={NODE_W / 2} y={24} textAnchor="middle" className="tree-node__title">
                    {decided ? `${n.attribute}?` : '?'}
                  </text>
                  <text x={NODE_W / 2} y={42} textAnchor="middle" className="tree-node__meta">
                    H = {fmt(n.entropy, 3)} · n = {total}
                  </text>
                </>
              )}
              {/* class distribution bar */}
              {classes.reduce(
                (acc, c, i) => {
                  const w = ((n.counts[c] || 0) / total) * (NODE_W - 16);
                  acc.els.push(<rect key={c} x={8 + acc.x} y={NODE_H - 9} width={Math.max(0, w)} height={4} rx={2} style={{ fill: `var(--s${(i % 6) + 1})` }} />);
                  acc.x += w;
                  return acc;
                },
                { x: 0, els: [] },
              ).els}
            </g>
            </g>
          );
        })}
      </svg>
      <div className="tree-legend">
        {classes.map((c, i) => (
          <span key={c}>
            <span className="dot" style={{ background: `var(--s${(i % 6) + 1})` }} /> {c}
          </span>
        ))}
        <span className="muted small">Bars show the class mix at each node.</span>
      </div>
    </div>
  );
}

/* ---------------- Step explanation ---------------- */

function countsText(counts) {
  return Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
}

function StepDetail({ entry, tree, step, total }) {
  const node = entry.nodeId !== null ? tree.nodes[entry.nodeId] : null;
  const title = `Step ${step + 1} / ${total}: ${stepTitle(entry, tree.nodes)}`;

  if (entry.type === 'evaluate') {
    const best = node.best;
    return (
      <Card title="Calculation details" subtitle={title} icon="spark" className="step-explain" key={step}>
        <p>
          This node has <strong>{node.samples}</strong> rows ({countsText(node.counts)}). First measure how mixed the labels are:
        </p>
        <Formula>
          H(S) = {entropyFormula(node.counts)} = <strong>{fmt(node.entropy, 3)}</strong>
        </Formula>
        <p>Then compute the information gain of each remaining attribute:</p>
        <div className="gain-list">
          {[...node.gains]
            .sort((a, b) => b.gain - a.gain)
            .map((g) => (
              <details key={g.attribute} className={`gain-item ${g.attribute === best.attribute ? 'is-best' : ''}`} open={g.attribute === best.attribute}>
                <summary>
                  <span className="gain-item__name">{g.attribute}</span>
                  <span className="gain-item__bar">
                    <span style={{ width: `${node.entropy ? (g.gain / node.entropy) * 100 : 0}%` }} />
                  </span>
                  <span className="gain-item__value">Gain = {fmt(g.gain, 3)}</span>
                </summary>
                <div className="table-wrap">
                  <table className="data-table data-table--mini">
                    <thead>
                      <tr>
                        <th scope="col">{g.attribute}</th>
                        <th scope="col">Rows</th>
                        <th scope="col">Labels</th>
                        <th scope="col">Entropy</th>
                        <th scope="col">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.branches.map((b) => (
                        <tr key={b.value}>
                          <td>{b.value}</td>
                          <td>{b.count}</td>
                          <td>{countsText(b.counts)}</td>
                          <td>{fmt(b.entropy, 3)}</td>
                          <td>
                            {b.count}/{node.samples}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Formula>
                  Gain = {fmt(g.parentEntropy, 3)} − ({g.branches.map((b) => `${b.count}/${node.samples}·${fmt(b.entropy, 3)}`).join(' + ')}) = {fmt(g.parentEntropy, 3)} −{' '}
                  {fmt(g.weightedEntropy, 3)} = <strong>{fmt(g.gain, 3)}</strong>
                </Formula>
              </details>
            ))}
        </div>
      </Card>
    );
  }

  if (entry.type === 'split') {
    return (
      <Card title="Calculation details" subtitle={title} icon="spark" className="step-explain" key={step}>
        <p>
          <strong>{node.attribute}</strong> has the highest information gain ({fmt(node.best.gain, 3)}), so it becomes the question at this node. The{' '}
          {node.samples} rows are divided by its values:
        </p>
        <ul className="split-list">
          {node.best.branches.map((b) => (
            <li key={b.value}>
              <span className="tag">
                {node.attribute} = {b.value}
              </span>
              <span>
                {b.count} rows ({countsText(b.counts)})
              </span>
              <span className="muted small">{b.entropy === 0 ? 'pure → will become a leaf' : `entropy ${fmt(b.entropy, 3)} → keep splitting`}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">The same process now repeats inside each branch, without re-using “{node.attribute}”.</p>
      </Card>
    );
  }

  if (entry.type === 'leaf') {
    const reasons = {
      pure: `All ${node.samples} rows have the same label (${countsText(node.counts)}), so entropy = 0. No more questions are needed.`,
      'no-attributes': `No attributes are left to split on, so the leaf predicts the majority label (${countsText(node.counts)}).`,
      'no-gain': `No attribute reduces the entropy any further, so the leaf predicts the majority label (${countsText(node.counts)}).`,
      'max-depth': 'The maximum depth was reached, so the leaf predicts the majority label.',
    };
    return (
      <Card title="Calculation details" subtitle={title} icon="spark" className="step-explain" key={step}>
        <div className="decision" style={{ '--c': 'var(--accent)' }}>
          <span>Leaf</span>
          <strong>{node.prediction}</strong>
        </div>
        <p>{reasons[node.leafReason]}</p>
        {node.samples === 0 && <p className="muted small">This branch had no training rows; it uses the parent's majority class.</p>}
      </Card>
    );
  }

  // Final summary: extract readable rules from every leaf.
  const leaves = Object.values(tree.nodes).filter((n) => n.type === 'leaf');
  const depth = Math.max(...Object.values(tree.nodes).map((n) => n.depth));
  return (
    <Card title="Calculation details" subtitle={title} icon="check" className="step-explain" key={step}>
      <p>
        The tree is complete: <strong>{leaves.length}</strong> leaves, depth <strong>{depth}</strong>. Every path from the root to a leaf is an if-then rule:
      </p>
      <ul className="rule-list">
        {leaves.map((l) => (
          <li key={l.id}>
            <span className="rule-list__if">IF</span> {l.path.length ? l.path.map((p) => `${p.attribute} = ${p.value}`).join(' AND ') : 'always'}{' '}
            <span className="rule-list__then">THEN</span> <strong>{l.prediction}</strong>
          </li>
        ))}
      </ul>
    </Card>
  );
}
