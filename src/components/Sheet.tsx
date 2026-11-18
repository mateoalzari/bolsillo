import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Ancho máximo en escritorio */
  size?: 'sm' | 'md'
}

/**
 * Panel modal basado en <dialog>: el navegador maneja el foco, Escape y el fondo inerte.
 * En el celular sube desde abajo; en escritorio aparece centrado.
 */
export function Sheet({ open, onClose, title, children, size = 'md' }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`sheet sheet--${size}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // Clic en el fondo (fuera del contenido) cierra
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="sheet__body">
          <header className="sheet__header">
            <h2 id={titleId} className="sheet__title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <Icon name="close" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Sheet open={open} onClose={onCancel} title={title} size="sm">
      <div className="confirm">
        <p className="confirm__msg">{message}</p>
        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
