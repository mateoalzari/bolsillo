import { todayISO } from './dates';
import { DEFAULT_BUDGET, generateSampleExpenses } from './seed';
import { CATEGORY_IDS, PAYMENT_METHODS, type Expense } from './types';

export interface AppData {
  expenses: Expense[];
  budget: number;
  /** true mientras los datos visibles sean los de ejemplo. */
  isSample: boolean;
}

const KEY = 'bolsillo:data:v1';

function isExpense(x: unknown): x is Expense {
  const e = x as Expense;
  return (
    !!e &&
    typeof e.id === 'string' &&
    typeof e.amount === 'number' &&
    e.amount > 0 &&
    (CATEGORY_IDS as readonly string[]).includes(e.category) &&
    (PAYMENT_METHODS as readonly string[]).includes(e.method) &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.description === 'string'
  );
}

/** Interpreta lo guardado; null si no hay nada o está corrupto. */
export function parseStored(raw: string | null): AppData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.expenses) || typeof data.budget !== 'number') return null;
    return {
      expenses: data.expenses.filter(isExpense).map((e: Expense) => ({ ...e, createdAt: e.createdAt ?? 0 })),
      budget: data.budget,
      isSample: Boolean(data.isSample),
    };
  } catch {
    return null;
  }
}

export function sampleData(today = todayISO()): AppData {
  return { expenses: generateSampleExpenses(today), budget: DEFAULT_BUDGET, isSample: true };
}

/** La primera vez (nada guardado) carga los datos de ejemplo. */
export function loadData(): AppData {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* almacenamiento bloqueado: seguimos en memoria */
  }
  return parseStored(raw) ?? sampleData();
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* sin almacenamiento disponible */
  }
}
