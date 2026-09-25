import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

/**
 * Accessible confirmation dialog: focus moves into the dialog, Tab stays inside it,
 * Escape or the backdrop cancels, and focus returns to the trigger afterwards.
 */
export default function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const cancelHandler = useRef(onCancel);
  cancelHandler.current = onCancel;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelHandler.current();
      } else if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll('button');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  // Rendered into <body> so page animations/transforms can never offset the fixed overlay.
  return createPortal(
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={dialogRef} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
        <div className="dialog__head">
          <span className={`dialog__icon ${danger ? 'is-danger' : ''}`} aria-hidden="true">
            <Icon name={danger ? 'alert' : 'info'} size={20} />
          </span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <div id={descId} className="dialog__body">
          {children}
        </div>
        <div className="dialog__actions">
          <button ref={cancelRef} type="button" className="btn btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
