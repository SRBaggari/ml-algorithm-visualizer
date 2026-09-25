import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import MetricsCard from '../components/MetricsCard.jsx';
import ReportButton from '../components/ReportButton.jsx';
import { Alert, Card, PageHeader, Segmented } from '../components/ui.jsx';
import { useApp } from '../context/AppContext.jsx';
import { QUESTION_TYPES, QUIZ_QUESTIONS } from '../data/quizQuestions.js';
import { getTopic } from '../data/learningContent.js';
import { createRng, randomSeed, shuffle } from '../utils/random.js';

const TIME_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 30, label: '30 s' },
  { value: 60, label: '60 s' },
];
const LENGTH_OPTIONS = [
  { value: 10, label: '10 questions' },
  { value: 20, label: '20 questions' },
  { value: 0, label: `All ${QUIZ_QUESTIONS.length}` },
];
const TIMED_OUT = -1;

// Which lesson to revise for each quiz topic.
const TOPIC_LESSON = {
  Preprocessing: 'preprocessing',
  'Train/Test Split': 'train-test-split',
  'Linear Regression': 'linear-regression',
  KNN: 'knn',
  'Decision Tree': 'decision-tree',
  Entropy: 'decision-tree',
  'Information Gain': 'decision-tree',
  'K-Means': 'kmeans',
  'Confusion Matrix': 'evaluation',
  Accuracy: 'evaluation',
  Precision: 'evaluation',
  Recall: 'evaluation',
  'F1 Score': 'evaluation',
};

const TYPE_COUNTS = QUIZ_QUESTIONS.reduce((acc, q) => ({ ...acc, [q.type]: (acc[q.type] || 0) + 1 }), {});

export default function Quiz() {
  const { progress, recordQuiz } = useApp();
  const [phase, setPhase] = useState('setup');
  const [settings, setSettings] = useState({ length: 10, timer: 0, shuffle: true });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [newBest, setNewBest] = useState(false);

  const q = questions[index];
  const answered = answers[index] !== undefined && answers[index] !== null;
  const score = answers.filter((a, i) => a === questions[i]?.answer).length;
  const best = progress.quiz.best;

  function start() {
    let pool = settings.shuffle ? shuffle(QUIZ_QUESTIONS, createRng(randomSeed())) : [...QUIZ_QUESTIONS];
    if (settings.length) pool = pool.slice(0, settings.length);
    setQuestions(pool);
    setAnswers(Array(pool.length).fill(null));
    setIndex(0);
    setTimeLeft(settings.timer);
    setReviewFilter('all');
    setPhase('quiz');
  }

  const choose = useCallback(
    (option) => {
      if (phase !== 'quiz' || answered) return;
      setAnswers((a) => a.map((v, i) => (i === index ? option : v)));
    },
    [phase, answered, index],
  );

  function finish() {
    const finalScore = answers.filter((a, i) => a === questions[i].answer).length;
    const percent = Math.round((finalScore / questions.length) * 100);
    setNewBest(!best || percent > best.percent);
    recordQuiz(finalScore, questions.length);
    setPhase('results');
  }

  const goTo = useCallback(
    (i) => {
      setIndex(i);
      setTimeLeft(settings.timer);
    },
    [settings.timer],
  );

  // Per-question countdown. It only runs while the current question is unanswered.
  useEffect(() => {
    if (phase !== 'quiz' || !settings.timer || answered) return undefined;
    if (timeLeft <= 0) {
      setAnswers((a) => a.map((v, i) => (i === index ? TIMED_OUT : v)));
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, settings.timer, answered, timeLeft, index]);

  // Keyboard shortcuts: 1-4 pick an answer, arrows move between questions.
  useEffect(() => {
    if (phase !== 'quiz') return undefined;
    const onKey = (e) => {
      if (e.target.closest('input, select, textarea')) return;
      const n = Number(e.key);
      if (n >= 1 && n <= (q?.options.length || 0)) choose(n - 1);
      else if (e.key === 'ArrowRight' && index < questions.length - 1) goTo(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) goTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, q, choose, index, questions.length, goTo]);

  const byTopic = useMemo(() => {
    const out = {};
    questions.forEach((qq, i) => {
      out[qq.topic] = out[qq.topic] || { correct: 0, total: 0 };
      out[qq.topic].total++;
      if (answers[i] === qq.answer) out[qq.topic].correct++;
    });
    return Object.entries(out);
  }, [questions, answers]);

  if (phase === 'setup') {
    return (
      <div className="page">
        <PageHeader icon="quiz" eyebrow="Learn" title="ML Quiz" subtitle={`${QUIZ_QUESTIONS.length} offline questions on preprocessing, algorithms and evaluation metrics.`} />
        <div className="grid-2">
          <Card title="Quiz settings" icon="layers">
            <div className="form-stack">
              <div className="field">
                <span className="field__label">Length</span>
                <Segmented label="Quiz length" value={settings.length} onChange={(v) => setSettings({ ...settings, length: v })} options={LENGTH_OPTIONS} />
              </div>
              <div className="field">
                <span className="field__label">Timer per question</span>
                <Segmented label="Timer" value={settings.timer} onChange={(v) => setSettings({ ...settings, timer: v })} options={TIME_OPTIONS} />
              </div>
              <label className="check">
                <input type="checkbox" checked={settings.shuffle} onChange={(e) => setSettings({ ...settings, shuffle: e.target.checked })} />
                <span>Shuffle questions</span>
              </label>
              <button type="button" className="btn btn--primary btn--lg" onClick={start}>
                <Icon name="play" size={16} /> Start quiz
              </button>
            </div>
          </Card>
          <Card title="Your record" icon="trophy">
            {best ? (
              <div className="record">
                <div className="record__big">{best.percent}%</div>
                <p>
                  Best score: {best.score} / {best.total} · {progress.quiz.attempts} attempt{progress.quiz.attempts === 1 ? '' : 's'}
                </p>
                {progress.quiz.last && (
                  <p className="muted small">
                    Last attempt: {progress.quiz.last.score} / {progress.quiz.last.total} ({progress.quiz.last.percent}%)
                  </p>
                )}
              </div>
            ) : (
              <p className="muted">No attempts yet. Your best score will be saved in this browser.</p>
            )}
            <div className="tag-cloud type-counts">
              {Object.entries(QUESTION_TYPES).map(([key, label]) => (
                <span key={key} className="tag">
                  {label}: {TYPE_COUNTS[key] || 0}
                </span>
              ))}
            </div>
            <ul className="plain-list small muted">
              <li>Instant feedback after each answer, with an explanation.</li>
              <li>Keyboard: press 1-4 to answer, ← → to move.</li>
              <li>Review every question at the end.</li>
            </ul>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const percent = Math.round((score / questions.length) * 100);
    const unanswered = answers.filter((a) => a === null || a === TIMED_OUT).length;
    const incorrect = questions.length - score - unanswered;
    const toRevise = byTopic.filter(([, t]) => t.correct < t.total).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
    const review = questions.map((qq, i) => ({ q: qq, a: answers[i], i })).filter((r) => reviewFilter === 'all' || r.a !== r.q.answer);
    return (
      <div className="page">
        <PageHeader
          icon="trophy"
          eyebrow="Learn"
          title="Quiz results"
          actions={
            <ReportButton
              getReport={() => ({
                algorithm: 'ML Quiz',
                dataset: `${questions.length} questions`,
                parameters: { timerSeconds: settings.timer || 'off', shuffled: settings.shuffle },
                results: { correct: score, incorrect, unanswered, topicsToRevise: toRevise.map(([t]) => t) },
                metrics: { percentage: percent, ...Object.fromEntries(byTopic.map(([t, v]) => [t, `${v.correct}/${v.total}`])) },
              })}
            />
          }
        />
        <div className="stats-grid">
          <MetricsCard label="Score" value={score} format={(v) => `${Math.round(v)} / ${questions.length}`} />
          <MetricsCard label="Correct" value={score} tone="accent" />
          <MetricsCard label="Incorrect" value={incorrect} tone={incorrect ? 'warn' : 'default'} footer={unanswered ? <span className="muted">+ {unanswered} unanswered</span> : null} />
          <MetricsCard label="Percentage" value={percent} format={(v) => `${Math.round(v)}%`} />
        </div>
        <div className="grid-2">
          <Card>
            <div className="result-hero">
              <div className="score-ring" style={{ '--p': percent }}>
                <span>{percent}%</span>
              </div>
              <div>
                <h2>
                  {score} / {questions.length} correct
                </h2>
                <p className="muted">{percent >= 80 ? 'Excellent work!' : percent >= 50 ? 'Good effort - review the explanations below.' : 'Keep practising - the lessons and visualizers will help.'}</p>
                {newBest && <span className="badge badge--green">New best score saved</span>}
                {best && (
                  <p className="small muted">
                    Best score: {best.percent}% ({best.score}/{best.total})
                  </p>
                )}
                <div className="btn-row">
                  <button type="button" className="btn btn--primary" onClick={start}>
                    <Icon name="reset" size={16} /> Retake quiz
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => setPhase('setup')}>
                    Settings
                  </button>
                  <Link to="/learn" className="btn btn--ghost">
                    <Icon name="book" size={16} /> Lessons
                  </Link>
                </div>
              </div>
            </div>
          </Card>
          <Card title="Topics to revise" icon="flag" subtitle={toRevise.length ? 'Weakest first - open the lesson to review.' : 'Nothing to revise - every topic was answered correctly.'}>
            {toRevise.length > 0 && (
              <ul className="revise-list">
                {toRevise.map(([topic, s]) => {
                  const lesson = getTopic(TOPIC_LESSON[topic]);
                  return (
                    <li key={topic}>
                      <span>
                        <strong>{topic}</strong> <span className="muted small">({s.correct}/{s.total} correct)</span>
                      </span>
                      {lesson && (
                        <Link to={`/learn?topic=${lesson.id}`} className="btn btn--ghost btn--sm">
                          Review lesson <Icon name="arrowRight" size={14} />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
        <div className="grid-2">
          <Card title="Score by topic" icon="compare">
            <ul className="topic-scores">
              {byTopic.map(([topic, s]) => (
                <li key={topic}>
                  <span>{topic}</span>
                  <div className="progress-bar">
                    <span style={{ width: `${(s.correct / s.total) * 100}%` }} />
                  </div>
                  <span className="muted small">
                    {s.correct}/{s.total}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Question types" icon="layers">
            <ul className="topic-scores">
              {Object.entries(QUESTION_TYPES).map(([key, label]) => {
                const idx = questions.map((q, i) => (q.type === key ? i : -1)).filter((i) => i >= 0);
                if (!idx.length) return null;
                const ok = idx.filter((i) => answers[i] === questions[i].answer).length;
                return (
                  <li key={key}>
                    <span>{label}</span>
                    <div className="progress-bar">
                      <span style={{ width: `${(ok / idx.length) * 100}%` }} />
                    </div>
                    <span className="muted small">
                      {ok}/{idx.length}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
        <Card
          title="Review answers"
          icon="check"
          actions={
            <Segmented
              size="sm"
              label="Review filter"
              value={reviewFilter}
              onChange={setReviewFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'wrong', label: 'Incorrect only' },
              ]}
            />
          }
        >
          {review.length === 0 && <p className="muted">No incorrect answers - perfect!</p>}
          <ol className="review-list">
            {review.map(({ q: qq, a, i }) => {
              const correct = a === qq.answer;
              return (
                <li key={i} className={correct ? 'is-correct' : 'is-wrong'}>
                  <div className="review-list__head">
                    <span className={`badge badge--${correct ? 'green' : 'red'}`}>{correct ? 'Correct' : a === TIMED_OUT ? 'Time up' : a === null ? 'Skipped' : 'Incorrect'}</span>
                    <span className="tag">{qq.topic}</span>
                  </div>
                  <p className="review-list__q">
                    {i + 1}. {qq.question}
                  </p>
                  {!correct && a !== null && a !== TIMED_OUT && (
                    <p className="small">
                      Your answer: <span className="text-danger">{qq.options[a]}</span>
                    </p>
                  )}
                  <p className="small">
                    Correct answer: <strong>{qq.options[qq.answer]}</strong>
                  </p>
                  <p className="small muted">{qq.explanation}</p>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    );
  }

  const answeredCount = answers.filter((a) => a !== null).length;
  const a = answers[index];
  return (
    <div className="page quiz-page">
      <div className="quiz-top">
        <div>
          <span className="eyebrow">
            {q.topic} · {QUESTION_TYPES[q.type]}
          </span>
          <div className="quiz-top__count">
            Question {index + 1} of {questions.length}
          </div>
        </div>
        <div className="quiz-top__right">
          {settings.timer > 0 && (
            <span className={`timer ${timeLeft <= 5 && !answered ? 'is-low' : ''}`} aria-live="off">
              <Icon name="clock" size={15} /> {answered ? '—' : `${timeLeft}s`}
            </span>
          )}
          <span className="badge badge--soft">
            Score: {score} / {answeredCount}
          </span>
        </div>
      </div>
      <div className="progress-bar progress-bar--lg" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount} aria-label="Questions answered">
        <span style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
      </div>
      <div className="quiz-dots" aria-label="Jump to question">
        {questions.map((qq, i) => {
          const st = answers[i] === null ? '' : answers[i] === qq.answer ? 'is-correct' : 'is-wrong';
          return (
            <button key={i} type="button" className={`quiz-dot ${st} ${i === index ? 'is-current' : ''}`} onClick={() => goTo(i)} aria-label={`Question ${i + 1}`}>
              {i + 1}
            </button>
          );
        })}
      </div>

      <Card className="question-card" key={index}>
        <h2 className="question">{q.question}</h2>
        <div className="options" role="radiogroup" aria-label="Answer options">
          {q.options.map((opt, i) => {
            let state = '';
            if (answered) {
              if (i === q.answer) state = 'is-correct';
              else if (i === a) state = 'is-wrong';
              else state = 'is-disabled';
            }
            return (
              <button key={opt} type="button" role="radio" aria-checked={a === i} className={`option ${state}`} onClick={() => choose(i)} disabled={answered}>
                <span className="option__key">{String.fromCharCode(65 + i)}</span>
                <span className="option__text">{opt}</span>
                {answered && i === q.answer && <Icon name="check" size={18} strokeWidth={2.6} />}
                {answered && i === a && i !== q.answer && <Icon name="x" size={18} strokeWidth={2.6} />}
              </button>
            );
          })}
        </div>
        {answered && (
          <Alert type={a === q.answer ? 'success' : 'error'} title={a === q.answer ? 'Correct!' : a === TIMED_OUT ? 'Time is up' : 'Not quite'}>
            {q.explanation}
          </Alert>
        )}
      </Card>

      <div className="quiz-nav">
        <button type="button" className="btn btn--ghost" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <Icon name="prev" size={16} /> Previous
        </button>
        {index < questions.length - 1 ? (
          <button type="button" className="btn btn--primary" onClick={() => goTo(index + 1)}>
            Next <Icon name="next" size={16} />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (answeredCount < questions.length && !window.confirm(`${questions.length - answeredCount} question(s) are unanswered. Submit anyway?`)) return;
              finish();
            }}
          >
            <Icon name="flag" size={16} /> Submit quiz
          </button>
        )}
      </div>
    </div>
  );
}
