import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import DatasetInfo from '../components/DatasetInfo.jsx';
import { GuideHint } from '../components/AlgorithmSections.jsx';
import DatasetTable from '../components/DatasetTable.jsx';
import MetricsCard from '../components/MetricsCard.jsx';
import InfoTip from '../components/InfoTip.jsx';
import LearningPanel from '../components/LearningPanel.jsx';
import { Alert, Card, EmptyState, Explain, PageHeader, Segmented } from '../components/ui.jsx';
import { useApp } from '../context/AppContext.jsx';
import { RAW_SALARY_CSV, RAW_STUDENT_CSV } from '../data/datasets.js';
import { getTopic } from '../data/learningContent.js';
import { downloadText, parseCSV, toCSV } from '../utils/csvParser.js';
import { columnProfile, findDuplicates, handleMissingOp, isMissing, labelEncodeOp, makeDataset, removeDuplicatesOp, scaleOp } from '../utils/preprocessing.js';
import { fmt } from '../utils/format.js';
import { friendlyError } from '../utils/errors.js';

const SAMPLES = {
  students: { name: 'Student records (sample)', csv: RAW_STUDENT_CSV, file: 'students' },
  salaries: { name: 'Employee salaries (sample)', csv: RAW_SALARY_CSV, file: 'salaries' },
};

const MISSING_OPTIONS = [
  { value: 'mean', label: 'Mean' },
  { value: 'median', label: 'Median' },
  { value: 'mode', label: 'Mode' },
  { value: 'drop', label: 'Remove rows' },
];

function loadSample(key) {
  const parsed = parseCSV(SAMPLES[key].csv);
  return { name: SAMPLES[key].name, file: SAMPLES[key].file, dataset: makeDataset(parsed.headers, parsed.rows), warnings: [] };
}

export default function Preprocessing() {
  const { logActivity } = useApp();
  const [source, setSource] = useState(() => loadSample('students'));
  const [sampleKey, setSampleKey] = useState('students');
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(-1);
  const [missingStrategy, setMissingStrategy] = useState('mean');
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  const dataset = history.length ? history[history.length - 1].after : source.dataset;
  const profile = useMemo(() => columnProfile(dataset), [dataset]);
  const duplicates = useMemo(() => findDuplicates(dataset), [dataset]);
  const encodedColumns = useMemo(() => history.flatMap((h) => h.encodedColumns || []), [history]);
  const totalMissing = profile.reduce((a, c) => a + c.missing, 0);
  const categorical = profile.filter((c) => c.type === 'categorical' && c.unique > 0);
  const scalable = profile.filter((c) => c.type === 'numeric' && !encodedColumns.includes(c.name));
  const inspected = selected >= 0 ? history[selected] : null;
  const original = source.dataset;
  const datasetRows = useMemo(() => dataset.rows.map((r) => r.values), [dataset]);

  function newSource(src) {
    setSource(src);
    setHistory([]);
    setSelected(-1);
    setError(null);
    setFlash(null);
  }

  function chooseSample(key) {
    setSampleKey(key);
    newSource(loadSample(key));
  }

  function onUpload(parsed) {
    setSampleKey(null);
    newSource({
      name: parsed.fileName,
      file: parsed.fileName.replace(/\.[^.]+$/, ''),
      dataset: makeDataset(parsed.headers, parsed.rows),
      warnings: parsed.warnings,
    });
    logActivity(`Uploaded ${parsed.fileName} for preprocessing`, '/preprocessing', 'upload');
  }

  function apply(operation) {
    try {
      const step = operation(dataset);
      const next = [...history, step];
      setHistory(next);
      setSelected(next.length - 1);
      setError(null);
      setFlash({ type: step.changed ? 'success' : 'info', text: `${step.title}: ${step.summary}` });
      logActivity(`Preprocessing: ${step.title}`, '/preprocessing', 'filter');
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  function applyAll() {
    try {
      let current = dataset;
      let encoded = [...encodedColumns];
      const steps = [];
      const push = (s) => {
        steps.push(s);
        current = s.after;
      };
      push(removeDuplicatesOp(current));
      push(handleMissingOp(current, missingStrategy));
      const enc = labelEncodeOp(current);
      encoded = [...encoded, ...enc.encodedColumns];
      push(enc);
      push(scaleOp(current, 'minmax', { exclude: encoded }));
      const next = [...history, ...steps];
      setHistory(next);
      setSelected(next.length - 4);
      setError(null);
      setFlash({ type: 'success', text: 'Applied 4 operations. Click any item in the history to inspect it.' });
      logActivity('Preprocessing: quick clean (4 operations)', '/preprocessing', 'filter');
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  function undo() {
    const last = history[history.length - 1];
    const next = history.slice(0, -1);
    setHistory(next);
    setSelected(next.length - 1);
    setFlash({ type: 'info', text: `Undid “${last.title}”.` });
  }

  function resetDataset() {
    setHistory([]);
    setSelected(-1);
    setFlash({ type: 'info', text: 'Dataset reset to the original data.' });
  }

  function download() {
    const name = `${source.file || 'dataset'}-processed.csv`;
    downloadText(name, toCSV(dataset.headers, dataset.rows.map((r) => r.values)));
    setFlash({ type: 'success', text: `Downloaded ${name} (${dataset.rows.length} rows). The file was generated in your browser.` });
  }

  const opButton = (label, icon, onClick, disabledReason) => (
    <button type="button" className="op-btn" onClick={onClick} disabled={Boolean(disabledReason)} title={disabledReason || undefined}>
      <Icon name={icon} size={16} />
      <span>{label}</span>
      {disabledReason && <span className="op-btn__note">{disabledReason}</span>}
    </button>
  );

  return (
    <div className="page">
      <PageHeader
        icon="filter"
        eyebrow="Data"
        title="Data Preprocessing"
        subtitle="Apply cleaning operations one at a time and see exactly what each one changes: BEFORE → PROCESS → AFTER."
        actions={
          <>
            <label className="field field--inline">
              <span className="sr-only">Sample dataset</span>
              <select value={sampleKey || ''} onChange={(e) => e.target.value && chooseSample(e.target.value)}>
                {!sampleKey && <option value="">{source.name}</option>}
                {Object.entries(SAMPLES).map(([k, s]) => (
                  <option key={k} value={k}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />

      {error && (
        <Alert type="error" title="Could not apply that" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {source.warnings?.map((w) => (
        <Alert key={w} type="warning">
          {w}
        </Alert>
      ))}
      {flash && (
        <Alert type={flash.type} onClose={() => setFlash(null)}>
          {flash.text}
        </Alert>
      )}

      <GuideHint id="prep-start">
        Try the sample dataset: apply <strong>Remove duplicates</strong>, then <strong>Fill missing</strong>, and read the BEFORE → PROCESS → AFTER panel for each
        step.
      </GuideHint>

      <DatasetInfo
        name={`${source.name}${history.length ? ` · after ${history.length} operation${history.length === 1 ? '' : 's'}` : ''}`}
        headers={dataset.headers}
        rows={datasetRows}
        targetNote="Not needed - preprocessing prepares every column"
        onUpload={onUpload}
        onError={setError}
        onReset={() => chooseSample(sampleKey || 'students')}
        resetLabel="Restore sample dataset"
        downloadName={`${source.file || 'dataset'}-processed.csv`}
        uploadHelp="Upload any CSV - numeric and text columns, missing values and duplicates are detected automatically."
      />

      <div className="stats-grid stats-grid--6">
        <MetricsCard label="Rows" value={dataset.rows.length} footer={dataset.rows.length !== original.rows.length ? <span className="muted">was {original.rows.length}</span> : null} />
        <MetricsCard label="Numeric columns" value={profile.filter((c) => c.type === 'numeric').length} hint="Columns where every non-empty value is a number." />
        <MetricsCard label="Categorical columns" value={categorical.length} hint="Columns containing text values (categories)." />
        <MetricsCard label="Missing cells" value={totalMissing} tone={totalMissing ? 'warn' : 'default'} hint="Empty cells, or values like NA, null or ? in the CSV." />
        <MetricsCard label="Duplicate rows" value={duplicates.length} tone={duplicates.length ? 'warn' : 'default'} hint="Rows that exactly repeat an earlier row." />
        <MetricsCard label="Operations applied" value={history.length} />
      </div>

      <div className="grid-sidebar">
        <Card title="Operations" icon="layers" subtitle="Each click adds one step to the history.">
          <div className="op-group">
            <div className="op-group__label">Duplicates</div>
            {opButton(`Remove duplicates (${duplicates.length})`, 'trash', () => apply(removeDuplicatesOp), duplicates.length ? null : 'none found')}
          </div>
          <div className="op-group">
            <div className="op-group__label">
              Missing values <InfoTip text="Mean and median apply to numeric columns. Text columns always use the mode (most frequent value)." />
            </div>
            <Segmented size="sm" label="Missing value strategy" value={missingStrategy} onChange={setMissingStrategy} options={MISSING_OPTIONS} />
            {opButton(
              missingStrategy === 'drop' ? `Remove incomplete rows` : `Fill ${totalMissing} missing (${missingStrategy})`,
              'check',
              () => apply((d) => handleMissingOp(d, missingStrategy)),
              totalMissing ? null : 'no missing values',
            )}
          </div>
          <div className="op-group">
            <div className="op-group__label">Encoding</div>
            {opButton(`Label encode (${categorical.length} text col.)`, 'table', () => apply(labelEncodeOp), categorical.length ? null : 'no text columns')}
          </div>
          <div className="op-group">
            <div className="op-group__label">Scaling</div>
            {opButton('Min-Max scaling', 'trend', () => apply((d) => scaleOp(d, 'minmax', { exclude: encodedColumns })), scalable.length ? null : 'no numeric columns')}
            {opButton('Standardization', 'gauge', () => apply((d) => scaleOp(d, 'standard', { exclude: encodedColumns })), scalable.length ? null : 'no numeric columns')}
          </div>
          <button type="button" className="btn btn--ghost btn--block btn--sm" onClick={applyAll} title="Remove duplicates, fill missing values, label encode and Min-Max scale">
            <Icon name="spark" size={14} /> Quick clean (all 4 steps)
          </button>
          <div className="op-actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={undo} disabled={!history.length}>
              <Icon name="prev" size={14} /> Undo last
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={resetDataset} disabled={!history.length}>
              <Icon name="reset" size={14} /> Reset dataset
            </button>
            <button type="button" className="btn btn--primary btn--sm btn--block" onClick={download} disabled={!dataset.rows.length}>
              <Icon name="download" size={14} /> Download processed CSV
            </button>
          </div>
        </Card>

        <div className="stack">
          <Card title="History" icon="clock" subtitle={history.length ? `${history.length} operation${history.length === 1 ? '' : 's'} applied - click one to inspect it` : 'No operations applied yet'}>
            {history.length ? (
              <ol className="history-list">
                <li className="history-list__origin">
                  <span className="history-list__num">0</span> Original data · {original.rows.length} rows
                </li>
                {history.map((h, i) => (
                  <li key={i}>
                    <button type="button" className={`history-item ${i === selected ? 'is-selected' : ''}`} onClick={() => setSelected(i)} aria-pressed={i === selected}>
                      <span className="history-list__num">{i + 1}</span>
                      <span className="history-item__title">{h.title}</span>
                      <span className={`badge ${h.changed ? 'badge--accent' : 'badge--soft'}`}>{h.changed ? h.summary : 'no change'}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted small">Choose an operation on the left. Each one is recorded here so you can inspect or undo it.</p>
            )}
          </Card>
          <Card title="Column profile" icon="table" subtitle={`${source.name}${history.length ? ' · current state' : ''}`}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Column</th>
                    <th scope="col">Type</th>
                    <th scope="col">Missing</th>
                    <th scope="col">Unique</th>
                    <th scope="col">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.map((c) => (
                    <tr key={c.name}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>
                        <span className={`type-pill type-pill--${c.type}`}>{c.type}</span>
                        {encodedColumns.includes(c.name) && <span className="type-pill type-pill--target">encoded</span>}
                      </td>
                      <td className={c.missing ? 'cell--missing-count' : ''}>{c.missing}</td>
                      <td>{c.unique}</td>
                      <td className="muted">
                        {c.type === 'numeric' ? `min ${fmt(c.min)} · max ${fmt(c.max)} · mean ${fmt(c.mean)}` : c.top !== null ? `most common: ${c.top}` : 'all missing'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {inspected ? (
        <section className="card step-panel" key={`${selected}-${history.length}`} aria-live="polite">
          <div className="step-panel__head">
            <span className="step-panel__badge">Step {selected + 1}</span>
            <div>
              <h2>{inspected.title}</h2>
              <p className="step-panel__summary">{inspected.summary}</p>
            </div>
          </div>
          <Explain title="Why this step?">{inspected.explanation}</Explain>
          <div className="bpa">
            <div className="bpa__col bpa__col--before">
              <h3 className="bpa__label">
                <span>1</span> Before
              </h3>
              <DatasetTable
                headers={inspected.before.headers}
                rows={inspected.before.rows}
                rowClass={Object.fromEntries(inspected.removedRowIds.map((id) => [id, 'removed']))}
                highlights={missingHighlights(inspected)}
                maxRows={8}
              />
            </div>
            <div className="bpa__col bpa__col--process">
              <h3 className="bpa__label">
                <span>2</span> Process
              </h3>
              <div className="calc-box">
                <ul>
                  {inspected.process.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              <StepVisual step={inspected} />
            </div>
            <div className="bpa__col bpa__col--after">
              <h3 className="bpa__label">
                <span>3</span> After
              </h3>
              <DatasetTable
                headers={inspected.after.headers}
                rows={inspected.after.rows}
                highlights={Object.fromEntries(inspected.changes.map((c) => [`${c.rowId}:${c.colIndex}`, 'changed']))}
                maxRows={8}
              />
            </div>
          </div>
          <ChangeTable step={inspected} />
        </section>
      ) : (
        <Card title="Current dataset" icon="table" subtitle="Missing cells are marked; duplicate rows are tinted.">
          <DatasetTable
            headers={dataset.headers}
            columnTypes={profile.map((c) => c.type)}
            rows={dataset.rows}
            rowClass={Object.fromEntries(duplicates.map((d) => [d.id, 'duplicate']))}
            maxRows={15}
          />
          {!dataset.rows.length && <EmptyState icon="table" title="No rows" />}
        </Card>
      )}

      {inspected && (
        <Card title={`Current dataset (${dataset.rows.length} rows)`} icon="table" subtitle="This is what “Download processed CSV” saves.">
          <DatasetTable headers={dataset.headers} columnTypes={profile.map((c) => c.type)} rows={dataset.rows} maxRows={10} />
        </Card>
      )}

      <LearningPanel topic={getTopic('preprocessing')} compact />
    </div>
  );
}

function missingHighlights(step) {
  if (step.id !== 'missing') return {};
  const out = {};
  step.before.rows.forEach((r) =>
    r.values.forEach((v, c) => {
      if (isMissing(v)) out[`${r.id}:${c}`] = 'missing';
    }),
  );
  return out;
}

function ChangeTable({ step }) {
  if (step.changes.length === 0 && step.removedRowIds.length === 0) {
    return <p className="muted small change-table">Nothing changed: the data already satisfied this step.</p>;
  }
  if (step.changes.length === 0) {
    return (
      <p className="change-table">
        <strong>What changed:</strong> removed row{step.removedRowIds.length === 1 ? '' : 's'} {step.removedRowIds.join(', ')} ({step.before.rows.length} → {step.after.rows.length} rows).
      </p>
    );
  }
  const changes = step.changes.slice(0, 12);
  return (
    <div className="change-table">
      <h3 className="bpa__label bpa__label--plain">
        What changed <span className="muted">({step.changes.length} cell{step.changes.length === 1 ? '' : 's'}{step.changes.length > 12 ? ', first 12 shown' : ''})</span>
      </h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Row</th>
              <th scope="col">Before</th>
              <th scope="col">After</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c, i) => (
              <tr key={`${c.rowId}-${c.colIndex}`} className="fade-in-row" style={{ animationDelay: `${i * 40}ms` }}>
                <td>{c.column}</td>
                <td>{c.rowId}</td>
                <td>{c.before === null ? <span className="cell-missing">missing</span> : typeof c.before === 'number' ? fmt(c.before, 3) : c.before}</td>
                <td className="cell--changed">{typeof c.after === 'number' ? fmt(c.after, 3) : c.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** A small picture of each operation, tailored to its type. */
function StepVisual({ step }) {
  if (step.removedRowIds.length) {
    const removed = new Set(step.removedRowIds);
    return (
      <div className="visual-rows" aria-label="Rows kept and removed">
        {step.before.rows.map((r) => (
          <span key={r.id} className={`row-chip ${removed.has(r.id) ? 'is-removed' : ''}`} title={`Row ${r.id}${removed.has(r.id) ? ' removed' : ' kept'}`}>
            {r.id}
            {removed.has(r.id) && <span className="sr-only"> removed</span>}
          </span>
        ))}
        <span className="muted visual-note">
          {step.before.rows.length} rows → {step.after.rows.length} rows
        </span>
      </div>
    );
  }
  if (step.id === 'missing' && step.changes.length) {
    const changed = new Set(step.changes.map((c) => `${c.rowId}:${c.colIndex}`));
    return (
      <div className="missing-map" style={{ '--cols': step.before.headers.length }} aria-label="Missing value map">
        {step.before.headers.map((h) => (
          <span key={h} className="missing-map__head" title={h}>
            {h.slice(0, 3)}
          </span>
        ))}
        {step.before.rows.map((r) =>
          r.values.map((v, c) => (
            <span key={`${r.id}:${c}`} className={`missing-map__cell ${changed.has(`${r.id}:${c}`) ? 'is-filled' : isMissing(v) ? 'is-missing' : ''}`} title={`Row ${r.id}, ${step.before.headers[c]}`} />
          )),
        )}
        <span className="missing-map__legend muted">
          <span className="missing-map__cell is-filled" /> filled
          <span className="missing-map__cell" /> original value
        </span>
      </div>
    );
  }
  if ((step.id === 'minmax' || step.id === 'standard') && step.changes.length) {
    const first = step.changes[0];
    const col = step.changes.filter((c) => c.colIndex === first.colIndex);
    const bVals = col.map((c) => c.before);
    const aVals = col.map((c) => c.after);
    const [bMin, bMax, aMin, aMax] = [Math.min(...bVals), Math.max(...bVals), Math.min(...aVals), Math.max(...aVals)];
    const pos = (v, lo, hi) => (hi === lo ? 50 : ((v - lo) / (hi - lo)) * 100);
    return (
      <div className="scale-visual" aria-label={`Scaling of ${first.column}`}>
        <div className="scale-visual__title">
          <strong>{first.column}</strong>: same shape, new scale
        </div>
        {[
          ['Before', bVals, bMin, bMax, ''],
          ['After', aVals, aMin, aMax, 'scale-dot--after'],
        ].map(([label, vals, lo, hi, cls]) => (
          <div className="scale-line" key={label}>
            <span className="scale-line__label">{label}</span>
            <div className="scale-line__track">
              {vals.map((v, i) => (
                <span key={i} className={`scale-dot ${cls}`} style={{ left: `${pos(v, lo, hi)}%`, animationDelay: `${i * 30}ms` }} title={fmt(v, 3)} />
              ))}
            </div>
            <span className="scale-line__range">
              {fmt(lo, 2)} … {fmt(hi, 2)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (step.id === 'encoding' && step.mappings?.length) {
    return (
      <div className="mapping-chips">
        {step.mappings.map((m) => (
          <div key={m.column} className="mapping-chips__group">
            <strong>{m.column}</strong>
            {m.pairs.map(([category, code]) => (
              <span key={category} className="map-chip">
                {category} <Icon name="arrowRight" size={12} /> <b>{code}</b>
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return null;
}
