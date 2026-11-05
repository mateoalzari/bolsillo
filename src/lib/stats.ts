import { addMonths, daysInMonth, monthKeyOf, monthName } from './dates';
import { CATEGORY_IDS, type CategoryId, type Expense, type MonthKey } from './types';

export function expensesInMonth(expenses: Expense[], key: MonthKey): Expense[] {
  return expenses.filter((e) => monthKeyOf(e.date) === key);
}

export function sumAmounts(expenses: Expense[]): number {
  return expenses.reduce((acc, e) => acc + e.amount, 0);
}

export interface CategoryTotal {
  category: CategoryId;
  total: number;
  /** Proporción del total del mes (0 a 1). */
  share: number;
}

/** Totales por categoría, de mayor a menor, sin las categorías vacías. */
export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const totals = new Map<CategoryId, number>();
  for (const e of expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  const grand = sumAmounts(expenses);
  return CATEGORY_IDS.filter((c) => totals.has(c))
    .map((category) => {
      const total = totals.get(category)!;
      return { category, total, share: grand ? total / grand : 0 };
    })
    .sort((a, b) => b.total - a.total);
}

export interface DayTotal {
  day: number;
  total: number;
}

/** Un elemento por cada día del mes (1..28/31), con 0 si no hubo gastos. */
export function totalsByDay(expenses: Expense[], key: MonthKey): DayTotal[] {
  const days: DayTotal[] = Array.from({ length: daysInMonth(key) }, (_, i) => ({ day: i + 1, total: 0 }));
  for (const e of expenses) {
    if (monthKeyOf(e.date) !== key) continue;
    days[Number(e.date.slice(8, 10)) - 1].total += e.amount;
  }
  return days;
}

export type BudgetLevel = 'ok' | 'warning' | 'over';

export interface BudgetStatus {
  ratio: number;
  remaining: number;
  level: BudgetLevel;
}

/** Aviso al pasar el 80% y el 100% del presupuesto. */
export function budgetStatus(spent: number, budget: number): BudgetStatus {
  if (budget <= 0) return { ratio: 0, remaining: 0, level: 'ok' };
  const ratio = spent / budget;
  const level: BudgetLevel = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'ok';
  return { ratio, remaining: budget - spent, level };
}

export interface MonthComparison {
  current: number;
  previous: number;
  /** Variación porcentual redondeada (positiva = gastaste más). null si no hay con qué comparar. */
  percent: number | null;
  /** true si se compara contra el mes anterior hasta el mismo día (mes en curso). */
  partial: boolean;
  previousName: string;
}

/**
 * Compara el mes elegido con el anterior. Si el mes elegido es el actual,
 * se compara contra el mes anterior "a esta altura" (hasta el mismo día),
 * para que la comparación sea justa.
 */
export function compareWithPreviousMonth(
  expenses: Expense[],
  key: MonthKey,
  today: string,
): MonthComparison {
  const prevKey = addMonths(key, -1);
  const partial = monthKeyOf(today) === key;
  const cutoffDay = partial ? Number(today.slice(8, 10)) : 31;

  const current = sumAmounts(expensesInMonth(expenses, key));
  const previous = sumAmounts(
    expensesInMonth(expenses, prevKey).filter((e) => Number(e.date.slice(8, 10)) <= cutoffDay),
  );
  // Redondeo simétrico: −67,5 % → −68 % (igual que +67,5 % → +68 %).
  const raw = previous > 0 ? ((current - previous) / previous) * 100 : null;
  const percent = raw === null ? null : Math.sign(raw) * Math.round(Math.abs(raw));
  return { current, previous, percent, partial, previousName: monthName(prevKey) };
}

/** "12% menos que octubre", "5% más que octubre a esta altura", "Igual que octubre". */
export function comparisonText(c: MonthComparison): string {
  const suffix = c.partial ? ' a esta altura' : '';
  if (c.percent === null) return `Sin gastos en ${c.previousName} para comparar`;
  if (c.percent === 0) return `Igual que ${c.previousName}${suffix}`;
  const word = c.percent > 0 ? 'más' : 'menos';
  return `${Math.abs(c.percent)}% ${word} que ${c.previousName}${suffix}`;
}

/** Minúsculas y sin tildes, para que "cafe" encuentre "Café". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export interface ExpenseFilter {
  category: CategoryId | 'todas';
  query: string;
}

export function filterExpenses(expenses: Expense[], filter: ExpenseFilter): Expense[] {
  const q = normalize(filter.query);
  return expenses.filter(
    (e) =>
      (filter.category === 'todas' || e.category === filter.category) &&
      (!q || normalize(e.description).includes(q)),
  );
}

/** Más recientes primero; dentro del mismo día, el último cargado primero. */
export function sortByDateDesc(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
  );
}

export interface DayGroup {
  date: string;
  total: number;
  items: Expense[];
}

/** Agrupa una lista (ya ordenada) por fecha, manteniendo el orden. */
export function groupByDate(sorted: Expense[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) {
      last.items.push(e);
      last.total += e.amount;
    } else {
      groups.push({ date: e.date, total: e.amount, items: [e] });
    }
  }
  return groups;
}
