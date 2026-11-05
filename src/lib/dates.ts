import type { MonthKey } from './types';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local → "YYYY-MM-DD" (sin pasar por UTC). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** "YYYY-MM-DD" → Date local al mediodía (evita saltos por huso horario). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function monthKeyOf(iso: string): MonthKey {
  return iso.slice(0, 7);
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(key: MonthKey): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** "2026-11" → "noviembre" */
export function monthName(key: MonthKey): string {
  return MONTHS[Number(key.slice(5, 7)) - 1];
}

/** "2026-11" → "Noviembre 2026" */
export function monthLabel(key: MonthKey): string {
  const name = monthName(key);
  return `${name[0].toUpperCase()}${name.slice(1)} ${key.slice(0, 4)}`;
}

/** Encabezado de día para la lista: "Hoy", "Ayer" o "Lunes 3". */
export function dayLabel(iso: string, today: string): string {
  if (iso === today) return 'Hoy';
  const yesterday = toISODate(new Date(parseISODate(today).getTime() - 86_400_000));
  if (iso === yesterday) return 'Ayer';
  const d = parseISODate(iso);
  const w = WEEKDAYS[d.getDay()];
  return `${w[0].toUpperCase()}${w.slice(1)} ${d.getDate()}`;
}

/** Fecha corta: "3 nov" */
export function shortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}
