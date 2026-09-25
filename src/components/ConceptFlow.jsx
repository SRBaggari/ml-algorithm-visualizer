import { Fragment } from 'react';
import Icon from './Icon.jsx';

/**
 * A visual pipeline such as "Data → Best-fit line → Prediction".
 * `active` is the index of the current stage (-1 = none yet); earlier stages show as done.
 */
export default function ConceptFlow({ stages, active = -1, label = 'Algorithm flow' }) {
  return (
    <ol className="concept-flow" aria-label={label}>
      {stages.map((s, i) => {
        const state = i < active ? 'is-done' : i === active ? 'is-active' : '';
        return (
          <Fragment key={s.label}>
            <li className={`concept-flow__stage ${state}`} aria-current={i === active ? 'step' : undefined}>
              <span className="concept-flow__icon" aria-hidden="true">
                {i < active ? <Icon name="check" size={14} strokeWidth={2.6} /> : <Icon name={s.icon || 'spark'} size={15} />}
              </span>
              <span className="concept-flow__label">{s.label}</span>
            </li>
            {i < stages.length - 1 && (
              <li className={`concept-flow__arrow ${i < active ? 'is-done' : ''}`} aria-hidden="true">
                <Icon name="arrowRight" size={14} />
              </li>
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
