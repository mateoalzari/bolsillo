import { useState } from 'react'
import { useApp, type StyleName, type ThemePref } from '../state/AppState'
import { ConfirmDialog } from './Sheet'

const STYLES: { id: StyleName; label: string; hint: string }[] = [
  { id: 'crema', label: 'Crema', hint: 'La línea del brief: cálida y suave.' },
  { id: 'contraste', label: 'Contraste', hint: 'Más editorial: bordes marcados y números pesados.' },
]

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'Como el sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
]

export function SettingsPanel({ onDone }: { onDone: () => void }) {
  const { prefs, setPrefs, resetToSample, clearAll } = useApp()
  const [confirm, setConfirm] = useState<null | 'sample' | 'clear'>(null)

  return (
    <div className="settings">
      <fieldset className="field">
        <legend>Estilo visual</legend>
        <p className="field__hint">Las dos propuestas de diseño del primer hito. Probalas con tus datos.</p>
        <div className="style-options">
          {STYLES.map((s) => (
            <label key={s.id} className={`style-option style-option--${s.id}`}>
              <input type="radio" name="style" value={s.id} checked={prefs.style === s.id} onChange={() => setPrefs({ style: s.id })} />
              <span className="style-option__swatch" aria-hidden="true">
                <span>$ 12.500</span>
              </span>
              <span className="style-option__text">
                <strong>{s.label}</strong>
                <span>{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Tema</legend>
        <div className="segmented" role="radiogroup" aria-label="Tema">
          {THEMES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={prefs.theme === t.id} className="segmented__opt" onClick={() => setPrefs({ theme: t.id })}>
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <span className="field__label">Datos</span>
        <p className="field__hint">Por ahora todo se guarda en este navegador. Las cuentas con datos en la nube llegan en la Fase 2.</p>
        <div className="settings__data">
          <button type="button" className="btn btn--ghost" onClick={() => setConfirm('sample')}>
            Cargar datos de ejemplo
          </button>
          <button type="button" className="btn btn--ghost btn--danger-text" onClick={() => setConfirm('clear')}>
            Borrar todo y empezar de cero
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'clear' ? '¿Borrar todos tus datos?' : '¿Reemplazar por datos de ejemplo?'}
        message={
          confirm === 'clear'
            ? 'Se borran todos los movimientos, fijos y el presupuesto de este navegador. No se puede deshacer.'
            : 'Se reemplazan tus movimientos actuales por 7 meses de datos de ejemplo. No se puede deshacer.'
        }
        confirmLabel={confirm === 'clear' ? 'Borrar todo' : 'Reemplazar'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'clear') clearAll()
          else resetToSample()
          setConfirm(null)
          onDone()
        }}
      />
    </div>
  )
}
