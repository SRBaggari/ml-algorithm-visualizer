// Learning-result reports, generated and downloaded entirely in the browser.
import { downloadText } from './csvParser.js';

export function buildReport({ algorithm, dataset, parameters = {}, results = {}, metrics = {} }) {
  return {
    app: 'ML Algorithm Visualizer',
    generatedAt: new Date().toISOString(),
    algorithm,
    dataset,
    parameters,
    results,
    metrics,
  };
}

function formatValue(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)));
  if (v === null || v === undefined) return 'n/a';
  if (Array.isArray(v)) return v.map(formatValue).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Plain-text version of a report, easy to paste into notes or an assignment. */
export function reportToText(report) {
  const lines = [`${report.app} - Report`, `Generated: ${report.generatedAt}`, '', `Algorithm: ${report.algorithm}`, `Dataset:   ${report.dataset}`];
  for (const section of ['parameters', 'results', 'metrics']) {
    const entries = Object.entries(report[section] || {});
    if (!entries.length) continue;
    lines.push('', `${section[0].toUpperCase()}${section.slice(1)}:`);
    for (const [k, v] of entries) lines.push(`  - ${k}: ${formatValue(v)}`);
  }
  return lines.join('\n');
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function downloadReport(report, format = 'json') {
  const base = `${slugify(report.algorithm)}-report`;
  if (format === 'txt') downloadText(`${base}.txt`, reportToText(report), 'text/plain');
  else downloadText(`${base}.json`, JSON.stringify(report, null, 2), 'application/json');
}
