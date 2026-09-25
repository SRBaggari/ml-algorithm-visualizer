import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../utils/storage.js';

const AppContext = createContext(null);

/**
 * Learning progress saved in LocalStorage:
 *  opened    - algorithm pages visited            { id: timestamp }
 *  explored  - algorithms run at least once       { id: timestamp }
 *  finished  - walkthroughs completed to the end  { id: timestamp }  ("algorithms completed")
 *  completed - lessons marked as learned          { topicId: timestamp }
 *  recent    - recently viewed algorithms         [{ id, time }]
 *  quiz      - { best, last, attempts }
 *  activity  - recent actions for the dashboard
 *  hints     - dismissed first-time hints         { hintId: true }
 */
const EMPTY_PROGRESS = { opened: {}, explored: {}, finished: {}, completed: {}, recent: [], quiz: { best: null, attempts: 0 }, activity: [], hints: {} };
const MAX_ACTIVITY = 12;
const MAX_RECENT = 5;

function initialTheme() {
  const saved = loadJSON(STORAGE_KEYS.theme, null);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialProgress() {
  const saved = loadJSON(STORAGE_KEYS.progress, null);
  if (!saved || typeof saved !== 'object') return EMPTY_PROGRESS;
  // Merge with defaults so older saved data (or partially corrupted data) still works.
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  return {
    opened: obj(saved.opened),
    explored: obj(saved.explored),
    finished: obj(saved.finished),
    completed: obj(saved.completed),
    recent: Array.isArray(saved.recent) ? saved.recent.slice(0, MAX_RECENT) : [],
    quiz: { best: null, attempts: 0, ...obj(saved.quiz) },
    activity: Array.isArray(saved.activity) ? saved.activity.slice(0, MAX_ACTIVITY) : [],
    hints: obj(saved.hints),
  };
}

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  const [progress, setProgress] = useState(initialProgress);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveJSON(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.progress, progress);
  }, [progress]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const logActivity = useCallback((text, path, icon = 'spark') => {
    setProgress((p) => {
      const rest = p.activity.filter((a) => a.text !== text);
      return { ...p, activity: [{ text, path, icon, time: Date.now() }, ...rest].slice(0, MAX_ACTIVITY) };
    });
  }, []);

  const markOpened = useCallback((id) => {
    setProgress((p) => {
      const now = Date.now();
      const recent = [{ id, time: now }, ...p.recent.filter((r) => r.id !== id)].slice(0, MAX_RECENT);
      return { ...p, opened: p.opened[id] ? p.opened : { ...p.opened, [id]: now }, recent };
    });
  }, []);

  const markExplored = useCallback(
    (id, text, path, icon) => {
      setProgress((p) => (p.explored[id] ? p : { ...p, explored: { ...p.explored, [id]: Date.now() } }));
      if (text) logActivity(text, path, icon);
    },
    [logActivity],
  );

  const markFinished = useCallback(
    (id, text, path, icon = 'check') => {
      if (progressRef.current.finished[id]) return;
      setProgress((p) => (p.finished[id] ? p : { ...p, finished: { ...p.finished, [id]: Date.now() } }));
      if (text) logActivity(text, path, icon);
    },
    [logActivity],
  );

  const toggleCompleted = useCallback(
    (topicId, title, path) => {
      const wasDone = Boolean(progressRef.current.completed[topicId]);
      setProgress((p) => {
        const completed = { ...p.completed };
        if (wasDone) delete completed[topicId];
        else completed[topicId] = Date.now();
        return { ...p, completed };
      });
      if (!wasDone) logActivity(`Learned: ${title}`, path, 'check');
    },
    [logActivity],
  );

  const recordQuiz = useCallback(
    (score, total) => {
      const percent = total ? Math.round((score / total) * 100) : 0;
      setProgress((p) => {
        const entry = { score, total, percent, date: Date.now() };
        const best = !p.quiz.best || percent > p.quiz.best.percent ? entry : p.quiz.best;
        return { ...p, quiz: { best, attempts: (p.quiz.attempts || 0) + 1, last: entry } };
      });
      logActivity(`Quiz finished: ${score}/${total} (${percent}%)`, '/quiz', 'quiz');
    },
    [logActivity],
  );

  const dismissHint = useCallback((hintId) => setProgress((p) => ({ ...p, hints: { ...p.hints, [hintId]: true } })), []);
  const resetProgress = useCallback(() => setProgress(EMPTY_PROGRESS), []);

  const value = useMemo(
    () => ({ theme, toggleTheme, progress, logActivity, markOpened, markExplored, markFinished, toggleCompleted, recordQuiz, dismissHint, resetProgress }),
    [theme, toggleTheme, progress, logActivity, markOpened, markExplored, markFinished, toggleCompleted, recordQuiz, dismissHint, resetProgress],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/**
 * Track an algorithm page: records "opened" on mount and "completed" once the
 * learner reaches the final step of a walkthrough.
 */
export function useAlgorithmTracking(id, name, finished) {
  const { markOpened, markFinished } = useApp();
  useEffect(() => {
    markOpened(id);
  }, [id, markOpened]);
  useEffect(() => {
    if (finished) markFinished(id, `Completed the ${name} walkthrough`, `/${id}`);
  }, [finished, id, name, markFinished]);
}
