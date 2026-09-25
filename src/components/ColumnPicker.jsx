import { numericColumnIndices } from '../utils/csvParser.js';

/** Build {x, y[, label]} points from chosen CSV columns, skipping incomplete rows. */
export function pointsFromColumns(rows, xi, yi, li = null) {
  const points = [];
  let skipped = 0;
  for (const r of rows) {
    const x = r[xi];
    const y = r[yi];
    const label = li === null ? undefined : r[li];
    if (typeof x !== 'number' || typeof y !== 'number' || (li !== null && (label === null || label === undefined))) {
      skipped++;
      continue;
    }
    points.push(li === null ? { x, y } : { x, y, label: String(label) });
  }
  return { points, skipped };
}

/** Pick default columns for an uploaded CSV, or explain why it cannot be used. */
export function defaultColumns(upload, needLabel = false) {
  const numeric = numericColumnIndices(upload.headers, upload.rows);
  if (numeric.length < 2) {
    return { error: `Please upload a CSV file containing at least two numerical columns. "${upload.fileName}" has ${numeric.length}.` };
  }
  const cols = { x: numeric[0], y: numeric[1], label: null };
  if (needLabel) {
    const nonNumeric = upload.headers.map((_, i) => i).filter((i) => !numeric.includes(i));
    // Prefer a text column for the class label, otherwise the last column.
    cols.label = nonNumeric.length ? nonNumeric[nonNumeric.length - 1] : upload.headers.length - 1;
    if (cols.label === cols.x || cols.label === cols.y) {
      const spare = numeric.find((i) => i !== cols.x && i !== cols.y);
      if (spare === undefined) return { error: 'Please upload a CSV file with two numerical feature columns plus one class-label column.' };
      cols.label = spare;
    }
  }
  return { cols };
}

export default function ColumnPicker({ upload, cols, onChange, needLabel = false }) {
  const numeric = numericColumnIndices(upload.headers, upload.rows);
  const select = (key, label, options) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <select value={cols[key]} onChange={(e) => onChange({ ...cols, [key]: Number(e.target.value) })}>
        {options.map((i) => (
          <option key={i} value={i}>
            {upload.headers[i]}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="column-picker">
      <span className="column-picker__file" title={upload.fileName}>
        {upload.fileName}
      </span>
      {select('x', 'X axis', numeric)}
      {select('y', 'Y axis', numeric)}
      {needLabel && select('label', 'Class label', upload.headers.map((_, i) => i))}
    </div>
  );
}
