import { addMonths, dateInMonth, monthKeyOf } from './dates';
import { buildInstallments } from './installments';
import { materializeRecurring } from './recurring';
import type { CategoryId, Movement, MonthKey, PaymentMethod, RecurringRule } from './types';

/** [día del mes, categoría, descripción, medio de pago, monto base] */
type Template = [number, CategoryId, string, PaymentMethod, number];

// Gastos variables de un mes típico, con precios de fines de 2026.
const MONTHLY: Template[] = [
  [2, 'super', 'Coto — compra semanal', 'credito', 82000],
  [3, 'comida', 'Café con medialunas', 'debito', 7200],
  [4, 'transporte', 'Carga SUBE', 'transferencia', 20000],
  [6, 'servicios', 'Luz — Edenor', 'debito', 36000],
  [7, 'salud', 'Farmacia', 'efectivo', 19500],
  [8, 'super', 'Verdulería', 'efectivo', 13000],
  [9, 'comida', 'Almuerzo con amigos', 'efectivo', 23000],
  [12, 'transporte', 'Nafta', 'credito', 58000],
  [13, 'super', 'Carrefour', 'credito', 61000],
  [15, 'comida', 'Sushi delivery', 'credito', 33000],
  [17, 'servicios', 'Gas — Metrogas', 'debito', 23500],
  [19, 'super', 'Coto — compra semanal', 'credito', 76000],
  [21, 'otros', 'Peluquería', 'efectivo', 17500],
  [23, 'comida', 'Parrilla de domingo', 'credito', 45000],
  [25, 'transporte', 'Carga SUBE', 'transferencia', 20000],
  [27, 'super', 'Día — reposición', 'debito', 27000],
  [29, 'ocio', 'Cine — 2 entradas', 'debito', 18000],
];

/** Gastos puntuales: [meses hacia atrás (0 = actual), ...template] */
const ONE_OFF: [number, ...Template][] = [
  [4, 22, 'ropa', 'Campera', 'credito', 89000],
  [1, 18, 'ocio', 'Recital — entrada', 'credito', 55000],
  [1, 24, 'ocio', 'Bar con amigos', 'efectivo', 24000],
  [0, 3, 'salud', 'Consulta dentista', 'transferencia', 45000],
];

/** Precios que suben de a poco mes a mes (del más viejo al actual). */
const INFLATION = [0.84, 0.88, 0.91, 0.94, 0.97, 1];

export const DEFAULT_BUDGET = 1_000_000;

export interface SampleData {
  movements: Movement[];
  rules: RecurringRule[];
}

/**
 * 6 meses de historial hasta hoy: sueldo y gastos fijos mensuales, gastos variables,
 * dos ingresos freelance y dos compras en cuotas. Todo determinístico.
 */
export function generateSample(today: string): SampleData {
  const current = monthKeyOf(today);
  const first: MonthKey = addMonths(current, -5);
  const rule = (
    id: string,
    type: RecurringRule['type'],
    category: RecurringRule['category'],
    description: string,
    method: PaymentMethod,
    day: number,
    amount: number,
  ): RecurringRule => ({ id: `fijo-${id}`, type, category, description, method, day, amount, startMonth: first, skipped: [] });

  const rules: RecurringRule[] = [
    rule('sueldo', 'income', 'sueldo', 'Sueldo', 'transferencia', 1, 1_450_000),
    rule('netflix', 'expense', 'ocio', 'Netflix', 'credito', 2, 16500),
    rule('gimnasio', 'expense', 'salud', 'Gimnasio', 'debito', 5, 38000),
    rule('expensas', 'expense', 'servicios', 'Expensas', 'transferencia', 10, 95000),
    rule('internet', 'expense', 'servicios', 'Internet — Fibertel', 'debito', 11, 42000),
    rule('spotify', 'expense', 'ocio', 'Spotify', 'credito', 11, 6200),
    rule('celular', 'expense', 'servicios', 'Celular — plan mensual', 'debito', 16, 28000),
  ];

  const movements: Movement[] = [];
  let n = 0;
  const push = (m: Omit<Movement, 'id' | 'createdAt'>) => {
    if (m.date > today) return;
    n++;
    movements.push({ ...m, id: `ejemplo-${n}`, createdAt: n });
  };

  for (let i = 0; i < 6; i++) {
    const month = addMonths(first, i);
    MONTHLY.forEach(([day, category, description, method, base], t) => {
      if ((t + i) % 7 === 0) return; // algunos meses falta alguna compra
      const jitter = 0.9 + ((t * 7 + i * 13) % 10) / 50;
      const amount = Math.round((base * INFLATION[i] * jitter) / 100) * 100;
      push({ type: 'expense', amount, category, description, method, date: dateInMonth(month, day) });
    });
  }

  for (const [back, day, category, description, method, amount] of ONE_OFF) {
    push({ type: 'expense', amount, category, description, method, date: dateInMonth(addMonths(current, -back), day) });
  }

  push({ type: 'income', amount: 280000, category: 'freelance', description: 'Diseño de logo', method: 'transferencia', date: dateInMonth(addMonths(current, -4), 20) });
  push({ type: 'income', amount: 420000, category: 'freelance', description: 'Landing page', method: 'transferencia', date: dateInMonth(addMonths(current, -2), 14) });

  // Compras en cuotas: incluyen las cuotas futuras, así se ve lo comprometido.
  movements.push(
    ...buildInstallments(
      { type: 'expense', category: 'otros', description: 'Heladera', method: 'credito', createdAt: 0 },
      dateInMonth(addMonths(current, -3), 18),
      1_140_000,
      12,
      'ejemplo-heladera',
    ),
    ...buildInstallments(
      { type: 'expense', category: 'ropa', description: 'Zapatillas', method: 'credito', createdAt: 0 },
      dateInMonth(addMonths(current, -1), 16),
      129_000,
      3,
      'ejemplo-zapatillas',
    ),
  );

  movements.push(...materializeRecurring(rules, movements, today));
  return { movements, rules };
}
