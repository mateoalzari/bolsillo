import { addMonths, dateInMonth, dayOf, monthDiff, monthOf } from './dates'
import type { Entry, MonthKey, Movement } from './types'

export const MAX_INSTALLMENTS = 24

/** Fecha del primer pago: el vencimiento de la tarjeta si lo hay, si no la fecha de compra. */
export function paymentStartOf(m: Movement): string {
  return m.kind === 'gasto' && m.method === 'credito' && m.paymentStart ? m.paymentStart : m.date
}

export function installmentCount(m: Movement): number {
  if (m.kind !== 'gasto' || m.method !== 'credito') return 1
  const n = Math.round(m.installments ?? 1)
  return Math.min(Math.max(n, 1), MAX_INSTALLMENTS)
}

/**
 * Reparte un total en n cuotas en centavos exactos: la suma de las cuotas es siempre el total.
 * Los centavos que sobran van en la primera cuota.
 */
export function splitInstallments(total: number, n: number): number[] {
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / n)
  const rest = cents - base * n
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? rest : 0)) / 100)
}

/**
 * Las cuotas de una compra NO se guardan como filas: se guardan la compra (total y cantidad de cuotas)
 * y se calculan acá. Así, editar la compra actualiza todas sus cuotas y nunca quedan cuotas huérfanas.
 * La cuota i (0-based) cae en el mes del primer pago + i, el mismo día (ajustado al fin de mes).
 * El primer pago es la fecha de compra, o el vencimiento del resumen si la compra es con una tarjeta cargada.
 */
export function entriesForMovement(m: Movement): Entry[] {
  const n = installmentCount(m)
  const start = paymentStartOf(m)
  if (n === 1) {
    return [{ id: m.id, movementId: m.id, kind: m.kind, amount: m.amount, category: m.category, date: start, description: m.description, method: m.method, recurringId: m.recurringId, purchaseDate: m.date, cardId: m.cardId }]
  }
  const parts = splitInstallments(m.amount, n)
  const startMonth = monthOf(start)
  const day = dayOf(start)
  return parts.map((amount, i) => ({
    id: `${m.id}#${i + 1}`,
    movementId: m.id,
    kind: m.kind,
    amount,
    category: m.category,
    date: dateInMonth(addMonths(startMonth, i), day),
    description: m.description,
    method: m.method,
    installment: { number: i + 1, total: n },
    purchaseDate: m.date,
    cardId: m.cardId,
  }))
}

/** Todas las líneas (movimientos y cuotas) que caen en un mes, ordenadas de la más reciente a la más vieja. */
export function entriesForMonth(movements: Movement[], month: MonthKey): Entry[] {
  const out: Entry[] = []
  for (const m of movements) {
    const n = installmentCount(m)
    const offset = monthDiff(monthOf(paymentStartOf(m)), month)
    if (offset < 0 || offset >= n) continue
    out.push(entriesForMovement(m)[offset])
  }
  return out.sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)))
}

/** Líneas de varios meses de una sola vez (más eficiente que llamar a entriesForMonth en bucle). */
export function entriesByMonth(movements: Movement[], months: MonthKey[]): Map<MonthKey, Entry[]> {
  const map = new Map<MonthKey, Entry[]>(months.map((m) => [m, []]))
  for (const mov of movements) {
    for (const e of entriesForMovement(mov)) {
      map.get(monthOf(e.date))?.push(e)
    }
  }
  return map
}

export function sumBy(entries: Entry[], kind: 'gasto' | 'ingreso'): number {
  let t = 0
  for (const e of entries) if (e.kind === kind) t += e.amount
  return Math.round(t * 100) / 100
}
