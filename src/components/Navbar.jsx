import { useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useApp } from '../context/AppContext.jsx';
import { NAV_GROUPS } from './Sidebar.jsx';

function currentLabel(pathname) {
  for (const g of NAV_GROUPS) {
    for (const item of g.items) if (item.to === pathname) return { group: g.label, label: item.label };
  }
  return { group: '', label: 'Page not found' };
}

export default function Navbar({ menuOpen, onToggleMenu }) {
  const { theme, toggleTheme } = useApp();
  const { pathname } = useLocation();
  const { group, label } = currentLabel(pathname);

  return (
    <header className="navbar">
      <button
        type="button"
        className="icon-btn navbar__menu"
        onClick={onToggleMenu}
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
      >
        <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
      </button>
      <div className="navbar__title">
        <span className="navbar__app">ML Algorithm Visualizer</span>
        {group && group !== 'Overview' && <span className="navbar__crumb">{group} /</span>}
        <span className="navbar__page">{label}</span>
      </div>
      <div className="navbar__actions">
        <span className="badge badge--soft navbar__offline" title="No backend, no API keys - everything runs locally">
          <span className="dot dot--ok" /> Offline-ready
        </span>
        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
        </button>
      </div>
    </header>
  );
}
