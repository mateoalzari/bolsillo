import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CURRENCIES, type CurrencyCode } from '../lib/currency'
import { localStore } from '../lib/storage'
import type { CreditCard } from '../lib/types'
import { useApp, type ThemePref } from '../state/AppState'
import { useAuth } from '../state/AuthState'
import { Icon } from './Icon'
import { ConfirmDialog } from './Sheet'

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'Sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
]

export function SettingsPanel({ onDone }: { onDone: () => void }) {
  const { source, prefs, setPrefs, resetToSample, clearAll, replaceData } = useApp()
  const [confirm, setConfirm] = useState<null | 'sample' | 'clear' | 'import'>(null)
  const demoData = source === 'cloud' ? localStore.load() : null

  const confirmTexts = {
    clear: { title: '¿Borrar todos tus datos?', message: `Se borran todos los movimientos, fijos, tarjetas y el presupuesto ${source === 'cloud' ? 'de tu cuenta' : 'de este navegador'}. No se puede deshacer.`, label: 'Borrar todo' },
    sample: { title: '¿Reemplazar por datos de ejemplo?', message: `Se reemplazan tus movimientos actuales${source === 'cloud' ? ' en la nube' : ''} por 7 meses de datos de ejemplo. No se puede deshacer.`, label: 'Reemplazar' },
    import: { title: '¿Pasar los datos de la demo a tu cuenta?', message: 'Se reemplazan los datos de tu cuenta por los que cargaste en la demo de este navegador. No se puede deshacer.', label: 'Pasar a mi cuenta' },
  }
  const c = confirm ? confirmTexts[confirm] : null

  return (
    <div className="settings">
      <AccountSection onDone={onDone} />
      <CurrencyField />
      <CardsEditor />

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
        <p className="field__hint">{source === 'cloud' ? 'Tus datos se guardan en la nube y los ves desde cualquier dispositivo.' : 'En la demo, los datos quedan solo en este navegador.'}</p>
        <div className="settings__data">
          {demoData && demoData.movements.length > 0 && (
            <button type="button" className="btn btn--ghost" onClick={() => setConfirm('import')}>
              Pasar los datos de la demo a mi cuenta
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => setConfirm('sample')}>
            Cargar datos de ejemplo
          </button>
          <button type="button" className="btn btn--ghost btn--danger-text" onClick={() => setConfirm('clear')}>
            Borrar todo y empezar de cero
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={c !== null}
        title={c?.title ?? ''}
        message={c?.message ?? ''}
        confirmLabel={c?.label ?? 'Confirmar'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'clear') clearAll()
          else if (confirm === 'import' && demoData) replaceData(demoData)
          else resetToSample()
          setConfirm(null)
          onDone()
        }}
      />
    </div>
  )
}

function AccountSection({ onDone }: { onDone: () => void }) {
  const { source } = useApp()
  const { user, signOut, exitDemo } = useAuth()
  const navigate = useNavigate()
  if (source === 'preview') return null
  return (
    <div className="field account">
      <span className="field__label">Cuenta</span>
      {source === 'cloud' ? (
        <div className="account__row">
          <span className="account__email">{user?.email}</span>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => {
              onDone()
              // Primero se sale de la app; si no, la ruta protegida redirige a "Ingresar"
              navigate('/')
              window.setTimeout(() => void signOut(), 0)
            }}
          >
            Cerrar sesión
          </button>
        </div>
      ) : (
        <div className="account__row">
          <span className="muted">Estás usando la demo, sin cuenta.</span>
          <span className="account__actions">
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => {
                onDone()
                navigate('/registrarse')
              }}
            >
              Crear cuenta
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => {
                onDone()
                navigate('/')
                window.setTimeout(exitDemo, 0)
              }}
            >
              Salir de la demo
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

function CurrencyField() {
  const { data, setCurrency } = useApp()
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>Moneda principal</label>
      <select id={id} value={data.currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <p className="field__hint">Es la moneda en la que cargás todo. Cambiarla no convierte los montos que ya cargaste. Para ver los montos en otra moneda usá el selector de arriba.</p>
    </div>
  )
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

function CardsEditor() {
  const { data, saveCard, deleteCard } = useApp()
  const [editing, setEditing] = useState<Partial<CreditCard> | null>(null)
  const [toDelete, setToDelete] = useState<CreditCard | null>(null)

  return (
    <div className="field">
      <span className="field__label">Tarjetas de crédito</span>
      <p className="field__hint">Con el día de cierre y de vencimiento, cada compra cae en el mes en que de verdad la pagás.</p>
      {data.cards.length > 0 && (
        <ul className="cards-list">
          {data.cards.map((c) => (
            <li key={c.id} className="card-row">
              <Icon name="card" />
              <span className="card-row__text">
                <strong>{c.name}</strong>
                <span>
                  Cierra el {c.closingDay} · vence el {c.dueDay}
                </span>
              </span>
              <button type="button" className="icon-btn" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`}>
                <Icon name="pencil" size={18} />
              </button>
              <button type="button" className="icon-btn" onClick={() => setToDelete(c)} aria-label={`Borrar ${c.name}`}>
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <CardForm
          card={editing}
          onCancel={() => setEditing(null)}
          onSave={(c) => {
            saveCard(c)
            setEditing(null)
          }}
        />
      ) : (
        <button type="button" className="btn btn--ghost" onClick={() => setEditing({})}>
          <Icon name="plus" size={18} /> Agregar tarjeta
        </button>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title={`¿Borrar ${toDelete?.name ?? 'la tarjeta'}?`}
        message="Las compras ya cargadas con esta tarjeta mantienen sus fechas de pago. Las nuevas compras con crédito van a caer en el mes de compra."
        confirmLabel="Borrar tarjeta"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteCard(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}

function CardForm({ card, onSave, onCancel }: { card: Partial<CreditCard>; onSave: (c: Omit<CreditCard, 'id'> & { id?: string }) => void; onCancel: () => void }) {
  const ids = useId()
  const [name, setName] = useState(card.name ?? '')
  const [closingDay, setClosingDay] = useState(card.closingDay ?? 24)
  const [dueDay, setDueDay] = useState(card.dueDay ?? 5)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Poné un nombre, por ejemplo "Visa Galicia"')
    if (closingDay === dueDay) return setError('El cierre y el vencimiento no pueden ser el mismo día')
    onSave({ id: card.id, name: name.trim(), closingDay, dueDay })
  }

  return (
    <form className="card-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor={`${ids}-n`}>Nombre</label>
        <input id={`${ids}-n`} autoComplete="off" maxLength={30} placeholder="Visa Galicia" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${ids}-c`}>Día de cierre</label>
          <select id={`${ids}-c`} value={closingDay} onChange={(e) => setClosingDay(Number(e.target.value))}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${ids}-v`}>Día de vencimiento</label>
          <select id={`${ids}-v`} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      {card.id && <p className="field__hint">Los cambios aplican a las compras nuevas. Las ya cargadas mantienen su fecha de pago.</p>}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary btn--grow">
          {card.id ? 'Guardar tarjeta' : 'Agregar tarjeta'}
        </button>
      </div>
    </form>
  )
}
