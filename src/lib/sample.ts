import { addMonths, dateInMonth, dayOf, daysInMonth, monthOf, monthRange } from './dates'
import { firstPaymentDate } from './cards'
import { materializeRecurring } from './recurring'
import type { AppData, CreditCard, ISODate, Movement, PaymentMethod, RecurringRule } from './types'

/** Generador pseudoaleatorio con semilla: los datos de ejemplo salen siempre iguales. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Datos de ejemplo realistas para una persona en Argentina: 7 meses de historia hasta `todayDate`,
 * con sueldo, alquiler, servicios, supermercado, salidas, compras en cuotas e ingresos extra.
 */
export function buildSampleData(todayDate: ISODate): AppData {
  const rand = rng(20261118)
  const between = (min: number, max: number, step = 100) => Math.round((min + rand() * (max - min)) / step) * step
  const current = monthOf(todayDate)
  const first = addMonths(current, -6)
  let n = 0
  const id = () => `demo-${++n}`

  const rules: RecurringRule[] = [
    { id: 'fijo-sueldo', kind: 'ingreso', amount: 1_950_000, category: 'sueldo', description: 'Sueldo', method: 'transferencia', dayOfMonth: 1, startMonth: first },
    { id: 'fijo-alquiler', kind: 'gasto', amount: 520_000, category: 'casa', description: 'Alquiler + expensas', method: 'transferencia', dayOfMonth: 10, startMonth: first },
    { id: 'fijo-prepaga', kind: 'gasto', amount: 168_000, category: 'salud', description: 'Prepaga', method: 'debito', dayOfMonth: 8, startMonth: first },
    { id: 'fijo-gym', kind: 'gasto', amount: 42_000, category: 'salud', description: 'Gimnasio', method: 'debito', dayOfMonth: 5, startMonth: first },
    { id: 'fijo-internet', kind: 'gasto', amount: 31_500, category: 'servicios', description: 'Internet fibra', method: 'debito', dayOfMonth: 12, startMonth: first },
    { id: 'fijo-luz', kind: 'gasto', amount: 36_800, category: 'servicios', description: 'Luz', method: 'debito', dayOfMonth: 18, startMonth: first },
    { id: 'fijo-celular', kind: 'gasto', amount: 23_900, category: 'servicios', description: 'Plan de celular', method: 'debito', dayOfMonth: 21, startMonth: first },
    { id: 'fijo-streaming', kind: 'gasto', amount: 15_400, category: 'ocio', description: 'Streaming y música', method: 'credito', dayOfMonth: 24, startMonth: first },
  ]

  const card: CreditCard = { id: 'tarjeta-visa', name: 'Visa', closingDay: 24, dueDay: 5 }

  const movements: Movement[] = []
  const add = (date: ISODate, kind: Movement['kind'], amount: number, category: string, description: string, method: PaymentMethod, installments?: number) => {
    if (date > todayDate) return
    const withCard = kind === 'gasto' && method === 'credito' ? { cardId: card.id, paymentStart: firstPaymentDate(date, card) } : {}
    movements.push({ id: id(), kind, amount, category, date, description, method, ...withCard, ...(installments && installments > 1 ? { installments } : {}) })
  }

  for (const month of monthRange(first, current)) {
    const last = month === current ? dayOf(todayDate) : daysInMonth(month)
    const onDay = (d: number) => (d <= last ? dateInMonth(month, d) : null)
    const push = (d: number, ...rest: [Movement['kind'], number, string, string, PaymentMethod, number?]) => {
      const date = onDay(d)
      if (date) add(date, ...rest)
    }

    // Supermercado, una vez por semana
    for (const d of [3, 10, 17, 24, 30]) {
      if (d > daysInMonth(month)) continue
      push(d, 'gasto', between(52_000, 96_000), 'super', rand() > 0.5 ? 'Coto' : 'Carrefour', 'debito')
    }
    push(14, 'gasto', between(9_000, 16_000), 'super', 'Verdulería', 'efectivo')
    // Comida afuera
    const outs = 2 + Math.floor(rand() * 3)
    for (let i = 0; i < outs; i++) push(4 + Math.floor(rand() * 24), 'gasto', between(14_000, 46_000), 'comida', ['Pizzería', 'Delivery sushi', 'Café con amigos', 'Parrilla'][Math.floor(rand() * 4)], rand() > 0.4 ? 'debito' : 'credito')
    // Transporte
    push(2, 'gasto', 20_000, 'transporte', 'Carga SUBE', 'debito')
    push(16, 'gasto', 20_000, 'transporte', 'Carga SUBE', 'debito')
    push(9, 'gasto', between(38_000, 52_000), 'transporte', 'Nafta', 'credito')
    push(23, 'gasto', between(6_000, 14_000), 'transporte', 'Uber', 'credito')
    // Ocio
    if (rand() > 0.3) push(19, 'gasto', between(18_000, 40_000), 'ocio', rand() > 0.5 ? 'Cine' : 'Recital', 'credito')
    // Farmacia ocasional
    if (rand() > 0.5) push(13, 'gasto', between(8_000, 22_000), 'salud', 'Farmacia', 'debito')
    // Trabajos extra algunos meses
    if (rand() > 0.45) push(20, 'ingreso', between(180_000, 420_000, 1_000), 'extra', 'Diseño freelance', 'transferencia')
  }

  const day = (d: number) => dateInMonth(current, Math.min(d, dayOf(todayDate)))

  // Compras en cuotas
  add(dateInMonth(addMonths(current, -5), 7), 'gasto', 1_140_000, 'casa', 'Heladera no frost', 'credito', 12)
  add(dateInMonth(addMonths(current, -3), 15), 'gasto', 189_000, 'compras', 'Zapatillas running', 'credito', 3)
  add(dateInMonth(addMonths(current, -2), 4), 'gasto', 780_000, 'compras', 'Smart TV 50"', 'credito', 6)
  add(dateInMonth(addMonths(current, -1), 22), 'gasto', 96_000, 'educacion', 'Curso de inglés', 'credito', 4)
  add(day(6), 'gasto', 642_000, 'ocio', 'Pasajes a Bariloche', 'credito', 6)

  // Este mes, más gasto en salud que de costumbre (para que se vea una lectura automática)
  add(day(11), 'gasto', 95_000, 'salud', 'Dentista', 'debito')
  add(day(Math.max(1, dayOf(todayDate) - 1)), 'gasto', 27_500, 'salud', 'Farmacia', 'debito')

  // Los fijos del mes en curso se generan completos (aunque vengan después de hoy): así el balance muestra lo que de verdad queda.
  const generated = materializeRecurring(rules, movements, current)
  return { version: 1, movements: [...movements, ...generated], recurring: rules, cards: [card], currency: 'ARS', budget: 1_900_000 }
}
