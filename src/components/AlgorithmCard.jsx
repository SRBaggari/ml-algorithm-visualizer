import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

const STATUS = {
  completed: { label: 'Completed', icon: 'check', tone: 'green' },
  explored: { label: 'In progress', icon: 'play', tone: 'accent' },
  opened: { label: 'Opened', icon: 'eye', tone: 'soft' },
  new: { label: 'Not started', icon: 'flag', tone: 'soft' },
};

/** Algorithm card: name, explanation, learning type, difficulty, completion status and Explore button. */
export default function AlgorithmCard({ algorithm, status = 'new', learned }) {
  const { name, icon, short, difficulty, path, type, supervision } = algorithm;
  const s = STATUS[status];
  const milestones = [status !== 'new', status === 'explored' || status === 'completed', status === 'completed', learned].filter(Boolean).length;
  return (
    <article className="algo-card">
      <div className="algo-card__top">
        <span className="algo-card__icon" aria-hidden="true">
          <Icon name={icon} size={22} />
        </span>
        <span className={`badge badge--${s.tone}`}>
          <Icon name={s.icon} size={12} strokeWidth={2.6} /> {s.label}
        </span>
      </div>
      <h3>{name}</h3>
      <p>{short}</p>
      <dl className="algo-card__facts">
        <div>
          <dt>Learning</dt>
          <dd>{supervision}</dd>
        </div>
        <div>
          <dt>Task</dt>
          <dd>{type}</dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>{difficulty}</dd>
        </div>
      </dl>
      <div className="algo-card__progress">
        <div className="algo-card__progress-row">
          <span>Progress</span>
          <strong>{milestones * 25}%</strong>
        </div>
        <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={milestones} aria-label={`${name} progress`}>
          <span style={{ width: `${milestones * 25}%` }} />
        </div>
        <p className="muted small">{learned ? 'Lesson learned ✓' : 'Lesson not yet marked as learned'}</p>
      </div>
      <Link to={path} className="btn btn--primary btn--block">
        Explore algorithm <Icon name="arrowRight" size={16} />
      </Link>
    </article>
  );
}
