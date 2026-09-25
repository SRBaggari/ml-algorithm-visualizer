// Shared sections that give every algorithm page the same structure.
import Icon from './Icon.jsx';
import { useApp } from '../context/AppContext.jsx';

/** "What it does" + "What problem it solves" + a first-time tip. */
export function AlgorithmIntro({ guide, onDemo, demoLabel = 'Load demo & start' }) {
  return (
    <section className="algo-intro" aria-label="About this algorithm">
      <div className="algo-intro__item">
        <span className="algo-intro__label">What it does</span>
        <p>{guide.summary}</p>
      </div>
      <div className="algo-intro__item">
        <span className="algo-intro__label">What problem it solves</span>
        <p>{guide.problem}</p>
      </div>
      <div className="algo-intro__item algo-intro__item--action">
        <span className="algo-intro__label">Quick start</span>
        <p>{guide.start}</p>
        {onDemo && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={onDemo}>
            <Icon name="play" size={14} /> {demoLabel}
          </button>
        )}
      </div>
    </section>
  );
}

export function KeyTakeaways({ items }) {
  return (
    <section className="card takeaways" aria-labelledby="takeaways-title">
      <div className="card__head">
        <div className="card__title">
          <Icon name="flag" size={17} />
          <h2 id="takeaways-title">Key takeaways</h2>
        </div>
      </div>
      <ul className="takeaway-list">
        {items.map((t) => (
          <li key={t}>
            <Icon name="check" size={15} strokeWidth={2.4} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * RESULT card with the actual calculated values.
 * rows: [[label, value]], final: [label, value]
 */
export function ResultCard({ algorithm, rows, final, emptyText, children }) {
  return (
    <section className={`card result-card ${final ? 'is-ready' : ''}`} aria-labelledby="result-title" aria-live="polite">
      <div className="result-card__head">
        <span className="result-card__badge">
          <Icon name={final ? 'check' : 'clock'} size={14} strokeWidth={2.4} /> Result
        </span>
        <h2 id="result-title">{algorithm}</h2>
      </div>
      {final ? (
        <>
          <dl className="result-card__rows">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="result-card__final">
            <span>{final[0]}</span>
            <strong>{final[1]}</strong>
          </div>
          {children}
        </>
      ) : (
        <p className="muted">{emptyText}</p>
      )}
    </section>
  );
}

/** A small, dismissible first-time hint. Dismissals are remembered in LocalStorage. */
export function GuideHint({ id, children }) {
  const { progress, dismissHint } = useApp();
  if (progress.hints[id]) return null;
  return (
    <div className="guide-hint" role="note">
      <Icon name="spark" size={16} />
      <span>{children}</span>
      <button type="button" className="guide-hint__close" onClick={() => dismissHint(id)} aria-label="Dismiss tip">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}
