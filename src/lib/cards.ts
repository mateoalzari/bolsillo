import { addMonths, dateInMonth, dayOf, daysInMonth, monthOf } from './dates'
import type { CreditCard, ISODate } from './types'

/**
 * Cuándo se paga una compra con tarjeta de crédito.
 * Si la compra es hasta el día de cierre, entra en el resumen de ese mes; si es después, en el del mes siguiente.
 * El resumen se paga en su vencimiento: el mismo mes si el vencimiento es después del cierre,
 * o el mes siguiente si es antes (lo más común: cierra el 24 y vence el 5).
 */
export function firstPaymentDate(purchase: ISODate, card: Pick<CreditCard, 'closingDay' | 'dueDay'>): ISODate {
  const month = monthOf(purchase)
  const closing = Math.min(card.closingDay, daysInMonth(month))
  const statementMonth = dayOf(purchase) <= closing ? month : addMonths(month, 1)
  const dueMonth = card.dueDay > card.closingDay ? statementMonth : addMonths(statementMonth, 1)
  return dateInMonth(dueMonth, card.dueDay)
}
