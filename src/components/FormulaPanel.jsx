import Icon from './Icon.jsx';
import { FORMULAS } from '../data/formulas.js';

/**
 * The formulas behind an algorithm, each with a short plain-language explanation.
 * `active` lists formula ids used by the current step; they are highlighted.
 */
export default function FormulaPanel({ algorithm, active = [], title = 'Formulas' }) {
  const formulas = FORMULAS[algorithm] || [];
  return (
    <section className="card formula-panel" aria-labelledby={`formulas-${algorithm}`}>
      <div className="card__head">
        <div className="card__title">
          <Icon name="table" size={17} />
          <div>
            <h2 id={`formulas-${algorithm}`}>{title}</h2>
            <p className="card__subtitle">{active.length ? 'Highlighted: the formula used in the current step.' : 'The math behind every calculation on this page.'}</p>
          </div>
        </div>
      </div>
      <ul className="formula-grid">
        {formulas.map((f) => {
          const isActive = active.includes(f.id);
          return (
            <li key={f.id} className={`formula-item ${isActive ? 'is-active' : ''}`} aria-current={isActive ? 'true' : undefined}>
              <span className="formula-item__name">
                {f.name}
                {isActive && <span className="badge badge--accent">current step</span>}
              </span>
              <code className="formula-item__expr">{f.formula}</code>
              <span className="formula-item__explain">{f.explanation}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
