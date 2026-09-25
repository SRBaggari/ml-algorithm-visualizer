import Icon from './Icon.jsx';
import { SPEEDS } from '../hooks/useStepPlayer.js';

/**
 * The global step controller used by every visualization.
 * Pairs with useStepPlayer(): Previous / Play / Pause / Next / Reset,
 * "Step 3 of 6", the current step's description, a progress bar and a clickable step list.
 *
 * steps: [{ id, title, short?, description? }]
 */
export default function StepController({ player, steps = [], disabled = false, compact = false, emptyText = 'Not started' }) {
  const { step, total, playing, next, prev, play, pause, reset, goTo, speed, setSpeed, isFirst, isLast } = player;
  const current = steps[step];
  const off = disabled || total === 0;

  return (
    <div className={`step-controls ${compact ? 'step-controls--compact' : ''}`} role="group" aria-label="Step controller">
      <div className="step-controls__top">
        <div className="step-controls__status" aria-live="polite">
          <span className="step-controls__count">
            {off ? (
              emptyText
            ) : (
              <>
                Step <strong>{step + 1}</strong> of {total}
                {playing && <span className="step-controls__playing"> · playing</span>}
              </>
            )}
          </span>
          {!off && current?.title && <span className="step-controls__title">{current.title}</span>}
          {!off && current?.description && <span className="step-controls__desc">{current.description}</span>}
        </div>
        <div className="step-controls__buttons">
          <button type="button" className="icon-btn" onClick={reset} disabled={off || (isFirst && !playing)} aria-label="Reset to first step" title="Reset">
            <Icon name="reset" />
          </button>
          <button type="button" className="icon-btn" onClick={prev} disabled={off || isFirst} aria-label="Previous step" title="Previous">
            <Icon name="prev" />
          </button>
          {playing ? (
            <button type="button" className="icon-btn icon-btn--primary" onClick={pause} aria-label="Pause" title="Pause">
              <Icon name="pause" />
            </button>
          ) : (
            <button type="button" className="icon-btn icon-btn--primary" onClick={play} disabled={off || total <= 1} aria-label="Play" title="Play">
              <Icon name="play" />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={next} disabled={off || isLast} aria-label="Next step" title="Next">
            <Icon name="next" />
          </button>
          <label className="speed-select" title="Playback speed">
            <span className="sr-only">Playback speed</span>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} disabled={off}>
              {SPEEDS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="progress-bar progress-bar--steps" aria-hidden="true">
        <span style={{ width: off ? '0%' : `${((step + 1) / total) * 100}%` }} />
      </div>
      {!compact && steps.length > 0 && steps.length <= 14 && (
        <ol className="step-list">
          {steps.map((s, i) => (
            <li key={s.id ?? i}>
              <button
                type="button"
                className={`step-chip ${!off && i === step ? 'is-current' : ''} ${!off && i < step ? 'is-done' : ''}`}
                onClick={() => goTo(i)}
                disabled={off}
                aria-current={!off && i === step ? 'step' : undefined}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
              >
                <span className="step-chip__num">{!off && i < step ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
                <span className="step-chip__label">{s.short || s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
