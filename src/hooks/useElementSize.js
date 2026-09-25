import { useEffect, useRef, useState } from 'react';

/** Track an element's rendered size so SVG charts can redraw at the right resolution. */
export function useElementSize(fallbackWidth = 600) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: fallbackWidth, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
      // Skip the state update (and re-render) when nothing changed.
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
}
