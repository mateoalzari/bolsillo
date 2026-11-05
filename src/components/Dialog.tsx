import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** "sheet" se apoya abajo en el celular; "alert" queda centrado y chico. */
  variant?: 'sheet' | 'alert';
  description?: ReactNode;
}

/**
 * Diálogo modal sobre <dialog> nativo: atrapa el foco, cierra con Escape
 * y devuelve el foco al elemento que lo abrió.
 */
export function Dialog({ open, title, onClose, children, variant = 'sheet', description }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${variant}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        // Clic en el fondo oscuro (fuera de la caja) cierra.
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog__box">
          <header className="dialog__head">
            <h2 id={titleId} className="dialog__title">
              {title}
            </h2>
            {variant === 'sheet' && (
              <button type="button" className="icon-btn icon-btn--ghost" onClick={onClose} aria-label="Cerrar">
                <X size={18} />
              </button>
            )}
          </header>
          {description && (
            <p id={descId} className="dialog__desc">
              {description}
            </p>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmación dentro de la app (reemplaza a window.confirm). El foco arranca en "Cancelar". */
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} description={description} onClose={onCancel} variant="alert">
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} autoFocus>
          Cancelar
        </button>
        <button type="button" className="btn btn--danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
