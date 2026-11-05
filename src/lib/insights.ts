import { CATEGORIES } from './categories';
import { addMonths, monthKeyOf, monthName, parseISODate } from './dates';
import { formatARS } from './money';
import { fixedMonthlyTotal } from './recurring';
import { expensesInMonth, monthTotals, sumAmounts } from './stats';
import { CATEGORY_IDS, type CategoryId, type Movement, type MonthKey, type RecurringRule } from './types';

export interface Insight {
  id: 'growth' | 'steady' | 'peak-day' | 'fixed';
  text: string;
}

type Fmt = (amount: number) => string;

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Cuánto se gastó por categoría en una lista de gastos. */
function byCategory(expenses: Movement[]): Map<CategoryId, number> {
  const map = new Map<CategoryId, number>();
  for (const e of expenses) map.set(e.category as CategoryId, (map.get(e.category as CategoryId) ?? 0) + e.amount);
  return map;
}

/**
 * Categoría que más creció contra el promedio de los 3 meses anteriores (sin cuotas).
 * Solo cuenta si subió al menos 15% y $ 10.000, para no señalar ruido.
 */
export function categoryGrowthInsight(
  movements: Movement[],
  month: MonthKey,
  today: string,
  fmt: Fmt = formatARS,
): Insight | null {
  const inProgress = monthKeyOf(today) === month;
  // Sin cuotas: una compra financiada no es un cambio de consumo de ese mes.
  const consumption = (key: MonthKey) => expensesInMonth(movements, key).filter((e) => !e.installment);
  const previous = [1, 2, 3].map((i) => consumption(addMonths(month, -i))).filter((list) => list.length > 0);
  if (previous.length < 2) return null;

  const current = byCategory(consumption(month).filter((e) => e.date <= today));
  const sums = previous.map(byCategory);
  let best: { category: CategoryId; now: number; avg: number; pct: number } | null = null;

  for (const category of CATEGORY_IDS) {
    const avg = sums.reduce((acc, m) => acc + (m.get(category) ?? 0), 0) / previous.length;
    const now = current.get(category) ?? 0;
    if (avg <= 0 || now < avg * 1.15 || now - avg < 10_000) continue;
    const pct = Math.round(((now - avg) / avg) * 100);
    if (!best || pct > best.pct) best = { category, now, avg, pct };
  }

  const span = `tu promedio de los ${previous.length === 3 ? '3' : previous.length} meses anteriores`;
  if (best) {
    const label = CATEGORIES[best.category].label;
    return {
      id: 'growth',
      text: inProgress
        ? `En ${label} ya llevás ${fmt(best.now)} este mes: ${best.pct}% más que ${span} (${fmt(Math.round(best.avg))}).`
        : `En ${label} gastaste ${fmt(best.now)} en ${monthName(month)}: ${best.pct}% más que ${span} (${fmt(Math.round(best.avg))}).`,
    };
  }
  if (inProgress) return null;
  return {
    id: 'steady',
    text: `Ninguna categoría se disparó en ${monthName(month)}: todas quedaron cerca o por debajo de ${span}.`,
  };
}

/** Día de mayor gasto, sin contar fijos ni cuotas (que siempre caen el mismo día y taparían el resto). */
export function peakDayInsight(movements: Movement[], month: MonthKey, today: string, fmt: Fmt = formatARS): Insight | null {
  const variable = expensesInMonth(movements, month).filter(
    (e) => !e.recurringId && !e.installment && e.date <= today,
  );
  if (variable.length === 0) return null;

  const days = new Map<string, Movement[]>();
  for (const e of variable) days.set(e.date, [...(days.get(e.date) ?? []), e]);
  const [date, items] = [...days.entries()].sort((a, b) => sumAmounts(b[1]) - sumAmounts(a[1]))[0];
  const total = sumAmounts(items);
  const top = [...items].sort((a, b) => b.amount - a.amount)[0];
  const d = parseISODate(date);
  const when = `el ${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
  const what = top.description || CATEGORIES[top.category as CategoryId].label;

  let detail: string;
  if (items.length === 1) detail = `en ${what}`;
  else if (top.amount / total >= 0.7) detail = `casi todo en ${what}`;
  else detail = `en ${items.length} compras, la mayor en ${what}`;

  return { id: 'peak-day', text: `Sin contar fijos ni cuotas, tu día de más gasto fue ${when}: ${fmt(total)}, ${detail}.` };
}

/** Peso de los gastos fijos: contra lo que ingresó en el mes o, si no hubo ingresos, contra lo gastado. */
export function fixedShareInsight(
  movements: Movement[],
  rules: RecurringRule[],
  month: MonthKey,
  fmt: Fmt = formatARS,
): Insight | null {
  const fixed = fixedMonthlyTotal(rules, month);
  if (fixed <= 0) return null;
  const count = rules.filter((r) => r.type === 'expense').length;
  const { income, expenses } = monthTotals(movements, month);
  const base = `Tus gastos fijos${count > 1 ? ` (${count})` : ''} suman ${fmt(fixed)} por mes`;
  if (income > 0) {
    return { id: 'fixed', text: `${base}: el ${Math.round((fixed / income) * 100)}% de lo que ingresó en ${monthName(month)}.` };
  }
  if (expenses > 0) {
    return { id: 'fixed', text: `${base}: el ${Math.round((fixed / expenses) * 100)}% de lo que gastaste en ${monthName(month)}.` };
  }
  return { id: 'fixed', text: `${base}.` };
}

/** Hasta 3 lecturas calculadas con los datos del mes. Si un dato no alcanza, esa lectura no aparece. */
export function buildInsights(
  movements: Movement[],
  rules: RecurringRule[],
  month: MonthKey,
  today: string,
  fmt: Fmt = formatARS,
): Insight[] {
  return [
    categoryGrowthInsight(movements, month, today, fmt),
    peakDayInsight(movements, month, today, fmt),
    fixedShareInsight(movements, rules, month, fmt),
  ].filter((i): i is Insight => i !== null);
}
