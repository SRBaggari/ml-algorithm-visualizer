import { useId, useState } from 'react';
import Icon from './Icon.jsx';

/** Small "i" button that reveals an explanation on hover, focus or tap. */
export default function InfoTip({ text, label = 'More information' }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className={`infotip ${open ? 'is-open' : ''}`} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="infotip__btn"
        aria-label={label}
        aria-describedby={id}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        <Icon name="info" size={14} />
      </button>
      <span role="tooltip" id={id} className="infotip__bubble">
        {text}
      </span>
    </span>
  );
}
