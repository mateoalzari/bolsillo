import { addMonths, daysInMonth, monthKeyOf, monthName } from './dates';
import { categoryInfo } from './categories';
import { CATEGORY_IDS, type AnyCategoryId, type CategoryId, type Movement, type MonthKey } from './types';

export function movementsInMonth(movements: Movement[], key: MonthKey): Movement[] {
  return movements.filter((m) => monthKeyOf(m.date) === key);
}

export const onlyExpenses = (movements: Movement[]) => movements.filter((m) => m.type === 'expense');
export const onlyIncome = (movements: Movement[]) => movements.filter((m) => m.type === 'income');

/** Gastos del mes (sin ingresos). */
export function expensesInMonth(movements: Movement[], key: MonthKey): Movement[] {
  return onlyExpenses(movementsInMonth(movements, key));
}

export function sumAmounts(movements: Movement[]): number {
  return movements.reduce((acc, m) => acc + m.amount, 0);
}

export interface MonthTotals {
  income: number;
  expenses: number;
  /** Ingresos − gastos: lo que queda (o falta) en el mes. */
  balance: number;
  /** Proporción de los ingresos que queda (0 a 1); null si no hubo ingresos. */
  savingsRate: number | null;
}

export function monthTotals(movements: Movement[], key: MonthKey): MonthTotals {
  const inMonth = movementsInMonth(movements, key);
  const income = sumAmounts(onlyIncome(inMonth));
  const expenses = sumAmounts(onlyExpenses(inMonth));
  const balance = income - expenses;
  return { income, expenses, balance, savingsRate: income > 0 ? balance / income : null };
}

export interface CategoryTotal {
  category: CategoryId;
  total: number;
  /** Proporción del total del mes (0 a 1). */
  share: number;
}

/** Totales de gasto por categoría, de mayor a menor, sin las categorías vacías. */
export function totalsByCategory(movements: Movement[]): CategoryTotal[] {
  const expenses = onlyExpenses(movements);
  const totals = new Map<CategoryId, number>();
  for (const e of expenses) {
    const c = e.category as CategoryId;
    totals.set(c, (totals.get(c) ?? 0) + e.amount);
  }
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

/** Gasto de cada día del mes (1..28/31), con 0 si no hubo gastos. */
export function totalsByDay(movements: Movement[], key: MonthKey): DayTotal[] {
  const days: DayTotal[] = Array.from({ length: daysInMonth(key) }, (_, i) => ({ day: i + 1, total: 0 }));
  for (const m of movements) {
    if (m.type !== 'expense' || monthKeyOf(m.date) !== key) continue;
    days[Number(m.date.slice(8, 10)) - 1].total += m.amount;
  }
  return days;
}

export interface MonthPoint {
  month: MonthKey;
  /** Nombre corto: "jun" */
  label: string;
  income: number;
  expenses: number;
}

/** Ingresos y gastos de los últimos `count` meses, terminando en `endMonth`. */
export function monthlySeries(movements: Movement[], endMonth: MonthKey, count = 6): MonthPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const month = addMonths(endMonth, i - count + 1);
    const t = monthTotals(movements, month);
    return { month, label: monthName(month).slice(0, 3), income: t.income, expenses: t.expenses };
  });
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
 * Compara el gasto del mes elegido con el anterior. Si el mes elegido es el actual,
 * se compara contra el mes anterior "a esta altura" (hasta el mismo día),
 * para que la comparación sea justa.
 */
export function compareWithPreviousMonth(
  movements: Movement[],
  key: MonthKey,
  today: string,
): MonthComparison {
  const prevKey = addMonths(key, -1);
  const partial = monthKeyOf(today) === key;
  const cutoffDay = partial ? Number(today.slice(8, 10)) : 31;

  // En el mes en curso solo cuenta lo que ya pasó (no las cuotas con fecha futura).
  const current = sumAmounts(expensesInMonth(movements, key).filter((m) => !partial || m.date <= today));
  const previous = sumAmounts(
    expensesInMonth(movements, prevKey).filter((m) => Number(m.date.slice(8, 10)) <= cutoffDay),
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

export type ListFilterValue = CategoryId | 'todas' | 'ingresos' | 'gastos';

export interface ExpenseFilter {
  category: ListFilterValue;
  query: string;
}

function matchesCategory(m: Movement, f: ListFilterValue): boolean {
  if (f === 'todas') return true;
  if (f === 'ingresos') return m.type === 'income';
  if (f === 'gastos') return m.type === 'expense';
  return m.type === 'expense' && m.category === f;
}

/** Busca en la descripción y en el nombre de la categoría. */
export function filterExpenses(movements: Movement[], filter: ExpenseFilter): Movement[] {
  const q = normalize(filter.query);
  return movements.filter(
    (m) =>
      matchesCategory(m, filter.category) &&
      (!q || normalize(m.description).includes(q) || normalize(categoryInfo(m.category as AnyCategoryId).label).includes(q)),
  );
}

/** Más recientes primero; dentro del mismo día, el último cargado primero. */
export function sortByDateDesc<T extends Movement>(movements: T[]): T[] {
  return [...movements].sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
  );
}

export interface DayGroup {
  date: string;
  /** Neto del día: ingresos − gastos. */
  net: number;
  /** Solo gastos del día. */
  total: number;
  items: Movement[];
}

/** Agrupa una lista (ya ordenada) por fecha, manteniendo el orden. */
export function groupByDate(sorted: Movement[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const m of sorted) {
    let last = groups[groups.length - 1];
    if (!last || last.date !== m.date) {
      last = { date: m.date, net: 0, total: 0, items: [] };
      groups.push(last);
    }
    last.items.push(m);
    if (m.type === 'expense') {
      last.total += m.amount;
      last.net -= m.amount;
    } else {
      last.net += m.amount;
    }
  }
  return groups;
}
