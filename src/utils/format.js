// Number formatting helpers used across the UI.
export function fmt(value, digits = 2) {
  if (value === null || value === undefined) return '—';
  if (typeof value !== 'number') return String(value);
  if (!Number.isFinite(value)) return value > 0 ? '∞' : value < 0 ? '−∞' : 'NaN';
  if (Number.isInteger(value) && Math.abs(value) < 1e7) return String(value);
  const fixed = value.toFixed(digits);
  // Trim trailing zeros ("0.50" -> "0.5", "2.00" -> "2").
  const trimmed = fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
  return trimmed === '-0' ? '0' : trimmed;
}

export function pct(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

// "+ 3.2" / "− 3.2" for writing equations like y = 2x + 3.
export function signed(value, digits = 2) {
  if (!Number.isFinite(value)) return fmt(value, digits);
  return value < 0 ? `− ${fmt(Math.abs(value), digits)}` : `+ ${fmt(value, digits)}`;
}

// Wrap negative numbers in parentheses when substituting into formulas.
export function paren(value, digits = 2) {
  return value < 0 ? `(${fmt(value, digits)})` : fmt(value, digits);
}

export function timeAgo(timestamp) {
  const s = Math.round((Date.now() - timestamp) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}
