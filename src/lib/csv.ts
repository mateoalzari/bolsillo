import { CATEGORIES } from './categories';
import { PAYMENT_LABELS, type Expense } from './types';

const escape = (value: string) => (/[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/**
 * CSV separado por ";" (lo que espera Excel con configuración regional argentina),
 * con fecha DD/MM/AAAA y monto sin separador de miles.
 */
export function expensesToCSV(expenses: Expense[]): string {
  const header = ['Fecha', 'Categoría', 'Descripción', 'Medio de pago', 'Monto'];
  const rows = expenses.map((e) => {
    const [y, m, d] = e.date.split('-');
    return [
      `${d}/${m}/${y}`,
      CATEGORIES[e.category].label,
      e.description,
      PAYMENT_LABELS[e.method],
      String(e.amount),
    ].map(escape);
  });
  return [header, ...rows].map((r) => r.join(';')).join('\r\n');
}
