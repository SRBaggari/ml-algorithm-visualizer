import { UserError } from './errors.js';
// Browser-only CSV parsing. Files are read with FileReader and never uploaded anywhere.

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ROWS = 5000;
const MISSING_TOKENS = new Set(['', 'na', 'n/a', 'nan', 'null', 'none', '?', '-']);

export function isMissingToken(value) {
  return value === null || value === undefined || MISSING_TOKENS.has(String(value).trim().toLowerCase());
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== '') || '';
  let best = ',';
  let bestCount = 0;
  for (const d of [',', ';', '\t']) {
    let count = 0;
    let inQuotes = false;
    for (const ch of firstLine) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === d && !inQuotes) count++;
    }
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

// RFC-4180 style tokenizer: quoted fields, escaped quotes ("") and newlines inside quotes.
function tokenize(text, delimiter) {
  const records = [];
  let record = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (inQuotes) throw new UserError('The CSV has an unclosed quote ("). Please check the file formatting.');
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

/** Convert a raw cell: numeric strings become numbers, missing tokens become null. */
export function convertValue(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const v = String(raw).trim();
  if (isMissingToken(v)) return null;
  if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(v)) return Number(v);
  return v;
}

/**
 * Parse CSV text into { headers, rows, warnings }.
 * Throws an Error with a friendly message when the file cannot be used.
 */
export function parseCSV(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new UserError('The file is empty. Please upload a CSV file with a header row and at least one data row.');
  }
  const clean = text.replace(/^﻿/, ''); // strip a UTF-8 byte-order mark
  if (clean.includes('\u0000')) throw new UserError('This does not look like a text CSV file (binary content detected).');
  const delimiter = detectDelimiter(clean);
  const records = tokenize(clean, delimiter).filter((r) => r.some((v) => v.trim() !== ''));
  if (records.length < 2) {
    throw new UserError('The CSV needs a header row and at least one data row.');
  }
  const warnings = [];
  const seen = {};
  const headers = records[0].map((h, i) => {
    let name = h.trim() || `Column ${i + 1}`;
    if (seen[name]) {
      seen[name] += 1;
      name = `${name}_${seen[name]}`;
      warnings.push(`Duplicate column name renamed to "${name}".`);
    } else {
      seen[name] = 1;
    }
    return name;
  });

  let body = records.slice(1);
  if (body.length > MAX_ROWS) {
    warnings.push(`Only the first ${MAX_ROWS} rows were loaded (the file has ${body.length}).`);
    body = body.slice(0, MAX_ROWS);
  }
  let ragged = 0;
  const rows = body.map((r) => {
    if (r.length !== headers.length) ragged++;
    return headers.map((_, i) => convertValue(r[i]));
  });
  if (ragged > 0) {
    warnings.push(
      `${ragged} row(s) had a different number of values than the header. Missing cells were treated as empty and extra cells were ignored.`,
    );
  }
  return { headers, rows, warnings, delimiter };
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new UserError('No file was selected.'));
      return;
    }
    if (!/\.(csv|txt|tsv)$/i.test(file.name)) {
      reject(new UserError(`"${file.name}" is not a CSV file. Please choose a .csv file.`));
      return;
    }
    if (file.size === 0) {
      reject(new UserError('The selected file is empty.'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      reject(new UserError('The file is larger than 5 MB. Please use a smaller dataset for visualization.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new UserError('The file could not be read. Please try again.'));
    reader.readAsText(file);
  });
}

function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(headers, rows) {
  return [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
}

export function downloadText(filename, text, type = 'text/csv') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Indices of columns whose non-missing values are all numbers. */
export function numericColumnIndices(headers, rows) {
  return headers
    .map((_, i) => i)
    .filter((i) => {
      const vals = rows.map((r) => r[i]).filter((v) => v !== null);
      return vals.length > 0 && vals.every((v) => typeof v === 'number');
    });
}
