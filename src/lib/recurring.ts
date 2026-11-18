import { addDays, addMonths, dateInMonth, daysBetween, monthOf, monthRange } from './dates'
import type { ISODate, MonthKey, Movement, RecurringRule } from './types'

/** Clave única de un movimiento generado: una regla genera como máximo un movimiento por mes. */
export function recurringKey(ruleId: string, month: MonthKey): string {
  return `${ruleId}@${month}`
}

export function isActiveIn(rule: RecurringRule, month: MonthKey): boolean {
  return month >= rule.startMonth && (!rule.endMonth || month <= rule.endMonth)
}

/**
 * Genera los movimientos de los gastos e ingresos fijos que faltan, desde el inicio de cada regla
 * hasta `upToMonth`. Es idempotente: se puede llamar cada vez que se abre la app sin duplicar nada,
 * porque cada (regla, mes) se genera una sola vez y los meses que el usuario borró quedan en skippedMonths.
 */
export function materializeRecurring(rules: RecurringRule[], movements: Movement[], upToMonth: MonthKey): Movement[] {
  const existing = new Set<string>()
  for (const m of movements) {
    if (m.recurringId) existing.add(recurringKey(m.recurringId, monthOf(m.date)))
  }
  const created: Movement[] = []
  for (const rule of rules) {
    const last = rule.endMonth && rule.endMonth < upToMonth ? rule.endMonth : upToMonth
    if (rule.startMonth > last) continue
    const skipped = new Set(rule.skippedMonths ?? [])
    for (const month of monthRange(rule.startMonth, last)) {
      const key = recurringKey(rule.id, month)
      if (existing.has(key) || skipped.has(month)) continue
      created.push({
        id: key,
        kind: rule.kind,
        amount: rule.amount,
        category: rule.category,
        date: dateInMonth(month, rule.dayOfMonth),
        description: rule.description,
        method: rule.method,
        recurringId: rule.id,
      })
    }
  }
  return created
}

export interface Upcoming {
  ruleId: string
  date: ISODate
  amount: number
  description: string
  category: string
  daysLeft: number
}

/** Próximos vencimientos de gastos fijos dentro de `days` días desde `from` (incluido). */
export function upcomingDue(rules: RecurringRule[], from: ISODate, days = 30): Upcoming[] {
  const until = addDays(from, days)
  const out: Upcoming[] = []
  const startMonth = monthOf(from)
  for (const rule of rules) {
    if (rule.kind !== 'gasto') continue
    for (let i = 0; i <= 2; i++) {
      const month = addMonths(startMonth, i)
      if (!isActiveIn(rule, month) || rule.skippedMonths?.includes(month)) continue
      const date = dateInMonth(month, rule.dayOfMonth)
      if (date < from || date > until) continue
      const daysLeft = daysBetween(from, date)
      out.push({ ruleId: rule.id, date, amount: rule.amount, description: rule.description, category: rule.category, daysLeft })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** Total de gastos fijos que se van a generar en un mes. */
export function recurringTotalFor(rules: RecurringRule[], month: MonthKey, kind: 'gasto' | 'ingreso' = 'gasto'): number {
  return rules
    .filter((r) => r.kind === kind && isActiveIn(r, month) && !r.skippedMonths?.includes(month))
    .reduce((t, r) => t + r.amount, 0)
}
