import { monthKeyOf, shiftMonths } from './dates';
import type { InstallmentInfo, Movement, MonthKey } from './types';

/**
 * Reparte un total en cuotas enteras. El resto de la división va en la primera
 * cuota, así la suma da exacto: 100.000 en 3 → 33.334 + 33.333 + 33.333.
 */
export function splitAmount(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const rest = total - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + rest : base));
}

export type InstallmentBase = Omit<Movement, 'id' | 'amount' | 'installment' | 'date'>;

/** Una fila por mes, a partir de la fecha de compra, cada una marcada con su número de cuota. */
export function buildInstallments(
  base: InstallmentBase,
  firstDate: string,
  totalAmount: number,
  count: number,
  purchaseId: string,
): Movement[] {
  return splitAmount(totalAmount, count).map((amount, i) => ({
    ...base,
    id: `${purchaseId}-c${i + 1}`,
    amount,
    date: shiftMonths(firstDate, i),
    installment: { purchaseId, number: i + 1, count, totalAmount },
  }));
}

export function installmentLabel(info: InstallmentInfo): string {
  return `Cuota ${info.number}/${info.count}`;
}

/** Todas las cuotas de la misma compra, ordenadas. */
export function purchaseRows(movements: Movement[], purchaseId: string): Movement[] {
  return movements
    .filter((m) => m.installment?.purchaseId === purchaseId)
    .sort((a, b) => a.installment!.number - b.installment!.number);
}

export interface Commitment {
  total: number;
  /** Cantidad de compras distintas con cuota ese mes. */
  purchases: number;
}

/** Lo que ya está comprometido en cuotas para un mes. */
export function committedInMonth(movements: Movement[], key: MonthKey): Commitment {
  const rows = movements.filter((m) => m.installment && monthKeyOf(m.date) === key);
  return {
    total: rows.reduce((acc, m) => acc + m.amount, 0),
    purchases: new Set(rows.map((m) => m.installment!.purchaseId)).size,
  };
}
