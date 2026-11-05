import { todayISO } from './dates';
import { DEFAULT_BUDGET, generateSample } from './seed';
import {
  CATEGORY_IDS,
  INCOME_CATEGORY_IDS,
  PAYMENT_METHODS,
  type Movement,
  type RecurringRule,
} from './types';

export interface AppData {
  movements: Movement[];
  rules: RecurringRule[];
  budget: number;
  /** true mientras los datos visibles sean los de ejemplo. */
  isSample: boolean;
}

const KEY = 'bolsillo:data:v2';
const LEGACY_KEY = 'bolsillo:data:v1';

const ALL_CATEGORIES: readonly string[] = [...CATEGORY_IDS, ...INCOME_CATEGORY_IDS];

function validCore(x: Partial<Movement>): boolean {
  return (
    typeof x.amount === 'number' &&
    x.amount > 0 &&
    (x.type === 'expense' || x.type === 'income') &&
    ALL_CATEGORIES.includes(x.category as string) &&
    (PAYMENT_METHODS as readonly string[]).includes(x.method as string) &&
    typeof x.description === 'string'
  );
}

function isMovement(x: unknown): x is Movement {
  const m = x as Movement;
  return !!m && typeof m.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.date) && validCore(m);
}

function isRule(x: unknown): x is RecurringRule {
  const r = x as RecurringRule;
  return (
    !!r &&
    typeof r.id === 'string' &&
    typeof r.day === 'number' &&
    /^\d{4}-\d{2}$/.test(r.startMonth) &&
    Array.isArray(r.skipped) &&
    validCore(r as unknown as Partial<Movement>)
  );
}

/** Interpreta lo guardado (v2); null si no hay nada o está corrupto. */
export function parseStored(raw: string | null): AppData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.movements) || typeof data.budget !== 'number') return null;
    return {
      movements: data.movements.filter(isMovement),
      rules: Array.isArray(data.rules) ? data.rules.filter(isRule) : [],
      budget: data.budget,
      isSample: Boolean(data.isSample),
    };
  } catch {
    return null;
  }
}

/** Convierte lo guardado por la versión 1 (solo gastos). Si eran datos de ejemplo, se descartan. */
export function migrateV1(raw: string | null): AppData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.expenses) || typeof data.budget !== 'number' || data.isSample) return null;
    const movements = data.expenses
      .map((e: Movement) => ({ ...e, type: 'expense' as const, createdAt: e.createdAt ?? 0 }))
      .filter(isMovement);
    return { movements, rules: [], budget: data.budget, isSample: false };
  } catch {
    return null;
  }
}

export function sampleData(today = todayISO()): AppData {
  return { ...generateSample(today), budget: DEFAULT_BUDGET, isSample: true };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // almacenamiento bloqueado: seguimos en memoria
  }
}

/** La primera vez (nada guardado) carga los datos de ejemplo. */
export function loadData(): AppData {
  return parseStored(read(KEY)) ?? migrateV1(read(LEGACY_KEY)) ?? sampleData();
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* sin almacenamiento disponible */
  }
}
