import { createContext, useContext, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { formatIn, viewLabel, viewOptions, type ViewCurrency } from '../lib/currency'
import { addMonths, monthLabel } from '../lib/dates'
import type { Movement } from '../lib/types'
import { useApp } from '../state/AppState'
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
  { to: '/app', label: 'Mes', icon: 'month' },
  { to: '/app/graficos', label: 'Gráficos', icon: 'chart' },
  { to: '/app/fijos', label: 'Fijos y cuotas', icon: 'repeat' },
]

export function AppShell() {
  const { loadStatus, retryLoad } = useApp()
  const [editor, setEditor] = useState<{ open: boolean; movement?: Movement; key: number }>({ open: false, key: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  // La importación tiene su propia barra de confirmación y no depende del mes elegido
  const importing = useLocation().pathname.startsWith('/app/importar')

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
          <Link to="/app" className="brand" aria-label="Bolsillo, ir al mes">
            <BrandMark />
            <span className="brand__name">Bolsillo</span>
          </Link>
          <nav className="topnav" aria-label="Secciones">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end className="topnav__link">
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar__tools">
            <SyncIndicator />
            <CurrencySwitch />
            <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Ajustes y cuenta">
              <Icon name="sliders" />
            </button>
          </div>
        </div>
        {!importing && <MonthPicker />}
      </header>

      <DemoBanner />

      <main id="contenido" className="main" tabIndex={-1}>
        {loadStatus === 'loading' ? (
          <div className="loading" role="status">
            <span className="loading__bar" aria-hidden="true" />
            Trayendo tus datos…
          </div>
        ) : loadStatus === 'error' ? (
          <div className="empty" role="alert">
            <Icon name="alert" size={32} />
            <p className="empty__title">No pudimos traer tus datos</p>
            <p className="muted">Revisá tu conexión. Tus datos están guardados en la nube y no se perdieron.</p>
            <button type="button" className="btn btn--primary" onClick={retryLoad}>
              Reintentar
            </button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {loadStatus === 'ready' && !importing && (
        <button type="button" className="fab" onClick={api.openNew}>
          <Icon name="plus" size={22} />
          <span className="fab__label">Agregar movimiento</span>
        </button>
      )}

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

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="brand__mark" width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="2" y="5" width="24" height="20" rx="7" fill="var(--accent)" />
      <path d="M2 11.5h24" stroke="var(--accent-ink)" strokeOpacity=".35" strokeWidth="1.5" />
      <path d="M8 5.5c0-2 1.4-3 3-3h6c1.6 0 3 1 3 3" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="19.5" cy="17.5" r="2.2" fill="var(--accent-ink)" />
    </svg>
  )
}

function DemoBanner() {
  const { source } = useApp()
  if (source !== 'demo') return null
  return (
    <div className="demo-banner" role="note">
      <div className="demo-banner__inner">
        <span>
          Estás en la <strong>demo</strong>: los datos quedan solo en este navegador.
        </span>
        <Link to="/registrarse" className="btn btn--small btn--primary">
          Crear cuenta gratis
        </Link>
      </div>
    </div>
  )
}

function SyncIndicator() {
  const { source, syncStatus, retrySync } = useApp()
  if (source !== 'cloud') return null
  if (syncStatus === 'error')
    return (
      <button type="button" className="sync sync--error" onClick={retrySync}>
        <Icon name="alert" size={16} />
        <span>
          Sin guardar <span className="sync__action">· Reintentar</span>
        </span>
      </button>
    )
  return (
    <span className={`sync sync--${syncStatus}`} role="status" aria-live="polite">
      {syncStatus === 'saving' ? (
        <>
          <span className="sync__dot" aria-hidden="true" />
          <span className="sync__text">Guardando…</span>
        </>
      ) : (
        <>
          <Icon name="check" size={16} />
          <span className="sync__text">Guardado</span>
        </>
      )}
    </span>
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
  const { prefs, setPrefs, data } = useApp()
  const base = data.currency
  return (
    <div className="currency">
      <label className="visually-hidden" htmlFor="currency">
        Ver montos en
      </label>
      <select id="currency" className="currency__select" value={prefs.view === base ? 'base' : prefs.view} onChange={(e) => setPrefs({ view: e.target.value as ViewCurrency })}>
        {viewOptions(base).map((v) => (
          <option key={v} value={v}>
            {viewLabel(v, base)}
          </option>
        ))}
      </select>
    </div>
  )
}

export function RateNotice() {
  const { prefs, rates, ratesUpdatedAt, ratesCached, rateStatus, setPrefs, data } = useApp()
  const view = prefs.view
  if (view === 'base' || view === data.currency) return null
  const label = viewLabel(view, data.currency)
  if (rateStatus === 'loading') return <p className="notice notice--muted" role="status">Buscando la cotización ({label})…</p>
  const target = view === 'ARS' ? 1 : rates[view]
  const from = data.currency === 'ARS' ? 1 : rates[data.currency]
  if (rateStatus === 'unavailable' || !target || !from)
    return (
      <p className="notice notice--warn" role="status">
        <Icon name="alert" size={18} />
        <span>
          No pudimos traer la cotización ({label}). Mostramos todo en {viewLabel('base', data.currency).toLowerCase()}.{' '}
          <button type="button" className="link-btn" onClick={() => setPrefs({ view: 'base' })}>
            Volver a la moneda principal
          </button>
        </span>
      </p>
    )
  const when = ratesUpdatedAt ? new Date(ratesUpdatedAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null
  const shown = view === 'ARS' ? `1 ${data.currency} = ${formatIn(from, 'ARS')}` : `${label}: ${formatIn(target, 'ARS')}`
  return (
    <p className="notice notice--muted" role="status">
      {shown}
      {ratesCached ? ' (última cotización guardada; la API no respondió)' : when ? ` · actualizado ${when}` : ''}
    </p>
  )
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
