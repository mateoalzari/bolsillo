import { buildInstallments, committedInMonth, installmentLabel, purchaseRows, splitAmount } from './installments';
import type { Movement } from './types';

const base = { type: 'expense' as const, category: 'otros' as const, description: 'Heladera', method: 'credito' as const, createdAt: 1 };

describe('cuotas', () => {
  it('reparte el total en cuotas enteras que suman exacto', () => {
    expect(splitAmount(100000, 3)).toEqual([33334, 33333, 33333]);
    expect(splitAmount(120000, 6)).toEqual(Array(6).fill(20000));
    expect(splitAmount(5000, 1)).toEqual([5000]);
    const parts = splitAmount(1_140_001, 24);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1_140_001);
  });

  it('genera una fila por mes con su número de cuota', () => {
    const rows = buildInstallments(base, '2026-11-18', 600000, 6, 'p1');
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.date)).toEqual([
      '2026-11-18', '2026-12-18', '2027-01-18', '2027-02-18', '2027-03-18', '2027-04-18',
    ]);
    expect(rows[1].installment).toEqual({ purchaseId: 'p1', number: 2, count: 6, totalAmount: 600000 });
    expect(installmentLabel(rows[1].installment!)).toBe('Cuota 2/6');
    expect(new Set(rows.map((r) => r.id)).size).toBe(6);
  });

  it('si la compra es un 31, en los meses cortos cae el último día', () => {
    const rows = buildInstallments(base, '2027-01-31', 30000, 3, 'p2');
    expect(rows.map((r) => r.date)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
  });

  it('calcula lo comprometido en un mes, contando compras distintas', () => {
    const all: Movement[] = [
      ...buildInstallments(base, '2026-10-18', 1_200_000, 12, 'heladera'),
      ...buildInstallments({ ...base, description: 'Zapatillas' }, '2026-10-16', 129000, 3, 'zapas'),
    ];
    expect(committedInMonth(all, '2026-12')).toEqual({ total: 100000 + 43000, purchases: 2 });
    expect(committedInMonth(all, '2027-01')).toEqual({ total: 100000, purchases: 1 });
    expect(committedInMonth(all, '2028-01').total).toBe(0);
    expect(purchaseRows(all, 'zapas').map((r) => r.installment!.number)).toEqual([1, 2, 3]);
  });
});
