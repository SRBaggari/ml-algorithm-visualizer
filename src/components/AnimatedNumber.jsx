import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion.js';

/** Counts smoothly from the currently displayed value to the new one. */
export default function AnimatedNumber({ value, format = (v) => String(v), duration = 700 }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const shownRef = useRef(reduced ? value : 0);

  useEffect(() => {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      setDisplay(value);
      shownRef.current = 0;
      return undefined;
    }
    const from = Number.isFinite(shownRef.current) ? shownRef.current : 0;
    if (reduced || from === value) {
      setDisplay(value);
      shownRef.current = value;
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const v = t === 1 ? value : from + (value - from) * eased;
      shownRef.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  return <>{display === null || display === undefined ? '—' : format(display)}</>;
}
