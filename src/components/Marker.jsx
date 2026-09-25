// Point markers with a distinct SHAPE per class / cluster, so the charts
// never rely on colour alone (important for colour-blind users).

export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross', 'hexagon'];

export function shapePath(shape, r) {
  switch (shape) {
    case 'square': {
      const s = r * 0.9;
      return `M${-s},${-s}H${s}V${s}H${-s}Z`;
    }
    case 'triangle': {
      const h = r * 1.25;
      return `M0,${-h}L${h * 0.95},${h * 0.7}H${-h * 0.95}Z`;
    }
    case 'diamond': {
      const d = r * 1.3;
      return `M0,${-d}L${d},0L0,${d}L${-d},0Z`;
    }
    case 'cross': {
      const a = r * 1.15;
      const b = r * 0.42;
      return `M${-b},${-a}H${b}V${-b}H${a}V${b}H${b}V${a}H${-b}V${b}H${-a}V${-b}H${-b}Z`;
    }
    case 'hexagon': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const ang = (Math.PI / 3) * i - Math.PI / 2;
        return `${(Math.cos(ang) * r * 1.1).toFixed(2)},${(Math.sin(ang) * r * 1.1).toFixed(2)}`;
      });
      return `M${pts.join('L')}Z`;
    }
    default:
      return `M${-r},0a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0`;
  }
}

/** An SVG marker centered at (x, y). `shape` may be an index or a shape name. */
export default function Marker({ x, y, r = 6, shape = 0, className = '', style, onClick, title, children }) {
  const name = typeof shape === 'number' ? SHAPES[shape % SHAPES.length] : shape;
  return (
    <g transform={`translate(${x} ${y})`} onClick={onClick}>
      <path d={shapePath(name, r)} className={className} style={style}>
        {title && <title>{title}</title>}
      </path>
      {children}
    </g>
  );
}

/** Tiny inline SVG used in legends and tables. */
export function MarkerSwatch({ shape = 0, color, size = 12 }) {
  const name = typeof shape === 'number' ? SHAPES[shape % SHAPES.length] : shape;
  return (
    <svg width={size} height={size} viewBox="-8 -8 16 16" aria-hidden="true" className="marker-swatch">
      <path d={shapePath(name, 5.5)} style={{ fill: color }} />
    </svg>
  );
}
