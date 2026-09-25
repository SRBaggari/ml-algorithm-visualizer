import { useState } from 'react';
import { fmt } from '../utils/format.js';

function renderCell(v) {
  if (v === null || v === undefined || v === '') return <span className="cell-missing">missing</span>;
  if (typeof v === 'number') return fmt(v, 3);
  return String(v);
}

/**
 * Generic dataset preview.
 * rows: [{ id, values }] - `highlights` maps "rowId:colIndex" -> css modifier,
 * `rowClass` maps rowId -> css modifier (e.g. "removed", "duplicate").
 */
export default function DatasetTable({
  headers,
  rows,
  highlights = {},
  rowClass = {},
  columnTypes,
  maxRows = 12,
  caption,
  showIndex = true,
  animateKey,
}) {
  const [expanded, setExpanded] = useState(false);
  if (!headers || headers.length === 0) return null;
  const visible = expanded ? rows : rows.slice(0, maxRows);
  return (
    <div className="table-wrap">
      <table className="data-table" key={animateKey}>
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {showIndex && <th scope="col" className="data-table__index">#</th>}
            {headers.map((h, i) => (
              <th scope="col" key={h}>
                <span>{h}</span>
                {columnTypes && columnTypes[i] && <span className={`type-pill type-pill--${columnTypes[i]}`}>{columnTypes[i] === 'numeric' ? '123' : 'abc'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.id} className={rowClass[row.id] ? `row--${rowClass[row.id]}` : ''}>
              {showIndex && <td className="data-table__index">{row.id}</td>}
              {row.values.map((v, c) => {
                const mod = highlights[`${row.id}:${c}`];
                return (
                  <td key={c} className={mod ? `cell--${mod}` : ''}>
                    {renderCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length + (showIndex ? 1 : 0)} className="muted center">
                No rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <button type="button" className="btn btn--ghost btn--sm table-more" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show fewer rows' : `Show all ${rows.length} rows`}
        </button>
      )}
    </div>
  );
}
