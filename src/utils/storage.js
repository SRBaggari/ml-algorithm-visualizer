// LocalStorage helpers. Every access is wrapped in try/catch because storage
// can be unavailable (private mode, blocked site data) and the app must still work.
const PREFIX = 'mlviz:';

export function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const STORAGE_KEYS = {
  theme: 'theme',
  progress: 'progress',
};
