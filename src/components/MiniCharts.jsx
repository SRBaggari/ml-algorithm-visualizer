import { useState } from 'react';
import ChartFrame from './ChartFrame.jsx';
import { useElementSize } from '../hooks/useElementSize.js';
import { Legend } from './ui.jsx';

/**
 * Multi-series line chart built on ChartFrame (no charting library needed).
 * series: [{ key, label, color, dashed? }]. Null values break a line.
 * Hovering shows a readout of every series at the nearest x.
 */
export function LineChart({ data, xKey, series, xDomain, yDomain, xLabel, yLabel, yFormat, valueFormat = (v) => v, refX, highlightX, ariaLabel, ratio = 0.5, minHeight = 220, maxHeight = 300 }) {
  const [hoverX, setHoverX] = useState(null);
  const nearest = (x) => data.reduce((best, d) => (Math.abs(d[xKey] - x) < Math.abs(best[xKey] - x) ? d : best), data[0]);
  const shown = hoverX !== null ? nearest(hoverX) : highlightX !== undefined ? data.find((d) => d[xKey] === highlightX) : null;

  function segments(key) {
    const out = [];
    let current = [];
    for (const d of data) {
      if (d[key] === null || d[key] === undefined || !Number.isFinite(d[key])) {
        if (current.length) out.push(current);
        current = [];
      } else current.push(d);
    }
    if (current.length) out.push(current);
    return out;
  }

  return (
    <div className="mini-chart">
      <ChartFrame
        xDomain={xDomain}
        yDomain={yDomain}
        xLabel={xLabel}
        yLabel={yLabel}
        yFormat={yFormat}
        ratio={ratio}
        minHeight={minHeight}
        maxHeight={maxHeight}
        ariaLabel={ariaLabel}
        onPointerMove={(p) => setHoverX(p.inside ? p.x : null)}
        onPointerUp={() => setHoverX(null)}
      >
        {({ sx, sy, plot }) => (
          <g>
            {refX !== undefined && <line className="ref-line" x1={sx(refX)} x2={sx(refX)} y1={plot.y} y2={plot.y + plot.h} />}
            {series.map((s) =>
              segments(s.key).map((seg, i) => (
                <polyline
                  key={`${s.key}${i}`}
                  className={`series-line ${s.dashed ? 'is-dashed' : ''}`}
                  points={seg.map((d) => `${sx(d[xKey])},${sy(d[s.key])}`).join(' ')}
                  style={{ stroke: s.color }}
                />
              )),
            )}
            {shown && (
              <g>
                <line className="hover-line" x1={sx(shown[xKey])} x2={sx(shown[xKey])} y1={plot.y} y2={plot.y + plot.h} />
                {series.map((s) =>
                  Number.isFinite(shown[s.key]) ? <circle key={s.key} className="hover-dot" cx={sx(shown[xKey])} cy={sy(shown[s.key])} r={4} style={{ fill: s.color }} /> : null,
                )}
              </g>
            )}
          </g>
        )}
      </ChartFrame>
      <div className="mini-chart__footer">
        <Legend items={series.map((s) => ({ label: s.label, color: s.color, shape: 'line' }))} />
        <div className="mini-chart__readout" aria-live="polite">
          {shown ? (
            <>
              <strong>
                {xLabel} {valueFormat(shown[xKey], xKey)}
              </strong>
              {series.map((s) => (
                <span key={s.key}>
                  {s.label}: {Number.isFinite(shown[s.key]) ? valueFormat(shown[s.key], s.key) : 'undefined'}
                </span>
              ))}
            </>
          ) : (
            <span className="muted">Hover the chart to read values</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Grouped bar chart. groups: [{ label, values: [{ key, value }] }], series: [{ key, label, color }].
 * Each bar is labelled with its value so the chart is readable without colour.
 */
export function BarChart({ groups, series, height = 220, ariaLabel }) {
  const [ref, { width }] = useElementSize(500);
  const m = { top: 22, right: 10, bottom: 30, left: 34 };
  const max = Math.max(1, ...groups.flatMap((g) => g.values.map((v) => v.value)));
  const plotW = Math.max(0, width - m.left - m.right);
  const plotH = height - m.top - m.bottom;
  const groupW = plotW / groups.length;
  const barW = Math.min(46, (groupW * 0.7) / series.length);
  const y = (v) => m.top + plotH - (v / max) * plotH;
  const ticks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="mini-chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t} className="chart__axis">
            <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} className="bar-grid" />
            <text x={m.left - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const x0 = m.left + gi * groupW + (groupW - barW * series.length) / 2;
          return (
            <g key={g.label}>
              {series.map((s, si) => {
                const v = g.values.find((val) => val.key === s.key)?.value ?? 0;
                const x = x0 + si * barW;
                return (
                  <g key={s.key}>
                    <rect className="bar" x={x + 2} y={y(v)} width={barW - 4} height={m.top + plotH - y(v)} rx={4} style={{ fill: s.color }}>
                      <title>{`${g.label} · ${s.label}: ${v}`}</title>
                    </rect>
                    <text className="bar-value" x={x + barW / 2} y={y(v) - 5} textAnchor="middle">
                      {v}
                    </text>
                  </g>
                );
              })}
              <text className="bar-label" x={m.left + gi * groupW + groupW / 2} y={height - 10} textAnchor="middle">
                {g.label}
              </text>
            </g>
          );
        })}
      </svg>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
    </div>
  );
}
