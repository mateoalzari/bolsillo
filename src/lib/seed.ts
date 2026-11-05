import { parseISODate, toISODate } from './dates';
import type { CategoryId, Expense, PaymentMethod } from './types';

/** [días hacia atrás desde hoy, categoría, descripción, medio de pago, monto] */
type Template = [number, CategoryId, string, PaymentMethod, number];

// Precios de referencia de fines de 2026, en pesos.
const TEMPLATES: Template[] = [
  [0, 'comida', 'Café con medialunas', 'debito', 7500],
  [0, 'transporte', 'Carga SUBE', 'transferencia', 20000],
  [1, 'super', 'Coto — compra semanal', 'credito', 86430],
  [2, 'servicios', 'Luz — Edenor', 'debito', 38200],
  [2, 'salud', 'Farmacia', 'efectivo', 21400],
  [3, 'ocio', 'Netflix', 'credito', 16500],
  [4, 'comida', 'Pizza con amigos', 'efectivo', 26000],
  [5, 'super', 'Verdulería', 'efectivo', 14200],
  [6, 'transporte', 'Uber al centro', 'credito', 9800],
  [7, 'servicios', 'Internet — Fibertel', 'debito', 42000],
  [8, 'comida', 'Almuerzo en la oficina', 'debito', 15500],
  [9, 'super', 'Carnicería', 'efectivo', 32500],
  [10, 'ropa', 'Remera básica', 'credito', 28000],
  [11, 'ocio', 'Cine — 2 entradas', 'debito', 18000],
  [12, 'transporte', 'Nafta', 'credito', 62000],
  [13, 'super', 'Día — reposición', 'debito', 28900],
  [14, 'servicios', 'Gas — Metrogas', 'debito', 24300],
  [15, 'comida', 'Sushi delivery', 'credito', 34000],
  [16, 'otros', 'Peluquería', 'efectivo', 18000],
  [17, 'salud', 'Consulta dentista', 'transferencia', 45000],
  [18, 'super', 'Carrefour', 'credito', 62300],
  [19, 'comida', 'Café y tostado', 'debito', 9200],
  [20, 'servicios', 'Celular — plan mensual', 'debito', 28000],
  [21, 'ocio', 'Spotify', 'credito', 6200],
  [22, 'transporte', 'Carga SUBE', 'transferencia', 20000],
  [23, 'super', 'Coto — compra semanal', 'credito', 79850],
  [25, 'comida', 'Helado', 'efectivo', 12500],
  [26, 'ropa', 'Zapatillas', 'credito', 129000],
  [27, 'otros', 'Regalo de cumpleaños', 'transferencia', 35000],
  [29, 'super', 'Verdulería', 'efectivo', 11800],
  [30, 'servicios', 'Expensas', 'transferencia', 95000],
  [32, 'comida', 'Parrilla de domingo', 'credito', 48000],
  [34, 'transporte', 'Nafta', 'credito', 58000],
  [35, 'ocio', 'Recital — entrada', 'credito', 55000],
  [37, 'super', 'Coto — compra semanal', 'credito', 74200],
  [38, 'salud', 'Farmacia', 'debito', 17600],
  [40, 'comida', 'Almuerzo con amigos', 'efectivo', 22000],
  [42, 'servicios', 'Luz — Edenor', 'debito', 35400],
  [44, 'super', 'Día — reposición', 'debito', 26100],
  [47, 'transporte', 'Uber al aeropuerto', 'credito', 24500],
  [50, 'ocio', 'Netflix', 'credito', 16500],
  [53, 'comida', 'Café con medialunas', 'debito', 7000],
  [56, 'super', 'Carrefour', 'credito', 58900],
  [59, 'otros', 'Lavadero', 'efectivo', 9500],
];

/** Genera unos 40 gastos de ejemplo repartidos en los últimos 2 meses, hasta hoy. */
export function generateSampleExpenses(today: string): Expense[] {
  const base = parseISODate(today);
  return TEMPLATES.map(([daysAgo, category, description, method, amount], i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - daysAgo);
    return {
      id: `ejemplo-${i + 1}`,
      amount,
      category,
      date: toISODate(d),
      description,
      method,
      createdAt: d.getTime() + i,
    };
  });
}

export const DEFAULT_BUDGET = 750000;
