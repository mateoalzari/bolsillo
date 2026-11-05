import { fixedMonthlyTotal, materializeRecurring, ruleActiveIn, upcomingDue } from './recurring';
import { buildInstallments } from './installments';
import type { RecurringRule } from './types';

const rule = (over: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'r1',
  type: 'expense',
  amount: 42000,
  category: 'servicios',
  description: 'Internet',
  method: 'debito',
  day: 11,
  startMonth: '2026-09',
  skipped: [],
  ...over,
});

describe('gastos fijos', () => {
  it('genera uno por mes desde que empezó, solo si ya venció', () => {
    const rows = materializeRecurring([rule()], [], '2026-11-05');
    expect(rows.map((r) => r.date)).toEqual(['2026-09-11', '2026-10-11']);
    expect(rows[0]).toMatchObject({ amount: 42000, recurringId: 'r1', type: 'expense' });
    expect(materializeRecurring([rule()], [], '2026-11-11').map((r) => r.date)).toContain('2026-11-11');
  });

  it('no duplica los que ya existen (aunque se hayan editado)', () => {
    const first = materializeRecurring([rule()], [], '2026-11-05');
    const edited = first.map((r) => (r.date === '2026-10-11' ? { ...r, amount: 45000, date: '2026-10-12' } : r));
    expect(materializeRecurring([rule()], edited, '2026-11-05')).toEqual([]);
  });

  it('respeta los meses borrados a mano y el mes de fin', () => {
    expect(materializeRecurring([rule({ skipped: ['2026-10'] })], [], '2026-11-30').map((r) => r.date)).toEqual([
      '2026-09-11',
      '2026-11-11',
    ]);
    expect(materializeRecurring([rule({ endMonth: '2026-09' })], [], '2026-11-30')).toHaveLength(1);
    expect(ruleActiveIn(rule({ endMonth: '2026-10' }), '2026-11')).toBe(false);
  });

  it('usa el último día en meses cortos', () => {
    const rows = materializeRecurring([rule({ day: 31, startMonth: '2027-02' })], [], '2027-03-31');
    expect(rows.map((r) => r.date)).toEqual(['2027-02-28', '2027-03-31']);
  });

  it('suma los fijos de gasto activos en el mes (no los ingresos)', () => {
    const rules = [rule(), rule({ id: 'r2', amount: 16500 }), rule({ id: 'r3', type: 'income', amount: 1e6, category: 'sueldo' })];
    expect(fixedMonthlyTotal(rules, '2026-11')).toBe(58500);
    expect(fixedMonthlyTotal(rules, '2026-08')).toBe(0);
  });
});

describe('próximos vencimientos', () => {
  it('lista fijos y cuotas de los próximos 30 días, ordenados por fecha', () => {
    const rules = [rule(), rule({ id: 'r2', description: 'Netflix', day: 2, amount: 16500 })];
    const cuotas = buildInstallments(
      { type: 'expense', category: 'otros', description: 'Heladera', method: 'credito', createdAt: 0 },
      '2026-10-18', 1_200_000, 12, 'h',
    );
    const items = upcomingDue(rules, cuotas, '2026-11-05');
    expect(items.map((i) => `${i.date} ${i.description} ${i.detail ?? i.kind}`)).toEqual([
      '2026-11-11 Internet fijo',
      '2026-11-18 Heladera Cuota 2/12',
      '2026-12-02 Netflix fijo',
    ]);
  });

  it('no incluye ingresos fijos ni lo que ya venció', () => {
    const items = upcomingDue([rule({ type: 'income', category: 'sueldo' }), rule({ id: 'r2', day: 3 })], [], '2026-11-05');
    expect(items.map((i) => i.date)).toEqual(['2026-12-03']);
  });
});
