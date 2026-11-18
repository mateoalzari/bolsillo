import type { SupabaseClient } from '@supabase/supabase-js'
import { isCurrency } from './currency'
import type { AppData, CreditCard, Movement, RecurringRule } from './types'

/* ---------------- Filas de la base ⇄ objetos de la app ---------------- */

export interface MovementRow {
  user_id: string
  id: string
  kind: Movement['kind']
  amount: number
  category: string
  date: string
  description: string
  method: Movement['method']
  installments: number | null
  recurring_id: string | null
  card_id: string | null
  payment_start: string | null
}

export interface RuleRow {
  user_id: string
  id: string
  kind: RecurringRule['kind']
  amount: number
  category: string
  description: string
  method: RecurringRule['method']
  day_of_month: number
  start_month: string
  end_month: string | null
  skipped_months: string[]
}

export interface CardRow {
  user_id: string
  id: string
  name: string
  closing_day: number
  due_day: number
}

export function movementToRow(m: Movement, userId: string): MovementRow {
  return {
    user_id: userId,
    id: m.id,
    kind: m.kind,
    amount: m.amount,
    category: m.category,
    date: m.date,
    description: m.description,
    method: m.method,
    installments: m.installments && m.installments > 1 ? m.installments : null,
    recurring_id: m.recurringId ?? null,
    card_id: m.cardId ?? null,
    payment_start: m.paymentStart ?? null,
  }
}

export function rowToMovement(r: MovementRow): Movement {
  return {
    id: r.id,
    kind: r.kind,
    amount: Number(r.amount),
    category: r.category,
    date: r.date,
    description: r.description,
    method: r.method,
    ...(r.installments && r.installments > 1 ? { installments: r.installments } : {}),
    ...(r.recurring_id ? { recurringId: r.recurring_id } : {}),
    ...(r.card_id ? { cardId: r.card_id } : {}),
    ...(r.payment_start ? { paymentStart: r.payment_start } : {}),
  }
}

export function ruleToRow(r: RecurringRule, userId: string): RuleRow {
  return {
    user_id: userId,
    id: r.id,
    kind: r.kind,
    amount: r.amount,
    category: r.category,
    description: r.description,
    method: r.method,
    day_of_month: r.dayOfMonth,
    start_month: r.startMonth,
    end_month: r.endMonth ?? null,
    skipped_months: r.skippedMonths ?? [],
  }
}

export function rowToRule(r: RuleRow): RecurringRule {
  return {
    id: r.id,
    kind: r.kind,
    amount: Number(r.amount),
    category: r.category,
    description: r.description,
    method: r.method,
    dayOfMonth: r.day_of_month,
    startMonth: r.start_month,
    ...(r.end_month ? { endMonth: r.end_month } : {}),
    ...(r.skipped_months?.length ? { skippedMonths: r.skipped_months } : {}),
  }
}

export function cardToRow(c: CreditCard, userId: string): CardRow {
  return { user_id: userId, id: c.id, name: c.name, closing_day: c.closingDay, due_day: c.dueDay }
}

export function rowToCard(r: CardRow): CreditCard {
  return { id: r.id, name: r.name, closingDay: r.closing_day, dueDay: r.due_day }
}

/* ---------------- Diferencias entre dos estados ---------------- */

export interface Diff<T> {
  upserts: T[]
  deletes: string[]
}

/**
 * Qué cambió entre dos listas. El reducer de la app nunca muta objetos: si un elemento no cambió,
 * es el mismo objeto; así comparar por referencia alcanza y es barato.
 */
export function diffById<T extends { id: string }>(prev: T[], next: T[]): Diff<T> {
  const before = new Map(prev.map((x) => [x.id, x]))
  const after = new Set(next.map((x) => x.id))
  return {
    upserts: next.filter((x) => before.get(x.id) !== x),
    deletes: prev.filter((x) => !after.has(x.id)).map((x) => x.id),
  }
}

export interface DataDiff {
  movements: Diff<Movement>
  recurring: Diff<RecurringRule>
  cards: Diff<CreditCard>
  profile: { budget: number; currency: AppData['currency'] } | null
}

export function diffData(prev: AppData, next: AppData): DataDiff {
  return {
    movements: diffById(prev.movements, next.movements),
    recurring: diffById(prev.recurring, next.recurring),
    cards: diffById(prev.cards, next.cards),
    profile: prev.budget !== next.budget || prev.currency !== next.currency ? { budget: next.budget, currency: next.currency } : null,
  }
}

export function isEmptyDiff(d: DataDiff): boolean {
  return !d.profile && [d.movements, d.recurring, d.cards].every((x) => !x.upserts.length && !x.deletes.length)
}

/* ---------------- Lectura y escritura ---------------- */

const CHUNK = 500

function chunks<T>(arr: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK))
  return out
}

async function check<T>(p: PromiseLike<{ error: { message: string } | null; data?: T }>): Promise<T | undefined> {
  const { error, data } = await p
  if (error) throw new Error(error.message)
  return data
}

export async function loadCloudData(db: SupabaseClient, userId: string): Promise<AppData> {
  const [profile, cards, rules, movements] = await Promise.all([
    db.from('profiles').select('budget, currency').eq('id', userId).maybeSingle(),
    db.from('cards').select('*'),
    db.from('recurring_rules').select('*'),
    db.from('movements').select('*').order('date', { ascending: true }).limit(20000),
  ])
  for (const r of [profile, cards, rules, movements]) if (r.error) throw new Error(r.error.message)
  return {
    version: 1,
    movements: ((movements.data ?? []) as MovementRow[]).map(rowToMovement),
    recurring: ((rules.data ?? []) as RuleRow[]).map(rowToRule),
    cards: ((cards.data ?? []) as CardRow[]).map(rowToCard),
    budget: Number(profile.data?.budget ?? 0),
    currency: isCurrency(profile.data?.currency) ? profile.data.currency : 'ARS',
  }
}

/** Aplica las diferencias en la base. Primero altas/cambios, después bajas. */
export async function applyDiff(db: SupabaseClient, userId: string, d: DataDiff): Promise<void> {
  const jobs: PromiseLike<unknown>[] = []
  if (d.profile) jobs.push(check(db.from('profiles').upsert({ id: userId, budget: d.profile.budget, currency: d.profile.currency })))
  for (const part of chunks(d.cards.upserts)) jobs.push(check(db.from('cards').upsert(part.map((c) => cardToRow(c, userId)), { onConflict: 'user_id,id' })))
  for (const part of chunks(d.recurring.upserts)) jobs.push(check(db.from('recurring_rules').upsert(part.map((r) => ruleToRow(r, userId)), { onConflict: 'user_id,id' })))
  for (const part of chunks(d.movements.upserts)) jobs.push(check(db.from('movements').upsert(part.map((m) => movementToRow(m, userId)), { onConflict: 'user_id,id' })))
  await Promise.all(jobs)

  const deletes: PromiseLike<unknown>[] = []
  for (const part of chunks(d.movements.deletes)) deletes.push(check(db.from('movements').delete().in('id', part)))
  for (const part of chunks(d.recurring.deletes)) deletes.push(check(db.from('recurring_rules').delete().in('id', part)))
  for (const part of chunks(d.cards.deletes)) deletes.push(check(db.from('cards').delete().in('id', part)))
  await Promise.all(deletes)
}
