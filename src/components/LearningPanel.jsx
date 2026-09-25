import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useApp } from '../context/AppContext.jsx';

/** Button that toggles a lesson's "learned" state (saved in LocalStorage). */
export function MarkLearnedButton({ topic, size }) {
  const { progress, toggleCompleted } = useApp();
  const done = Boolean(progress.completed[topic.id]);
  return (
    <button
      type="button"
      className={`btn ${done ? 'btn--success' : 'btn--primary'} ${size === 'sm' ? 'btn--sm' : ''}`}
      onClick={() => toggleCompleted(topic.id, topic.title, `/learn?topic=${topic.id}`)}
      aria-pressed={done}
    >
      <Icon name="check" size={size === 'sm' ? 14 : 16} /> {done ? 'Learned' : 'Mark as Learned'}
    </button>
  );
}

function Section({ title, icon, open, children }) {
  return (
    <details className="lesson-section" open={open}>
      <summary>
        <Icon name={icon} size={16} />
        <span>{title}</span>
        <Icon name="next" size={14} className="lesson-section__chevron" />
      </summary>
      <div className="lesson-section__body">{children}</div>
    </details>
  );
}

/**
 * Expandable lesson for one topic. Used full-size in Learning Mode and
 * collapsed ("compact") at the bottom of every algorithm page.
 */
export default function LearningPanel({ topic, compact = false }) {
  const body = (
    <div className="lesson-sections">
      <Section title="Definition" icon="info" open={!compact}>
        <p>{topic.definition}</p>
      </Section>
      <Section title="Intuition" icon="spark" open={!compact}>
        <p>{topic.intuition}</p>
      </Section>
      <Section title="How it works" icon="layers">
        <ol className="how-steps">
          {topic.how.map((s, i) => (
            <li key={s}>
              <span className="how-steps__num">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Mathematical concept" icon="table">
        <dl className="math-list">
          {topic.math.map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd className="formula">{m.formula}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Step-by-step example" icon="flag">
        <p>
          <strong>{topic.example.intro}</strong>
        </p>
        <ol className="example-steps">
          {topic.example.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Section>
      <Section title="Advantages" icon="check">
        <ul className="pro-list">
          {topic.advantages.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Section>
      <Section title="Limitations" icon="alert">
        <ul className="con-list">
          {topic.limitations.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Section>
      <Section title="Real-world applications" icon="target">
        <div className="tag-cloud">
          {topic.uses.map((u) => (
            <span key={u} className="tag">
              {u}
            </span>
          ))}
        </div>
      </Section>
      <Section title="Important terms" icon="book">
        <dl className="terms">
          {topic.keyTerms.map((k) => (
            <div key={k.term}>
              <dt>{k.term}</dt>
              <dd>{k.def}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );

  if (!compact) return body;
  return (
    <section className="card learning-panel" aria-labelledby={`lp-${topic.id}`}>
      <div className="card__head">
        <div className="card__title">
          <Icon name="book" size={17} />
          <div>
            <h2 id={`lp-${topic.id}`}>Learn: {topic.title}</h2>
            <p className="card__subtitle">Expand any section - definition, intuition, math and a worked example.</p>
          </div>
        </div>
        <div className="card__actions">
          <Link to={`/learn?topic=${topic.id}`} className="btn btn--ghost btn--sm">
            Open in Learning Mode
          </Link>
          <MarkLearnedButton topic={topic} size="sm" />
        </div>
      </div>
      {body}
    </section>
  );
}
