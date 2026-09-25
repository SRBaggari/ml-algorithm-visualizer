import AnimatedNumber from './AnimatedNumber.jsx';
import InfoTip from './InfoTip.jsx';
import { fmt } from '../utils/format.js';

/** A labelled number with optional formula/tooltip. `value` null renders "—" (undefined metric). */
export default function MetricsCard({ label, value, format, hint, formula, tone = 'default', icon = null, footer }) {
  // Integers count up as integers; other numbers keep two decimals while animating.
  if (!format) format = Number.isInteger(value) ? (v) => String(Math.round(v)) : (v) => fmt(v, 2);
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__label">
        {icon}
        <span>{label}</span>
        {hint && <InfoTip text={hint} label={`About ${label}`} />}
      </div>
      <div className="metric-card__value">
        {value === null || value === undefined ? <span className="muted">—</span> : typeof value === 'number' ? <AnimatedNumber value={value} format={format} /> : value}
      </div>
      {formula && <div className="metric-card__formula">{formula}</div>}
      {footer && <div className="metric-card__footer">{footer}</div>}
    </div>
  );
}
