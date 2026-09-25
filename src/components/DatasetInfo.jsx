import { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import CsvUpload from './CsvUpload.jsx';
import DatasetTable from './DatasetTable.jsx';
import { columnProfile, findDuplicates, makeDataset } from '../utils/preprocessing.js';
import { downloadText, toCSV } from '../utils/csvParser.js';

/**
 * Dataset information panel: name, size, features, types, missing values,
 * duplicates and target column, with Upload / Preview / Reset / Download.
 * Everything is computed in the browser - the data never leaves the device.
 */
export default function DatasetInfo({ name, headers, rows, target, targetNote, onUpload, onError, onReset, resetLabel = 'Restore sample dataset', downloadName = 'dataset.csv', uploadHelp }) {
  const [preview, setPreview] = useState(false);
  const dataset = useMemo(() => makeDataset(headers, rows), [headers, rows]);
  const profile = useMemo(() => columnProfile(dataset), [dataset]);
  const duplicates = useMemo(() => findDuplicates(dataset).length, [dataset]);
  const missing = profile.reduce((a, c) => a + c.missing, 0);
  const features = headers.filter((h) => h !== target);

  return (
    <section className="card dataset-info" aria-labelledby="dataset-info-title">
      <div className="card__head">
        <div className="card__title">
          <Icon name="table" size={17} />
          <div>
            <h2 id="dataset-info-title">Dataset</h2>
            <p className="card__subtitle">{name}</p>
          </div>
        </div>
        <div className="card__actions">
          {onUpload && <CsvUpload onLoad={onUpload} onError={onError} />}
          {onReset && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
              <Icon name="reset" size={14} /> {resetLabel}
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPreview((p) => !p)} aria-expanded={preview}>
            <Icon name="eye" size={14} /> {preview ? 'Hide preview' : 'Preview'}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => downloadText(downloadName, toCSV(headers, rows))} disabled={!rows.length}>
            <Icon name="download" size={14} /> Download CSV
          </button>
        </div>
      </div>
      <dl className="dataset-facts">
        <div>
          <dt>Rows</dt>
          <dd>{rows.length}</dd>
        </div>
        <div>
          <dt>Columns</dt>
          <dd>{headers.length}</dd>
        </div>
        <div>
          <dt>Missing values</dt>
          <dd>{missing}</dd>
        </div>
        <div>
          <dt>Duplicate rows</dt>
          <dd>{duplicates}</dd>
        </div>
        <div className="dataset-facts__wide">
          <dt>Target column</dt>
          <dd>{target ? <span className="tag tag--accent">{target}</span> : <span className="muted">{targetNote || 'None'}</span>}</dd>
        </div>
      </dl>
      <div className="dataset-columns" aria-label="Features and data types">
        {profile.map((c) => (
          <span key={c.name} className={`column-chip ${c.name === target ? 'is-target' : ''}`}>
            <span className="column-chip__name">{c.name}</span>
            <span className={`type-pill type-pill--${c.type}`}>{c.type === 'numeric' ? 'number' : 'text'}</span>
            {c.name === target && <span className="sr-only">(target)</span>}
          </span>
        ))}
      </div>
      <p className="muted small dataset-info__note">
        {features.length} feature{features.length === 1 ? '' : 's'}: {features.join(', ') || '—'}.{' '}
        {uploadHelp || 'Uploaded files are read and processed only in your browser.'}
      </p>
      {preview && (
        <div className="dataset-info__preview">
          <DatasetTable headers={headers} rows={dataset.rows} maxRows={8} />
        </div>
      )}
    </section>
  );
}
