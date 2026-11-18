import type { ISODate, MonthKey } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): ISODate {
  return toISODate(new Date())
}

export function monthOf(date: ISODate): MonthKey {
  return date.slice(0, 7)
}

export function parseMonth(month: MonthKey): { year: number; month: number } {
  const [y, m] = month.split('-').map(Number)
  return { year: y, month: m }
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const { year, month: m } = parseMonth(month)
  const total = year * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`
}

/** Diferencia en meses: b - a */
export function monthDiff(a: MonthKey, b: MonthKey): number {
  const pa = parseMonth(a)
  const pb = parseMonth(b)
  return (pb.year - pa.year) * 12 + (pb.month - pa.month)
}

export function daysInMonth(month: MonthKey): number {
  const { year, month: m } = parseMonth(month)
  return new Date(year, m, 0).getDate()
}

/** Fecha de un día dentro de un mes, ajustada al último día si no existe (31 de febrero → 28/29). */
export function dateInMonth(month: MonthKey, day: number): ISODate {
  return `${month}-${pad(Math.min(Math.max(day, 1), daysInMonth(month)))}`
}

export function dayOf(date: ISODate): number {
  return Number(date.slice(8, 10))
}

export function addDays(date: ISODate, n: number): ISODate {
  const [y, m, d] = date.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + n))
}

/** Rango de meses [from, to], ambos incluidos. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m)
  return out
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function monthName(month: MonthKey): string {
  return MONTHS[parseMonth(month).month - 1]
}

export function monthLabel(month: MonthKey): string {
  const { year } = parseMonth(month)
  const name = monthName(month)
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`
}

export function monthShort(month: MonthKey): string {
  return MONTHS_SHORT[parseMonth(month).month - 1]
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export function dateLabel(date: ISODate, ref: ISODate = today()): string {
  if (date === ref) return 'Hoy'
  if (date === addDays(ref, -1)) return 'Ayer'
  if (date === addDays(ref, 1)) return 'Mañana'
  const [y, m, d] = date.split('-').map(Number)
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${wd} ${d} de ${MONTHS[m - 1]}`
}

/** Días entre dos fechas: b - a */
export function daysBetween(a: ISODate, b: ISODate): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}
