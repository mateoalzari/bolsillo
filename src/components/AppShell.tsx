import { createContext, useContext, useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { addMonths, monthLabel } from '../lib/dates'
import { formatARS } from '../lib/money'
import type { Movement } from '../lib/types'
import { useApp, type CurrencyView } from '../state/AppState'
import { Icon, type IconName } from './Icon'
import { MovementForm } from './MovementForm'
import { SettingsPanel } from './SettingsPanel'
import { Sheet } from './Sheet'

interface EditorApi {
  openNew: () => void
  openEdit: (m: Movement) => void
}

const EditorCtx = createContext<EditorApi>({ openNew: () => {}, openEdit: () => {} })
export const useEditor = () => useContext(EditorCtx)

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Mes', icon: 'month' },
  { to: '/graficos', label: 'Gráficos', icon: 'chart' },
  { to: '/fijos', label: 'Fijos y cuotas', icon: 'repeat' },
]

export function AppShell() {
  const [editor, setEditor] = useState<{ open: boolean; movement?: Movement; key: number }>({ open: false, key: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)

  const api: EditorApi = {
    openNew: () => setEditor((e) => ({ open: true, movement: undefined, key: e.key + 1 })),
    openEdit: (m) => setEditor((e) => ({ open: true, movement: m, key: e.key + 1 })),
  }
  const close = () => setEditor((e) => ({ ...e, open: false }))

  return (
    <EditorCtx.Provider value={api}>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand" aria-label="Bolsillo">
            <BrandMark />
            <span className="brand__name">Bolsillo</span>
          </div>
          <nav className="topnav" aria-label="Secciones">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end className="topnav__link">
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar__tools">
            <CurrencySwitch />
            <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Ajustes">
              <Icon name="sliders" />
            </button>
          </div>
        </div>
        <MonthPicker />
      </header>

      <main id="contenido" className="main" tabIndex={-1}>
        <Outlet />
      </main>

      <button type="button" className="fab" onClick={api.openNew}>
        <Icon name="plus" size={22} />
        <span className="fab__label">Agregar movimiento</span>
      </button>

      <nav className="tabbar" aria-label="Secciones">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end className="tabbar__link">
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <Sheet open={editor.open} onClose={close} title={editor.movement ? 'Editar movimiento' : 'Nuevo movimiento'}>
        <MovementForm key={editor.key} movement={editor.movement} onDone={close} />
      </Sheet>
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Ajustes">
        <SettingsPanel onDone={() => setSettingsOpen(false)} />
      </Sheet>
    </EditorCtx.Provider>
  )
}

function BrandMark() {
  return (
    <svg className="brand__mark" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="2" y="5" width="24" height="20" rx="7" fill="var(--accent)" />
      <path d="M2 11.5h24" stroke="var(--accent-ink)" strokeOpacity=".35" strokeWidth="1.5" />
      <path d="M8 5.5c0-2 1.4-3 3-3h6c1.6 0 3 1 3 3" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="19.5" cy="17.5" r="2.2" fill="var(--accent-ink)" />
    </svg>
  )
}

function MonthPicker() {
  const { month, setMonth, currentMonth } = useApp()
  const atLimit = month >= addMonths(currentMonth, 12)
  return (
    <div className="monthbar">
      <div className="monthbar__inner">
        <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mes anterior">
          <Icon name="chevronLeft" />
        </button>
        <h1 className="monthbar__label" aria-live="polite">
          {monthLabel(month)}
        </h1>
        <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Mes siguiente" disabled={atLimit}>
          <Icon name="chevronRight" />
        </button>
        {month !== currentMonth && (
          <button type="button" className="btn btn--small btn--ghost monthbar__today" onClick={() => setMonth(currentMonth)}>
            Volver a hoy
          </button>
        )}
      </div>
    </div>
  )
}

function CurrencySwitch() {
  const { prefs, setPrefs, rate, rateStatus } = useApp()
  const title =
    prefs.currency === 'ARS'
      ? 'Montos en pesos'
      : rateStatus === 'ready' && rate
        ? `1 US$ = ${formatARS(rate.sell)} (${prefs.currency}${rate.cached ? ', última cotización guardada' : ''})`
        : undefined
  return (
    <div className="currency">
      <label className="visually-hidden" htmlFor="currency">
        Ver montos en
      </label>
      <select id="currency" className="currency__select" value={prefs.currency} onChange={(e) => setPrefs({ currency: e.target.value as CurrencyView })} title={title}>
        <option value="ARS">Pesos</option>
        <option value="oficial">US$ oficial</option>
        <option value="blue">US$ blue</option>
      </select>
    </div>
  )
}

export function RateNotice() {
  const { prefs, rate, rateStatus, setPrefs } = useApp()
  if (prefs.currency === 'ARS') return null
  if (rateStatus === 'loading') return <p className="notice notice--muted" role="status">Buscando la cotización del dólar {prefs.currency}…</p>
  if (rateStatus === 'unavailable')
    return (
      <p className="notice notice--warn" role="status">
        <Icon name="alert" size={18} />
        <span>
          No pudimos traer la cotización del dólar {prefs.currency}. Mostramos todo en pesos.{' '}
          <button type="button" className="link-btn" onClick={() => setPrefs({ currency: 'ARS' })}>
            Volver a pesos
          </button>
        </span>
      </p>
    )
  if (rate)
    return (
      <p className="notice notice--muted" role="status">
        Dólar {prefs.currency}: {formatARS(rate.sell)} por US$ {rate.cached ? '(última cotización guardada; la API no respondió)' : `· actualizado ${new Date(rate.updatedAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
      </p>
    )
  return null
}

export function Section({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`section ${className}`} aria-label={title}>
      <div className="section__head">
        <h2 className="section__title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
