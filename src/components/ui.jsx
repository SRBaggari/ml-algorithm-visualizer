// Small presentational building blocks shared by every page.
import Icon from './Icon.jsx';
import { MarkerSwatch } from './Marker.jsx';

export function PageHeader({ icon, title, subtitle, actions, eyebrow }) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        {icon && (
          <span className="page-header__icon" aria-hidden="true">
            <Icon name={icon} size={22} />
          </span>
        )}
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

const ALERT_ICONS = { error: 'alert', warning: 'alert', info: 'info', success: 'check' };

export function Alert({ type = 'info', title, children, onClose }) {
  return (
    <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICONS[type]} size={18} />
      <div className="alert__body">
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
      {onClose && (
        <button type="button" className="alert__close" onClick={onClose} aria-label="Dismiss message">
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'spark', title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Card({ title, icon, actions, children, className = '', subtitle }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card__head">
          <div className="card__title">
            {icon && <Icon name={icon} size={17} />}
            <div>
              <h2>{title}</h2>
              {subtitle && <p className="card__subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Accessible segmented control (radio group). */
export function Segmented({ options, value, onChange, label, size }) {
  return (
    <div className={`segmented ${size === 'sm' ? 'segmented--sm' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const opt = typeof o === 'object' ? o : { value: o, label: String(o) };
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            className={`segmented__btn ${active ? 'is-active' : ''}`}
            onClick={() => onChange(opt.value)}
            disabled={opt.disabled}
            title={opt.title}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Explain({ title = 'In plain words', children }) {
  return (
    <div className="explain">
      <div className="explain__title">
        <Icon name="book" size={15} /> {title}
      </div>
      <div className="explain__body">{children}</div>
    </div>
  );
}

export function Formula({ children }) {
  return <div className="formula">{children}</div>;
}

/** items: [{ label, color, shape?: 'ring'|'line'|'star'|'diamond', marker?: shape index for Marker }] */
export function Legend({ items }) {
  return (
    <ul className="legend">
      {items.map((it) => (
        <li key={it.label}>
          {it.marker !== undefined ? (
            <MarkerSwatch shape={it.marker} color={it.color} />
          ) : (
            <span className={`legend__swatch ${it.shape ? `legend__swatch--${it.shape}` : ''}`} style={{ '--c': it.color }} />
          )}
          {it.label}
        </li>
      ))}
    </ul>
  );
}
