import { useCallback, useEffect, useState } from 'react';

export const SPEEDS = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
];

/**
 * Drives the step-by-step animation system shared by every visualization:
 * previous / next / play / pause / reset over `total` steps (0-based index).
 */
export function useStepPlayer(total, { interval = 1600, initialStep = 0 } = {}) {
  const [step, setStep] = useState(initialStep);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Keep the step inside range when the number of steps changes.
  useEffect(() => {
    setStep((s) => Math.min(s, Math.max(0, total - 1)));
  }, [total]);

  useEffect(() => {
    if (!playing) return undefined;
    if (step >= total - 1) {
      setPlaying(false);
      return undefined;
    }
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, total - 1)), interval / speed);
    return () => clearTimeout(t);
  }, [playing, step, total, interval, speed]);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, total - 1)), [total]);
  const prev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);
  const goTo = useCallback((i) => setStep(Math.max(0, Math.min(i, total - 1))), [total]);
  const pause = useCallback(() => setPlaying(false), []);
  const reset = useCallback(() => {
    setPlaying(false);
    setStep(0);
  }, []);
  const play = useCallback(() => {
    if (total <= 1) return;
    // Restart from the beginning if we are already at the end.
    setStep((s) => (s >= total - 1 ? 0 : s));
    setPlaying(true);
  }, [total]);
  // Start from a specific step and autoplay (used by "Train"/"Run" buttons).
  // Deliberately independent of `total`: it is often called in the same event that
  // creates the new steps, and the play effect stops at the (updated) last step.
  const start = useCallback((from = 0, autoplay = true) => {
    setStep(from);
    setPlaying(autoplay);
  }, []);

  return {
    step,
    total,
    playing,
    speed,
    setSpeed,
    next,
    prev,
    goTo,
    play,
    pause,
    reset,
    start,
    isFirst: step === 0,
    isLast: step >= total - 1,
  };
}
