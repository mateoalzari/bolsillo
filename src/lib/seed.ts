import { addMonths, daysInMonth, monthKeyOf } from './dates';
import type { CategoryId, Expense, PaymentMethod } from './types';

/** [día del mes, categoría, descripción, medio de pago, monto] */
type Template = [number, CategoryId, string, PaymentMethod, number];

// Precios de referencia de fines de 2026, en pesos.
const PREVIOUS_MONTH: Template[] = [
  [1, 'servicios', 'Expensas', 'transferencia', 95000],
  [2, 'super', 'Coto — compra semanal', 'credito', 79850],
  [3, 'comida', 'Café con medialunas', 'debito', 7000],
  [3, 'transporte', 'Carga SUBE', 'transferencia', 20000],
  [4, 'ocio', 'Netflix', 'credito', 16500],
  [5, 'comida', 'Almuerzo con amigos', 'efectivo', 22000],
  [6, 'salud', 'Farmacia', 'debito', 17600],
  [7, 'servicios', 'Luz — Edenor', 'debito', 35400],
  [8, 'super', 'Verdulería', 'efectivo', 11800],
  [9, 'transporte', 'Nafta', 'credito', 58000],
  [10, 'super', 'Carrefour', 'credito', 62300],
  [11, 'ocio', 'Spotify', 'credito', 6200],
  [12, 'ocio', 'Cine — 2 entradas', 'debito', 18000],
  [13, 'servicios', 'Internet — Fibertel', 'debito', 42000],
  [14, 'comida', 'Café y tostado', 'debito', 9200],
  [15, 'super', 'Día — reposición', 'debito', 26100],
  [16, 'servicios', 'Celular — plan mensual', 'debito', 28000],
  [17, 'transporte', 'Uber al centro', 'credito', 9800],
  [18, 'comida', 'Parrilla de domingo', 'credito', 48000],
  [19, 'super', 'Coto — compra semanal', 'credito', 74200],
  [20, 'servicios', 'Gas — Metrogas', 'debito', 24300],
  [21, 'otros', 'Peluquería', 'efectivo', 18000],
  [22, 'comida', 'Helado', 'efectivo', 12500],
  [23, 'ropa', 'Remera básica', 'credito', 28000],
  [24, 'super', 'Carnicería', 'efectivo', 32500],
  [25, 'transporte', 'Carga SUBE', 'transferencia', 20000],
  [26, 'comida', 'Sushi delivery', 'credito', 34000],
  [27, 'super', 'Verdulería', 'efectivo', 14200],
  [28, 'otros', 'Regalo de cumpleaños', 'transferencia', 35000],
  [30, 'salud', 'Consulta dentista', 'transferencia', 45000],
];

// Solo se cargan los que caen hasta hoy.
const CURRENT_MONTH: Template[] = [
  [1, 'comida', 'Pizza con amigos', 'efectivo', 26000],
  [2, 'ocio', 'Netflix', 'credito', 16500],
  [3, 'servicios', 'Luz — Edenor', 'debito', 38200],
  [3, 'salud', 'Farmacia', 'efectivo', 21400],
  [4, 'super', 'Coto — compra semanal', 'credito', 86430],
  [5, 'comida', 'Café con medialunas', 'debito', 7500],
  [5, 'transporte', 'Carga SUBE', 'transferencia', 20000],
  [7, 'super', 'Verdulería', 'efectivo', 14200],
  [9, 'transporte', 'Uber al centro', 'credito', 9800],
  [10, 'servicios', 'Expensas', 'transferencia', 95000],
  [11, 'servicios', 'Internet — Fibertel', 'debito', 42000],
  [12, 'comida', 'Almuerzo en la oficina', 'debito', 15500],
  [14, 'super', 'Carnicería', 'efectivo', 32500],
  [16, 'ropa', 'Zapatillas', 'credito', 129000],
  [18, 'ocio', 'Recital — entrada', 'credito', 55000],
  [20, 'super', 'Día — reposición', 'debito', 28900],
  [22, 'servicios', 'Gas — Metrogas', 'debito', 24300],
  [24, 'comida', 'Café y tostado', 'debito', 9200],
  [26, 'transporte', 'Nafta', 'credito', 62000],
  [28, 'otros', 'Lavadero', 'efectivo', 9500],
];

/**
 * Datos de ejemplo de los últimos 2 meses: el mes anterior completo
 * y el mes actual hasta hoy (unos 40 gastos en total a principio de mes).
 */
export function generateSampleExpenses(today: string): Expense[] {
  const current = monthKeyOf(today);
  const previous = addMonths(current, -1);
  const todayDay = Number(today.slice(8, 10));
  const build = (key: string, templates: Template[], maxDay: number, offset: number): Expense[] =>
    templates
      .filter(([day]) => day <= maxDay)
      .map(([day, category, description, method, amount], i) => ({
        id: `ejemplo-${offset + i + 1}`,
        amount,
        category,
        date: `${key}-${String(Math.min(day, daysInMonth(key))).padStart(2, '0')}`,
        description,
        method,
        // Más viejo que cualquier gasto real: lo que cargues hoy aparece primero.
        createdAt: offset + i,
      }));
  return [
    ...build(previous, PREVIOUS_MONTH, 31, 0),
    ...build(current, CURRENT_MONTH, todayDay, 100),
  ];
}

/** El mes anterior de ejemplo queda cerca del 90% del presupuesto, para mostrar el aviso. */
export const DEFAULT_BUDGET = 1_000_000;
