import AnimatedNumber from './AnimatedNumber.jsx';

export const CM_CELLS = {
  tp: { label: 'TP', name: 'True Positive', desc: 'Actually positive, predicted positive', correct: true },
  fn: { label: 'FN', name: 'False Negative', desc: 'Actually positive, predicted negative (a miss)', correct: false },
  fp: { label: 'FP', name: 'False Positive', desc: 'Actually negative, predicted positive (a false alarm)', correct: false },
  tn: { label: 'TN', name: 'True Negative', desc: 'Actually negative, predicted negative', correct: true },
};

/**
 * 2×2 confusion matrix. `highlight` lists cell keys to emphasise.
 * With `editable`, each cell becomes a number input with −/+ steppers and `values` holds the raw input strings.
 */
export default function ConfusionMatrix({ matrix, highlight = [], positiveLabel = 'Positive', negativeLabel = 'Negative', editable = false, values, onChange }) {
  const total = matrix.tp + matrix.fp + matrix.tn + matrix.fn;

  const cell = (key) => {
    const c = CM_CELLS[key];
    const v = matrix[key];
    const share = total ? v / total : 0;
    const set = (next) => onChange?.(key, String(Math.max(0, next)));
    return (
      <td
        key={key}
        className={`cm-cell ${c.correct ? 'cm-cell--correct' : 'cm-cell--wrong'} ${highlight.includes(key) ? 'is-highlight' : ''} ${highlight.length && !highlight.includes(key) ? 'is-dim' : ''} ${editable ? 'is-editable' : ''}`}
        style={{ '--share': share }}
        title={`${c.name}: ${c.desc}`}
      >
        <span className="cm-cell__tag">
          {c.label} {c.correct ? '✓' : '✗'}
        </span>
        {editable ? (
          <span className="cm-stepper">
            <button type="button" onClick={() => set(v - 1)} disabled={v <= 0} aria-label={`Decrease ${c.name}`}>
              −
            </button>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={values[key]}
              onChange={(e) => onChange?.(key, e.target.value)}
              aria-label={`${c.name} (${c.label}) count`}
            />
            <button type="button" onClick={() => set(v + 1)} aria-label={`Increase ${c.name}`}>
              +
            </button>
          </span>
        ) : (
          <span className="cm-cell__value">
            <AnimatedNumber value={v} format={(x) => Math.round(x)} />
          </span>
        )}
        <span className="cm-cell__name">{c.name}</span>
      </td>
    );
  };

  return (
    <div className="cm-wrap">
      <table className="cm-table">
        <caption className="sr-only">Confusion matrix. Correct predictions (✓) are on the diagonal, mistakes are marked ✗.</caption>
        <thead>
          <tr>
            <th scope="col" className="cm-corner">
              Actual ↓ / Predicted →
            </th>
            <th scope="col">Predicted {positiveLabel}</th>
            <th scope="col">Predicted {negativeLabel}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Actual {positiveLabel}</th>
            {cell('tp')}
            {cell('fn')}
          </tr>
          <tr>
            <th scope="row">Actual {negativeLabel}</th>
            {cell('fp')}
            {cell('tn')}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
