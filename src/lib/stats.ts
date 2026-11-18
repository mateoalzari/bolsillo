import { addMonths, dateInMonth, dayOf, daysInMonth, monthRange } from './dates'
import { entriesByMonth, entriesForMonth, sumBy } from './ledger'
import { recurringTotalFor } from './recurring'
import type { Entry, ISODate, MonthKey, Movement, RecurringRule } from './types'

export interface MonthBalance {
  income: number
  expenses: number
  left: number
}

export function balanceOf(entries: Entry[]): MonthBalance {
  const income = sumBy(entries, 'ingreso')
  const expenses = sumBy(entries, 'gasto')
  return { income, expenses, left: Math.round((income - expenses) * 100) / 100 }
}

export interface Comparison {
  /** Gasto del mes anterior hasta el mismo día del mes. */
  previous: number
  current: number
  /** Variación relativa (0.12 = 12% más). null si el mes anterior no tiene gastos para comparar. */
  change: number | null
  /** Día de corte usado para comparar. */
  day: number
}

/**
 * Compara el gasto del mes hasta `uptoDay` contra el mes anterior hasta el mismo día ("a la misma altura").
 * Si el mes ya terminó, se compara el mes completo.
 */
export function compareWithPreviousMonth(movements: Movement[], month: MonthKey, uptoDay: number): Comparison {
  const prev = addMonths(month, -1)
  const cutCur = dateInMonth(month, uptoDay)
  const cutPrev = dateInMonth(prev, uptoDay)
  const current = sumBy(entriesForMonth(movements, month).filter((e) => e.date <= cutCur), 'gasto')
  const previous = sumBy(entriesForMonth(movements, prev).filter((e) => e.date <= cutPrev), 'gasto')
  return { previous, current, change: previous > 0 ? (current - previous) / previous : null, day: Math.min(uptoDay, daysInMonth(month)) }
}

/** Día hasta el que se compara un mes: hoy si es el mes actual, el último día si es un mes pasado. */
export function comparisonDay(month: MonthKey, todayDate: ISODate): number {
  const current = todayDate.slice(0, 7)
  if (month === current) return dayOf(todayDate)
  return daysInMonth(month)
}

export type BudgetStatus = 'none' | 'ok' | 'warn' | 'over'

export interface BudgetState {
  budget: number
  spent: number
  ratio: number
  remaining: number
  status: BudgetStatus
}

/** Aviso al 80% y al 100% del presupuesto. */
export function budgetState(budget: number, spent: number): BudgetState {
  if (!budget || budget <= 0) return { budget: 0, spent, ratio: 0, remaining: 0, status: 'none' }
  const ratio = spent / budget
  const status: BudgetStatus = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok'
  return { budget, spent, ratio, remaining: budget - spent, status }
}

export interface Committed {
  /** Pagos de compras hechas antes de ese mes que caen en ese mes (cuotas y resúmenes de tarjeta). */
  installments: number
  /** Gastos fijos que se van a generar en ese mes. */
  recurring: number
  total: number
  /** Cantidad de pagos distintos. */
  installmentCount: number
}

/**
 * Lo que ya está comprometido para un mes: lo que se paga ese mes por compras hechas antes
 * (cuotas y compras con tarjeta que entran en el resumen) más los gastos fijos activos.
 */
export function committedFor(movements: Movement[], rules: RecurringRule[], month: MonthKey): Committed {
  const installmentEntries = entriesForMonth(movements, month).filter((e) => e.kind === 'gasto' && !e.recurringId && e.purchaseDate.slice(0, 7) < month)
  const installments = sumBy(installmentEntries, 'gasto')
  const recurring = recurringTotalFor(rules, month, 'gasto')
  return { installments, recurring, total: installments + recurring, installmentCount: installmentEntries.length }
}

export interface MonthPoint {
  month: MonthKey
  income: number
  expenses: number
}

export function lastMonthsSeries(movements: Movement[], endMonth: MonthKey, count = 6): MonthPoint[] {
  const months = monthRange(addMonths(endMonth, -(count - 1)), endMonth)
  const byMonth = entriesByMonth(movements, months)
  return months.map((month) => {
    const b = balanceOf(byMonth.get(month) ?? [])
    return { month, income: b.income, expenses: b.expenses }
  })
}

export interface CategoryTotal {
  category: string
  amount: number
  share: number
}

export function expensesByCategory(entries: Entry[]): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const e of entries) if (e.kind === 'gasto') totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount)
  const sum = [...totals.values()].reduce((a, b) => a + b, 0)
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount, share: sum ? amount / sum : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

/** Gasto por día del mes: un valor por cada día (índice 0 = día 1). */
export function expensesByDay(entries: Entry[], month: MonthKey): number[] {
  const out = new Array(daysInMonth(month)).fill(0)
  for (const e of entries) if (e.kind === 'gasto') out[dayOf(e.date) - 1] += e.amount
  return out
}
