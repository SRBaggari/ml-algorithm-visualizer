import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Icon from '../components/Icon.jsx';
import LearningPanel, { MarkLearnedButton } from '../components/LearningPanel.jsx';
import { PageHeader } from '../components/ui.jsx';
import { useApp } from '../context/AppContext.jsx';
import { LEARNING_TOPICS } from '../data/learningContent.js';

export default function Learn() {
  const { progress, resetProgress } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const [params, setParams] = useSearchParams();
  const topic = LEARNING_TOPICS.find((t) => t.id === params.get('topic')) || LEARNING_TOPICS[0];
  const index = LEARNING_TOPICS.indexOf(topic);
  const learnedCount = LEARNING_TOPICS.filter((t) => progress.completed[t.id]).length;

  const go = (t) => setParams({ topic: t.id });

  return (
    <div className="page">
      <PageHeader
        icon="book"
        eyebrow="Learn"
        title="Learning Mode"
        subtitle="Short, beginner-friendly lessons with expandable sections. Mark each one as learned to track your progress (saved in this browser)."
        actions={
          <div className="learn-progress">
            <span>
              {learnedCount} / {LEARNING_TOPICS.length} lessons learned
            </span>
            <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={LEARNING_TOPICS.length} aria-valuenow={learnedCount} aria-label="Lessons learned">
              <span style={{ width: `${(learnedCount / LEARNING_TOPICS.length) * 100}%` }} />
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmReset(true)}>
              <Icon name="trash" size={14} /> Reset Learning Progress
            </button>
          </div>
        }
      />

      <div className="learn-layout">
        <nav className="topic-tabs" aria-label="Lessons">
          {LEARNING_TOPICS.map((t) => (
            <button key={t.id} type="button" className={`topic-tab ${t.id === topic.id ? 'is-active' : ''}`} onClick={() => go(t)} aria-current={t.id === topic.id ? 'page' : undefined}>
              <Icon name={t.icon} size={16} />
              <span>{t.title}</span>
              {progress.completed[t.id] && (
                <span className="topic-tab__done" title="Learned">
                  <Icon name="check" size={13} strokeWidth={3} />
                  <span className="sr-only">(learned)</span>
                </span>
              )}
            </button>
          ))}
        </nav>

        <article className="lesson" key={topic.id} aria-labelledby="lesson-title">
          <div className="lesson__head">
            <div>
              <span className="eyebrow">
                Lesson {index + 1} of {LEARNING_TOPICS.length}
              </span>
              <h2 id="lesson-title">{topic.title}</h2>
            </div>
            <div className="btn-row">
              <Link to={topic.path} className="btn btn--secondary">
                <Icon name="eye" size={16} /> Try the visualizer
              </Link>
              <MarkLearnedButton topic={topic} />
            </div>
          </div>

          <LearningPanel topic={topic} />

          <div className="lesson__nav">
            <button type="button" className="btn btn--ghost" onClick={() => go(LEARNING_TOPICS[index - 1])} disabled={index === 0}>
              <Icon name="prev" size={16} /> Previous lesson
            </button>
            {index < LEARNING_TOPICS.length - 1 ? (
              <button type="button" className="btn btn--secondary" onClick={() => go(LEARNING_TOPICS[index + 1])}>
                Next lesson <Icon name="next" size={16} />
              </button>
            ) : (
              <Link to="/quiz" className="btn btn--primary">
                Take the quiz <Icon name="arrowRight" size={16} />
              </Link>
            )}
          </div>
        </article>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset learning progress?"
        confirmLabel="Reset progress"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetProgress();
          setConfirmReset(false);
        }}
      >
        This clears learned lessons, opened and completed algorithms, quiz scores and recent activity on this device. This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
