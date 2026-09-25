// Minimal inline stroke icon set (24×24), so no icon font or network request is needed.
const PATHS = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  split: 'M12 3v18M4 7h5M4 12h5M4 17h5M15 7h5M15 12h5',
  trend: 'M3 20h18M4 16l5-5 4 3 7-8M16 6h4v4',
  target: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  tree: 'M12 3v5M12 8H6v5M12 8h6v5M6 13H3v5M6 13h3v5M18 13v5',
  cluster: 'M7 7m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M17 8m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M11 17m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M3 13h.01M20 16h.01M15 20h.01',
  gauge: 'M12 14l4-4M3.3 17a9 9 0 1 1 17.4 0',
  compare: 'M4 6h7M4 12h7M4 18h7M15 6h5M15 12h5M15 18h5',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7',
  quiz: 'M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .9-1 1.6V14M12 18h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  sun: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  next: 'M9 5l7 7-7 7',
  prev: 'M15 5l-7 7 7 7',
  first: 'M17 5l-7 7 7 7M7 5v14',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  download: 'M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  check: 'M5 12l5 5 9-11',
  x: 'M6 6l12 12M18 6L6 18',
  info: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 11v5M12 8h.01',
  alert: 'M12 3l10 18H2zM12 10v4M12 17h.01',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  clock: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  dice: 'M4 4h16v16H4zM8.5 8.5h.01M15.5 15.5h.01M15.5 8.5h.01M8.5 15.5h.01M12 12h.01',
  move: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, className = '', title }) {
  const d = PATHS[name] || PATHS.spark;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}
