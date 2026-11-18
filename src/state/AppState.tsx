import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { addMonths, monthOf, today } from '../lib/dates'
import { fetchDolar, type DolarKind, type DolarRate } from '../lib/dolar'
import { formatARS, formatMoney } from '../lib/money'
import { materializeRecurring } from '../lib/recurring'
import { buildSampleData } from '../lib/sample'
import { localStore } from '../lib/storage'
import type { AppData, CreditCard, MonthKey, Movement, RecurringRule } from '../lib/types'

/* ---------------- Datos ---------------- */

type Action =
  | { type: 'replace'; data: AppData }
  | { type: 'addMovement'; movement: Movement }
  | { type: 'updateMovement'; movement: Movement }
  | { type: 'deleteMovement'; id: string }
  | { type: 'addRule'; rule: RecurringRule }
  | { type: 'updateRule'; rule: RecurringRule; fromMonth: MonthKey }
  | { type: 'deleteRule'; id: string; fromMonth: MonthKey }
  | { type: 'setBudget'; budget: number }
  | { type: 'saveCard'; card: CreditCard }
  | { type: 'deleteCard'; id: string }

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
      // El cambio aplica desde fromMonth: se regeneran los movimientos de ese mes en adelante, los anteriores quedan como estaban
      const movements = state.movements.filter((m) => !(m.recurringId === action.rule.id && monthOf(m.date) >= action.fromMonth))
      return withRecurring({ ...state, movements, recurring: state.recurring.map((r) => (r.id === action.rule.id ? action.rule : r)) })
    }
    case 'deleteRule': {
      const movements = state.movements.filter((m) => !(m.recurringId === action.id && monthOf(m.date) >= action.fromMonth))
      return { ...state, movements, recurring: state.recurring.filter((r) => r.id !== action.id) }
    }
    case 'setBudget':
      return { ...state, budget: Math.max(0, action.budget) }
    case 'saveCard': {
      // Cambiar el cierre de una tarjeta no reprograma las compras ya cargadas: su resumen ya quedó definido
      const exists = state.cards.some((c) => c.id === action.card.id)
      return { ...state, cards: exists ? state.cards.map((c) => (c.id === action.card.id ? action.card : c)) : [...state.cards, action.card] }
    }
    case 'deleteCard':
      return { ...state, cards: state.cards.filter((c) => c.id !== action.id) }
  }
}

function initialData(): AppData {
  return withRecurring(localStore.load() ?? buildSampleData(today()))
}

/* ---------------- Preferencias ---------------- */

export type CurrencyView = 'ARS' | DolarKind
export type ThemePref = 'system' | 'light' | 'dark'

interface Prefs {
  currency: CurrencyView
  theme: ThemePref
}

const PREFS_KEY = 'bolsillo:prefs'

function loadPrefs(): Prefs {
  const fallback: Prefs = { currency: 'ARS', theme: 'system' }
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
    return { currency: saved.currency ?? fallback.currency, theme: saved.theme ?? fallback.theme }
  } catch {
    return fallback
  }
}

/* ---------------- Contexto ---------------- */

export type RateStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

interface AppState {
  data: AppData
  month: MonthKey
  setMonth: (m: MonthKey) => void
  currentMonth: MonthKey
  todayDate: string
  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void
  rate: DolarRate | null
  rateStatus: RateStatus
  addMovement: (m: Omit<Movement, 'id'>) => void
  updateMovement: (m: Movement) => void
  deleteMovement: (id: string) => void
  addRule: (r: Omit<RecurringRule, 'id'>) => void
  updateRule: (r: RecurringRule) => void
  deleteRule: (id: string) => void
  setBudget: (n: number) => void
  saveCard: (c: Omit<CreditCard, 'id'> & { id?: string }) => void
  deleteCard: (id: string) => void
  resetToSample: () => void
  clearAll: () => void
}

const Ctx = createContext<AppState | null>(null)

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, initialData)
  const todayDate = today()
  const currentMonth = monthOf(todayDate)
  const [month, setMonthState] = useState<MonthKey>(currentMonth)
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs)
  const [rate, setRate] = useState<DolarRate | null>(null)
  const [rateStatus, setRateStatus] = useState<RateStatus>('idle')

  useEffect(() => localStore.save(data), [data])

  useEffect(() => {
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
  }, [prefs])

  useEffect(() => {
    if (prefs.currency === 'ARS') {
      setRateStatus('idle')
      return
    }
    const ctrl = new AbortController()
    setRateStatus('loading')
    fetchDolar(prefs.currency, ctrl.signal)
      .then((r) => {
        setRate(r)
        setRateStatus(r ? 'ready' : 'unavailable')
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [prefs.currency])

  const setMonth = useCallback((m: MonthKey) => {
    // No se navega más allá de 12 meses hacia adelante (para ver cuotas futuras alcanza)
    if (m > addMonths(currentMonth, 12)) return
    setMonthState(m)
  }, [currentMonth])

  const value = useMemo<AppState>(
    () => ({
      data,
      month,
      setMonth,
      currentMonth,
      todayDate,
      prefs,
      setPrefs: (p) => setPrefsState((old) => ({ ...old, ...p })),
      rate: prefs.currency === 'ARS' ? null : rate,
      rateStatus,
      addMovement: (m) => dispatch({ type: 'addMovement', movement: { ...m, id: newId() } }),
      updateMovement: (m) => dispatch({ type: 'updateMovement', movement: m }),
      deleteMovement: (id) => dispatch({ type: 'deleteMovement', id }),
      addRule: (r) => dispatch({ type: 'addRule', rule: { ...r, id: newId() } }),
      updateRule: (r) => dispatch({ type: 'updateRule', rule: r, fromMonth: currentMonth }),
      deleteRule: (id) => dispatch({ type: 'deleteRule', id, fromMonth: currentMonth }),
      setBudget: (n) => dispatch({ type: 'setBudget', budget: n }),
      saveCard: (c) => dispatch({ type: 'saveCard', card: { ...c, id: c.id ?? newId() } }),
      deleteCard: (id) => dispatch({ type: 'deleteCard', id }),
      resetToSample: () => dispatch({ type: 'replace', data: buildSampleData(todayDate) }),
      clearAll: () => dispatch({ type: 'replace', data: { version: 1, movements: [], recurring: [], cards: [], budget: 0 } }),
    }),
    [data, month, setMonth, currentMonth, todayDate, prefs, rate, rateStatus],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fuera de AppProvider')
  return v
}

/** Devuelve una función que formatea montos en la moneda elegida, con la cotización del día si corresponde. */
export function useFormat(): (amountARS: number) => string {
  const { prefs, rate } = useApp()
  const usd = prefs.currency !== 'ARS' && rate ? rate.sell : null
  return useCallback((n: number) => (usd ? formatMoney(n, 'USD', usd) : formatARS(n)), [usd])
}
