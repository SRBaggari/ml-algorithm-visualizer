import { useId, useRef } from 'react';
import { useElementSize } from '../hooks/useElementSize.js';

export function linearScale([d0, d1], [r0, r1]) {
  const span = d1 - d0 || 1;
  const f = (v) => r0 + ((v - d0) / span) * (r1 - r0);
  f.invert = (p) => d0 + ((p - r0) / (r1 - r0)) * span;
  return f;
}

function niceStep(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}

export function niceTicks(min, max, count = 6) {
  const step = niceStep((max - min) / count);
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/** Domain covering the values with some padding, rounded to "nice" numbers. */
export function paddedDomain(values, { pad = 0.12, includeZero = false } = {}) {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return [0, 10];
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (includeZero) min = Math.min(0, min);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const step = niceStep(span / 6);
  const lo = includeZero && min >= 0 ? 0 : Math.floor((min - span * pad) / step) * step;
  return [lo, Math.ceil((max + span * pad) / step) * step];
}

export function tickLabel(v) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1e4) return `${(v / 1e3).toFixed(0)}k`;
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
}

/**
 * Responsive SVG chart with axes, gridlines and axis labels.
 * `children` is a render function receiving scales ({ sx, sy, width, height, toData }).
 * `caption` is a visible text summary so the chart is understandable without seeing it.
 */
export default function ChartFrame({
  xDomain,
  yDomain,
  xLabel,
  yLabel,
  children,
  onPlotClick,
  onPointerMove,
  onPointerUp,
  ariaLabel,
  ratio = 0.62,
  minHeight = 270,
  maxHeight = 470,
  className = '',
  cursor,
  background,
  xFormat = tickLabel,
  yFormat = tickLabel,
  xTickCount,
  yTickCount,
  caption,
}) {
  const [ref, { width }] = useElementSize(640);
  const svgRef = useRef(null);
  const clipId = `clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const narrow = width < 440;
  const height = Math.round(Math.max(minHeight, Math.min(maxHeight, width * ratio)));
  const m = { top: 14, right: 14, bottom: 46, left: narrow ? 46 : 58 };
  const sx = linearScale(xDomain, [m.left, width - m.right]);
  const sy = linearScale(yDomain, [height - m.bottom, m.top]);
  const xTicks = niceTicks(xDomain[0], xDomain[1], xTickCount || (narrow ? 4 : 7));
  const yTicks = niceTicks(yDomain[0], yDomain[1], yTickCount || (narrow ? 4 : 6));

  const toData = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return {
      x: sx.invert(px),
      y: sy.invert(py),
      inside: px >= m.left && px <= width - m.right && py >= m.top && py <= height - m.bottom,
    };
  };

  const plot = { x: m.left, y: m.top, w: Math.max(0, width - m.left - m.right), h: Math.max(0, height - m.top - m.bottom) };

  return (
    <figure className={`chart ${className}`} ref={ref}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        style={cursor ? { cursor } : undefined}
        onPointerMove={onPointerMove ? (e) => onPointerMove(toData(e), e) : undefined}
        onPointerUp={onPointerUp ? (e) => onPointerUp(toData(e), e) : undefined}
        onPointerLeave={onPointerUp ? (e) => onPointerUp(toData(e), e) : undefined}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} />
          </clipPath>
        </defs>
        <rect
          className="chart__bg"
          x={plot.x}
          y={plot.y}
          width={plot.w}
          height={plot.h}
          onClick={
            onPlotClick
              ? (e) => {
                  const d = toData(e);
                  if (d.inside) onPlotClick(d, e);
                }
              : undefined
          }
        />
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          {background?.({ sx, sy, width, height, plot })}
        </g>
        <g className="chart__grid" aria-hidden="true">
          {xTicks.map((t) => (
            <line key={`gx${t}`} x1={sx(t)} x2={sx(t)} y1={m.top} y2={height - m.bottom} />
          ))}
          {yTicks.map((t) => (
            <line key={`gy${t}`} x1={m.left} x2={width - m.right} y1={sy(t)} y2={sy(t)} />
          ))}
        </g>
        <g className="chart__axis" aria-hidden="true">
          <line x1={m.left} x2={width - m.right} y1={height - m.bottom} y2={height - m.bottom} />
          <line x1={m.left} x2={m.left} y1={m.top} y2={height - m.bottom} />
          {xTicks.map((t) => (
            <text key={`tx${t}`} x={sx(t)} y={height - m.bottom + 16} textAnchor="middle">
              {xFormat(t)}
            </text>
          ))}
          {yTicks.map((t) => (
            <text key={`ty${t}`} x={m.left - 8} y={sy(t) + 4} textAnchor="end">
              {yFormat(t)}
            </text>
          ))}
          {xLabel && (
            <text className="chart__label" x={m.left + plot.w / 2} y={height - 8} textAnchor="middle">
              {xLabel}
            </text>
          )}
          {yLabel && (
            <text className="chart__label" transform={`translate(13 ${m.top + plot.h / 2}) rotate(-90)`} textAnchor="middle">
              {yLabel}
            </text>
          )}
        </g>
        <g clipPath={`url(#${clipId})`}>{children({ sx, sy, width, height, plot, toData })}</g>
      </svg>
      {caption && <figcaption className="chart-caption">{caption}</figcaption>}
    </figure>
  );
}
