import { useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { parseCSV, readFileAsText } from '../utils/csvParser.js';
import { friendlyError } from '../utils/errors.js';

/**
 * CSV picker with drag & drop. Parsing happens entirely in the browser;
 * the file is never sent anywhere.
 */
export default function CsvUpload({ onLoad, onError, label = 'Upload CSV', variant = 'button' }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFile(file) {
    setBusy(true);
    try {
      const text = await readFileAsText(file);
      const parsed = parseCSV(text);
      onLoad({ ...parsed, fileName: file.name });
    } catch (err) {
      onError?.(friendlyError(err, 'The file could not be processed. Please upload a valid CSV file.'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const dropProps = {
    onDragOver: (e) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
  };

  const input = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept=".csv,text/csv,.txt"
      className="sr-only"
      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
    />
  );

  if (variant === 'dropzone') {
    return (
      <div className={`dropzone ${dragging ? 'is-dragging' : ''}`} {...dropProps}>
        {input}
        <Icon name="upload" size={26} />
        <div>
          <strong>{busy ? 'Reading file…' : 'Drop a CSV file here'}</strong>
          <p className="muted">or</p>
        </div>
        <label htmlFor={inputId} className="btn btn--secondary" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}>
          Browse files
        </label>
        <p className="dropzone__note">Max 5 MB · processed locally, never uploaded</p>
      </div>
    );
  }

  return (
    <span {...dropProps} className={dragging ? 'is-dragging' : ''}>
      {input}
      <label
        htmlFor={inputId}
        className="btn btn--secondary"
        tabIndex={0}
        role="button"
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inputRef.current?.click())}
        title="CSV files are processed locally in your browser"
      >
        {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="upload" size={16} />}
        {busy ? 'Reading…' : label}
      </label>
    </span>
  );
}
