import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { applyDiff, diffData, isEmptyDiff, loadCloudData } from '../lib/cloud'
import { convert, displayCode, formatIn, type CurrencyCode, type Rates, type ViewCurrency } from '../lib/currency'
import { addMonths, monthOf, today } from '../lib/dates'
import { fetchRates } from '../lib/rates'
import { materializeRecurring } from '../lib/recurring'
import { buildSampleData } from '../lib/sample'
import { localStore } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { AppData, CreditCard, MonthKey, Movement, RecurringRule } from '../lib/types'

/* ---------------- Datos ---------------- */

type Action =
  | { type: 'replace'; data: AppData }
  | { type: 'addMovement'; movement: Movement }
  | { type: 'addMovements'; movements: Movement[] }
  | { type: 'removeMovements'; ids: string[] }
  | { type: 'updateMovement'; movement: Movement }
  | { type: 'deleteMovement'; id: string }
  | { type: 'addRule'; rule: RecurringRule }
  | { type: 'updateRule'; rule: RecurringRule; fromMonth: MonthKey }
  | { type: 'deleteRule'; id: string; fromMonth: MonthKey }
  | { type: 'setBudget'; budget: number }
  | { type: 'setCurrency'; currency: CurrencyCode }
  | { type: 'saveCard'; card: CreditCard }
  | { type: 'deleteCard'; id: string }

const EMPTY: AppData = { version: 1, movements: [], recurring: [], cards: [], currency: 'ARS', budget: 0 }

function withRecurring(data: AppData): AppData {
  const created = materializeRecurring(data.recurring, data.movements, monthOf(today()))
  return created.length ? { ...data, movements: [...data.movements, ...created] } : data
}

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'replace':
      return withRecurring(action.data)
    case 'addMovement':
      return { ...state, movements: [...state.movements, action.movement] }
    case 'addMovements':
      return { ...state, movements: [...state.movements, ...action.movements] }
    case 'removeMovements': {
      // Para deshacer una importación: saca esos movimientos sin marcar meses salteados
      const ids = new Set(action.ids)
      return { ...state, movements: state.movements.filter((m) => !ids.has(m.id)) }
    }
    case 'updateMovement':
      return { ...state, movements: state.movements.map((m) => (m.id === action.movement.id ? action.movement : m)) }
    case 'deleteMovement': {
      const target = state.movements.find((m) => m.id === action.id)
      if (!target) return state
      const movements = state.movements.filter((m) => m.id !== action.id)
      // Si era un fijo generado, se recuerda el mes borrado para no volver a generarlo
      const recurring = target.recurringId
        ? state.recurring.map((r) => (r.id === target.recurringId ? { ...r, skippedMonths: [...(r.skippedMonths ?? []), monthOf(target.date)] } : r))
        : state.recurring
      return { ...state, movements, recurring }
    }
    case 'addRule':
      return withRecurring({ ...state, recurring: [...state.recurring, action.rule] })
    case 'updateRule': {
      // El cambio aplica desde fromMonth: se regeneran los movimientos de ese mes en adelante
      const movements = state.movements.filter((m) => !(m.recurringId === action.rule.id && monthOf(m.date) >= action.fromMonth))
      return withRecurring({ ...state, movements, recurring: state.recurring.map((r) => (r.id === action.rule.id ? action.rule : r)) })
    }
    case 'deleteRule': {
      const movements = state.movements.filter((m) => !(m.recurringId === action.id && monthOf(m.date) >= action.fromMonth))
      return { ...state, movements, recurring: state.recurring.filter((r) => r.id !== action.id) }
    }
    case 'setBudget':
      return { ...state, budget: Math.max(0, action.budget) }
    case 'setCurrency':
      return { ...state, currency: action.currency }
    case 'saveCard': {
      // Cambiar el cierre de una tarjeta no reprograma las compras ya cargadas
      const exists = state.cards.some((c) => c.id === action.card.id)
      return { ...state, cards: exists ? state.cards.map((c) => (c.id === action.card.id ? action.card : c)) : [...state.cards, action.card] }
    }
    case 'deleteCard':
      return { ...state, cards: state.cards.filter((c) => c.id !== action.id) }
  }
}

/* ---------------- Preferencias (de este dispositivo) ---------------- */

export type ThemePref = 'system' | 'light' | 'dark'

interface Prefs {
  view: ViewCurrency
  theme: ThemePref
}

const PREFS_KEY = 'bolsillo:prefs'

function loadPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
    // Compatibilidad con la Fase 1, que guardaba "oficial" / "blue" / "ARS"
    const legacy: Record<string, ViewCurrency> = { oficial: 'USD', blue: 'USD_BLUE', ARS: 'base' }
    const view: ViewCurrency = saved.view ?? legacy[saved.currency] ?? 'base'
    return { view, theme: saved.theme ?? 'system' }
  } catch {
    return { view: 'base', theme: 'system' }
  }
}

/* ---------------- Contexto ---------------- */

export type DataSource = 'demo' | 'cloud' | 'preview'
export type RateStatus = 'idle' | 'loading' | 'ready' | 'unavailable'
export type LoadStatus = 'loading' | 'ready' | 'error'
export type SyncStatus = 'saved' | 'saving' | 'error'

interface AppState {
  source: DataSource
  data: AppData
  loadStatus: LoadStatus
  syncStatus: SyncStatus
  retryLoad: () => void
  retrySync: () => void
  month: MonthKey
  setMonth: (m: MonthKey) => void
  currentMonth: MonthKey
  todayDate: string
  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void
  rates: Rates
  ratesUpdatedAt: string | null
  ratesCached: boolean
  rateStatus: RateStatus
  addMovement: (m: Omit<Movement, 'id'>) => void
  /** Agrega varios de una vez (importación). Devuelve los ids, para poder deshacer. */
  addMovements: (ms: Omit<Movement, 'id'>[]) => string[]
  removeMovements: (ids: string[]) => void
  updateMovement: (m: Movement) => void
  deleteMovement: (id: string) => void
  addRule: (r: Omit<RecurringRule, 'id'>) => void
  updateRule: (r: RecurringRule) => void
  deleteRule: (id: string) => void
  setBudget: (n: number) => void
  setCurrency: (c: CurrencyCode) => void
  saveCard: (c: Omit<CreditCard, 'id'> & { id?: string }) => void
  deleteCard: (id: string) => void
  replaceData: (d: AppData) => void
  resetToSample: () => void
  clearAll: () => void
}

const Ctx = createContext<AppState | null>(null)

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

interface ProviderProps {
  source: DataSource
  /** Obligatorio con source="cloud" */
  userId?: string
  children: ReactNode
}

export function AppProvider({ source, userId, children }: ProviderProps) {
  const todayDate = today()
  const currentMonth = monthOf(todayDate)
  const [data, dispatch] = useReducer(reducer, undefined, () => {
    if (source === 'demo') return withRecurring(localStore.load() ?? buildSampleData(todayDate))
    if (source === 'preview') return withRecurring(buildSampleData(todayDate))
    return EMPTY
  })
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(source === 'cloud' ? 'loading' : 'ready')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [month, setMonthState] = useState<MonthKey>(currentMonth)
  const [prefs, setPrefsState] = useState<Prefs>(() => (source === 'preview' ? { view: 'base', theme: 'system' } : loadPrefs()))
  const [ratesState, setRatesState] = useState<{ rates: Rates; updatedAt: string | null; cached: boolean }>({ rates: {}, updatedAt: null, cached: false })
  const [rateStatus, setRateStatus] = useState<RateStatus>('idle')

  /* ----- Demo: guardar en el navegador ----- */
  useEffect(() => {
    if (source === 'demo') localStore.save(data)
  }, [source, data])

  /* ----- Nube: cargar ----- */
  const synced = useRef<AppData | null>(null)
  useEffect(() => {
    if (source !== 'cloud' || !supabase || !userId) return
    let alive = true
    setLoadStatus('loading')
    loadCloudData(supabase, userId)
      .then((loaded) => {
        if (!alive) return
        synced.current = loaded
        dispatch({ type: 'replace', data: loaded })
        setLoadStatus('ready')
      })
      .catch(() => alive && setLoadStatus('error'))
    return () => {
      alive = false
    }
  }, [source, userId, loadAttempt])

  /* ----- Nube: guardar los cambios (en orden, uno a la vez, agrupando los seguidos) ----- */
  const latest = useRef(data)
  latest.current = data
  const running = useRef(false)
  const pending = useRef(false)
  const timer = useRef<number | undefined>(undefined)

  const runSync = useCallback(async () => {
    if (!supabase || !userId || !synced.current) return
    if (running.current) {
      pending.current = true
      return
    }
    running.current = true
    try {
      do {
        pending.current = false
        const target = latest.current
        const diff = diffData(synced.current, target)
        if (!isEmptyDiff(diff)) {
          setSyncStatus('saving')
          await applyDiff(supabase, userId, diff)
          synced.current = target
        }
      } while (pending.current)
      setSyncStatus('saved')
    } catch {
      // synced no avanza: el próximo intento vuelve a mandar todo lo que falta
      setSyncStatus('error')
    } finally {
      running.current = false
    }
  }, [userId])

  useEffect(() => {
    if (source !== 'cloud' || loadStatus !== 'ready') return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(runSync, 350)
    return () => window.clearTimeout(timer.current)
  }, [source, loadStatus, data, runSync])

  // Avisar antes de cerrar la pestaña si hay cambios sin guardar
  useEffect(() => {
    if (source !== 'cloud') return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (synced.current && !isEmptyDiff(diffData(synced.current, latest.current))) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [source])

  /* ----- Preferencias y tema ----- */
  useEffect(() => {
    if (source === 'preview') return
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      /* sin almacenamiento */
    }
    const root = document.documentElement
    if (prefs.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = prefs.theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#f5efe3')
  }, [source, prefs])

  /* ----- Cotizaciones: solo si se ven los montos en otra moneda ----- */
  const needsRates = source !== 'preview' && prefs.view !== 'base' && prefs.view !== data.currency
  useEffect(() => {
    if (!needsRates) {
      setRateStatus('idle')
      return
    }
    const ctrl = new AbortController()
    setRateStatus('loading')
    fetchRates(ctrl.signal)
      .then((r) => {
        setRatesState(r)
        setRateStatus(Object.keys(r.rates).length ? 'ready' : 'unavailable')
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [needsRates])

  const setMonth = useCallback(
    (m: MonthKey) => {
      if (m > addMonths(currentMonth, 12)) return
      setMonthState(m)
    },
    [currentMonth],
  )

  const value = useMemo<AppState>(
    () => ({
      source,
      data,
      loadStatus,
      syncStatus,
      retryLoad: () => setLoadAttempt((n) => n + 1),
      retrySync: () => void runSync(),
      month,
      setMonth,
      currentMonth,
      todayDate,
      prefs,
      setPrefs: (p) => setPrefsState((old) => ({ ...old, ...p })),
      rates: ratesState.rates,
      ratesUpdatedAt: ratesState.updatedAt,
      ratesCached: ratesState.cached,
      rateStatus,
      addMovement: (m) => dispatch({ type: 'addMovement', movement: { ...m, id: newId() } }),
      addMovements: (ms) => {
        const movements = ms.map((m) => ({ ...m, id: newId() }))
        dispatch({ type: 'addMovements', movements })
        return movements.map((m) => m.id)
      },
      removeMovements: (ids) => dispatch({ type: 'removeMovements', ids }),
      updateMovement: (m) => dispatch({ type: 'updateMovement', movement: m }),
      deleteMovement: (id) => dispatch({ type: 'deleteMovement', id }),
      addRule: (r) => dispatch({ type: 'addRule', rule: { ...r, id: newId() } }),
      updateRule: (r) => dispatch({ type: 'updateRule', rule: r, fromMonth: currentMonth }),
      deleteRule: (id) => dispatch({ type: 'deleteRule', id, fromMonth: currentMonth }),
      setBudget: (n) => dispatch({ type: 'setBudget', budget: n }),
      setCurrency: (c) => dispatch({ type: 'setCurrency', currency: c }),
      saveCard: (c) => dispatch({ type: 'saveCard', card: { ...c, id: c.id ?? newId() } }),
      deleteCard: (id) => dispatch({ type: 'deleteCard', id }),
      replaceData: (d) => dispatch({ type: 'replace', data: d }),
      resetToSample: () => dispatch({ type: 'replace', data: buildSampleData(todayDate) }),
      clearAll: () => dispatch({ type: 'replace', data: { ...EMPTY, currency: data.currency } }),
    }),
    [source, data, loadStatus, syncStatus, runSync, month, setMonth, currentMonth, todayDate, prefs, ratesState, rateStatus],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fuera de AppProvider')
  return v
}

/**
 * Función que formatea un monto (cargado en la moneda principal) en la moneda de vista elegida,
 * con la cotización del día. Si falta la cotización, muestra la moneda principal.
 */
export function useFormat(): (amount: number) => string {
  const { prefs, rates, data } = useApp()
  const base = data.currency
  const view = prefs.view
  return useCallback(
    (n: number) => {
      if (view === 'base' || view === base) return formatIn(n, base)
      const converted = convert(n, base, view, rates)
      return converted === null ? formatIn(n, base) : formatIn(converted, displayCode(view))
    },
    [base, view, rates],
  )
}
