import Icon from './Icon.jsx';

const PARTS = [
  ['what', 'What is calculated?', 'target'],
  ['why', 'Why?', 'info'],
  ['how', 'How?', 'layers'],
  ['meaning', 'What does it mean?', 'spark'],
];

/**
 * Beginner-friendly explanation of the current step. Updates whenever the step changes.
 * explanation: { what, why, how, meaning }
 */
export default function ExplainStep({ explanation, stepLabel }) {
  if (!explanation) return null;
  return (
    <section className="card explain-step" aria-live="polite" aria-labelledby="explain-step-title">
      <div className="explain-step__head">
        <Icon name="book" size={17} />
        <h2 id="explain-step-title">Explain this step</h2>
        {stepLabel && <span className="badge badge--soft">{stepLabel}</span>}
      </div>
      <dl className="explain-step__list" key={stepLabel}>
        {PARTS.map(([key, label, icon]) =>
          explanation[key] ? (
            <div key={key} className="explain-step__item">
              <dt>
                <Icon name={icon} size={14} /> {label}
              </dt>
              <dd>{explanation[key]}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}
