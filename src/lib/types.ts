import type { CurrencyCode } from './currency'

export type Kind = 'gasto' | 'ingreso'
export type PaymentMethod = 'efectivo' | 'debito' | 'credito' | 'transferencia'

/** Fecha local en formato YYYY-MM-DD */
export type ISODate = string
/** Mes en formato YYYY-MM */
export type MonthKey = string

export interface Movement {
  id: string
  kind: Kind
  /** Monto total en pesos. En una compra en cuotas es el total de la compra. */
  amount: number
  category: string
  date: ISODate
  description: string
  method: PaymentMethod
  /** Cantidad de cuotas (1–24). Solo para gastos con tarjeta de crédito. */
  installments?: number
  /** Si fue generado por un gasto/ingreso fijo, la regla y el mes que lo originaron. */
  recurringId?: string
  /** Tarjeta de crédito con la que se pagó. */
  cardId?: string
  /**
   * Fecha en que se paga la primera cuota (el vencimiento del resumen donde entra la compra).
   * Se calcula al guardar según el cierre de la tarjeta. Sin valor = la primera cuota cae en la fecha de compra.
   */
  paymentStart?: ISODate
}

export interface CreditCard {
  id: string
  name: string
  /** Día de cierre del resumen (1–31) */
  closingDay: number
  /** Día de vencimiento del resumen (1–31) */
  dueDay: number
}

export interface RecurringRule {
  id: string
  kind: Kind
  amount: number
  category: string
  description: string
  method: PaymentMethod
  /** Día del mes en que vence o se cobra (1–31; se ajusta al último día si el mes es más corto). */
  dayOfMonth: number
  /** Primer mes en que se genera. */
  startMonth: MonthKey
  /** Último mes en que se genera (incluido). Sin valor = sigue indefinidamente. */
  endMonth?: MonthKey
  /** Meses en los que el usuario borró el movimiento generado: no se vuelven a crear. */
  skippedMonths?: MonthKey[]
}

/**
 * Una línea del mes: un movimiento simple, o una cuota de una compra en cuotas.
 * Es lo que se lista, se suma y se grafica.
 */
export interface Entry {
  id: string
  movementId: string
  kind: Kind
  amount: number
  category: string
  date: ISODate
  description: string
  method: PaymentMethod
  installment?: { number: number; total: number }
  recurringId?: string
  /** Fecha de la compra original (para una cuota, distinta de `date`, que es cuando se paga). */
  purchaseDate: ISODate
  cardId?: string
}

export interface AppData {
  version: 1
  movements: Movement[]
  recurring: RecurringRule[]
  cards: CreditCard[]
  /** Moneda principal: en la que se cargan todos los montos. */
  currency: CurrencyCode
  /** Presupuesto mensual de gastos, en pesos. 0 = sin presupuesto. */
  budget: number
}
