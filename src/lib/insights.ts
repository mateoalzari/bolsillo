import { getCategory } from './categories'
import { addMonths, daysInMonth, monthName } from './dates'
import { entriesByMonth } from './ledger'
import { formatARS, formatPercent } from './money'
import { budgetState, committedFor, expensesByCategory } from './stats'
import type { Entry, MonthKey, Movement, RecurringRule } from './types'

export type InsightTone = 'neutral' | 'good' | 'warn'

export interface Insight {
  id: string
  tone: InsightTone
  text: string
}

interface Input {
  movements: Movement[]
  rules: RecurringRule[]
  budget: number
  month: MonthKey
  /** Día del mes hasta el que hay datos (hoy si es el mes en curso, el último día si es un mes pasado). */
  day: number
  isCurrentMonth: boolean
  /** Formato de montos (pesos por defecto; la app pasa el de la moneda elegida). */
  format?: (amount: number) => string
}

/**
 * Hasta 3 frases calculadas con los datos del usuario, de la más útil a la menos útil.
 * Son reglas simples y explicables; no hay IA acá.
 */
export function buildInsights({ movements, rules, budget, month, day, isCurrentMonth, format = formatARS }: Input): Insight[] {
  const prevMonths = [addMonths(month, -3), addMonths(month, -2), addMonths(month, -1)]
  const byMonth = entriesByMonth(movements, [...prevMonths, month])
  const current = byMonth.get(month) ?? []
  const expenses = current.filter((e) => e.kind === 'gasto')
  const out: Insight[] = []

  // 1. Categoría por encima de su promedio de los 3 meses anteriores
  const cats = expensesByCategory(current)
  const totalSpent = expenses.reduce((t, e) => t + e.amount, 0)
  let best: { category: string; ratio: number } | null = null
  for (const c of cats) {
    const history = prevMonths.map((m) => sumCategory(byMonth.get(m) ?? [], c.category))
    const monthsWithData = history.filter((v) => v > 0).length
    if (monthsWithData < 2) continue
    const avg = history.reduce((a, b) => a + b, 0) / 3
    const ratio = (c.amount - avg) / avg
    if (ratio >= 0.15 && c.amount - avg >= totalSpent * 0.03 && (!best || ratio > best.ratio)) best = { category: c.category, ratio }
  }
  if (best) {
    const label = getCategory(best.category).label
    out.push({
      id: 'category-above-avg',
      tone: 'warn',
      text: `En ${label} ${isCurrentMonth ? 'ya llevás' : 'gastaste'} ${formatPercent(best.ratio)} más que tu promedio de los últimos 3 meses.`,
    })
  }

  // 2. Proyección al cierre del mes contra el presupuesto (solo mes en curso, con algunos días de datos)
  if (isCurrentMonth && budget > 0 && day >= 5) {
    // Lo variable es lo que se compró este mes; cuotas y resúmenes de compras anteriores ya estaban comprometidos
    const variable = expenses.filter((e) => !e.recurringId && e.purchaseDate.slice(0, 7) === month).reduce((t, e) => t + e.amount, 0)
    const committedThisMonth = totalSpent - variable
    const remainingDays = daysInMonth(month) - day
    const projected = committedThisMonth + variable + (variable / day) * remainingDays
    const diff = projected - budget
    if (diff > 0) {
      out.push({ id: 'projection', tone: 'warn', text: `A este ritmo cerrás el mes con ${format(projected)} de gastos: ${format(diff)} por encima del presupuesto.` })
    } else {
      out.push({ id: 'projection', tone: 'good', text: `A este ritmo cerrás el mes ${format(-diff)} por debajo del presupuesto. Vas bien.` })
    }
  } else if (!isCurrentMonth && budget > 0) {
    const b = budgetState(budget, totalSpent)
    out.push(
      b.status === 'over'
        ? { id: 'budget-closed', tone: 'warn', text: `Este mes te pasaste ${format(-b.remaining)} del presupuesto.` }
        : { id: 'budget-closed', tone: 'good', text: `Cerraste el mes ${format(b.remaining)} por debajo del presupuesto.` },
    )
  }

  // 3. Lo comprometido en cuotas para el mes siguiente
  const next = committedFor(movements, rules, addMonths(month, 1))
  if (next.installments > 0) {
    out.push({
      id: 'committed-next',
      tone: 'neutral',
      text: `El mes que viene ya tenés ${format(next.installments)} comprometidos en tarjeta y cuotas (${next.installmentCount} ${next.installmentCount === 1 ? 'pago' : 'pagos'}).`,
    })
  }

  // Relleno: la categoría que más pesa
  if (out.length < 3 && cats.length > 0 && cats[0].share >= 0.2) {
    out.push({ id: 'top-category', tone: 'neutral', text: `${getCategory(cats[0].category).label} se lleva el ${formatPercent(cats[0].share)} de tus gastos del mes.` })
  }
  if (out.length < 3 && current.length > 0 && !current.some((e) => e.kind === 'ingreso')) {
    out.push({ id: 'no-income', tone: 'neutral', text: `Todavía no cargaste ingresos en ${monthName(month)}: el balance solo muestra gastos.` })
  }
  return out.slice(0, 3)
}

function sumCategory(entries: Entry[], category: string): number {
  let t = 0
  for (const e of entries) if (e.kind === 'gasto' && e.category === category) t += e.amount
  return t
}
