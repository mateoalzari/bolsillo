import { categoryInfo } from './categories';
import { installmentLabel } from './installments';
import { PAYMENT_LABELS, type Movement } from './types';

const escape = (value: string) => (/[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/**
 * CSV separado por ";" (lo que espera Excel con configuración regional argentina),
 * con fecha DD/MM/AAAA y monto sin separador de miles.
 */
export function movementsToCSV(movements: Movement[]): string {
  const header = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Medio de pago', 'Detalle', 'Monto'];
  const rows = movements.map((m) => {
    const [y, mo, d] = m.date.split('-');
    const detail = m.installment ? installmentLabel(m.installment) : m.recurringId ? 'Fijo mensual' : '';
    return [
      `${d}/${mo}/${y}`,
      m.type === 'income' ? 'Ingreso' : 'Gasto',
      categoryInfo(m.category).label,
      m.description,
      PAYMENT_LABELS[m.method],
      detail,
      String(m.amount),
    ].map(escape);
  });
  return [header, ...rows].map((r) => r.join(';')).join('\r\n');
}
