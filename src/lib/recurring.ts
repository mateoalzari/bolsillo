import { addDays, addMonths, dateInMonth, monthKeyOf } from './dates';
import { installmentLabel } from './installments';
import type { AnyCategoryId, Movement, MonthKey, RecurringRule } from './types';

export function ruleActiveIn(rule: RecurringRule, month: MonthKey): boolean {
  return month >= rule.startMonth && (!rule.endMonth || month <= rule.endMonth);
}

/**
 * Filas que faltan generar para los fijos mensuales: una por mes desde que empezó
 * el fijo hasta hoy, solo cuando su fecha ya llegó. Respeta los meses borrados a mano.
 */
export function materializeRecurring(rules: RecurringRule[], movements: Movement[], today: string): Movement[] {
  const existing = new Set(
    movements.filter((m) => m.recurringId).map((m) => `${m.recurringId}|${monthKeyOf(m.date)}`),
  );
  const currentMonth = monthKeyOf(today);
  const created: Movement[] = [];
  for (const rule of rules) {
    for (let month = rule.startMonth; month <= currentMonth; month = addMonths(month, 1)) {
      if (!ruleActiveIn(rule, month) || rule.skipped.includes(month)) continue;
      const date = dateInMonth(month, rule.day);
      if (date > today || existing.has(`${rule.id}|${month}`)) continue;
      created.push({
        id: `${rule.id}-${month}`,
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        date,
        description: rule.description,
        method: rule.method,
        createdAt: 1,
        recurringId: rule.id,
      });
    }
  }
  return created;
}

export interface UpcomingItem {
  key: string;
  date: string;
  description: string;
  category: AnyCategoryId;
  amount: number;
  kind: 'fijo' | 'cuota';
  /** "Cuota 3/12" en las cuotas. */
  detail?: string;
}

/** Gastos fijos y cuotas que vencen después de hoy, dentro de los próximos `days` días. */
export function upcomingDue(
  rules: RecurringRule[],
  movements: Movement[],
  today: string,
  days = 30,
): UpcomingItem[] {
  const until = addDays(today, days);
  const items: UpcomingItem[] = [];

  for (const rule of rules) {
    if (rule.type !== 'expense') continue;
    for (const month of [monthKeyOf(today), addMonths(monthKeyOf(today), 1)]) {
      const date = dateInMonth(month, rule.day);
      if (date <= today || date > until) continue;
      if (!ruleActiveIn(rule, month) || rule.skipped.includes(month)) continue;
      items.push({
        key: `${rule.id}-${month}`,
        date,
        description: rule.description,
        category: rule.category,
        amount: rule.amount,
        kind: 'fijo',
      });
    }
  }

  for (const m of movements) {
    if (!m.installment || m.date <= today || m.date > until) continue;
    items.push({
      key: m.id,
      date: m.date,
      description: m.description,
      category: m.category,
      amount: m.amount,
      kind: 'cuota',
      detail: installmentLabel(m.installment),
    });
  }

  return items.sort((a, b) => (a.date === b.date ? b.amount - a.amount : a.date < b.date ? -1 : 1));
}

/** Suma de los gastos fijos activos en un mes (según lo pactado, aunque todavía no vencieron). */
export function fixedMonthlyTotal(rules: RecurringRule[], month: MonthKey): number {
  return rules
    .filter((r) => r.type === 'expense' && ruleActiveIn(r, month) && !r.skipped.includes(month))
    .reduce((acc, r) => acc + r.amount, 0);
}
