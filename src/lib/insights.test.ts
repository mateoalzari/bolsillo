import { buildInstallments } from './installments';
import { buildInsights, categoryGrowthInsight, fixedShareInsight, peakDayInsight } from './insights';
import type { AnyCategoryId, Movement, RecurringRule } from './types';

let n = 0;
const m = (date: string, amount: number, category: AnyCategoryId, description = '', extra: Partial<Movement> = {}): Movement => ({
  id: String(++n), type: 'expense', date, amount, category, description, method: 'debito', createdAt: n, ...extra,
});

// Ocio: 30.000 por mes en ago-sep-oct; en noviembre 75.000.
const history = [
  m('2026-08-10', 30000, 'ocio', 'Cine'), m('2026-08-12', 80000, 'super', 'Coto'),
  m('2026-09-10', 30000, 'ocio', 'Cine'), m('2026-09-12', 80000, 'super', 'Coto'),
  m('2026-10-10', 30000, 'ocio', 'Cine'), m('2026-10-12', 80000, 'super', 'Coto'),
];

describe('lectura: categoría que más creció', () => {
  it('compara contra el promedio de los 3 meses anteriores', () => {
    const data = [...history, m('2026-11-03', 75000, 'ocio', 'Recital'), m('2026-11-04', 82000, 'super', 'Coto')];
    expect(categoryGrowthInsight(data, '2026-11', '2026-12-01')?.text).toBe(
      'En Ocio gastaste $ 75.000 en noviembre: 150% más que tu promedio de los 3 meses anteriores ($ 30.000).',
    );
  });

  it('en el mes en curso habla de lo que "ya llevás" y solo cuenta hasta hoy', () => {
    const data = [...history, m('2026-11-03', 75000, 'ocio', 'Recital'), m('2026-11-20', 500000, 'super', 'Futuro')];
    expect(categoryGrowthInsight(data, '2026-11', '2026-11-05')?.text).toBe(
      'En Ocio ya llevás $ 75.000 este mes: 150% más que tu promedio de los 3 meses anteriores ($ 30.000).',
    );
  });

  it('ignora subas chicas (menos de 15% o de $ 10.000) y las cuotas', () => {
    const small = [...history, m('2026-11-03', 33000, 'ocio'), m('2026-11-04', 85000, 'super')];
    expect(categoryGrowthInsight(small, '2026-11', '2026-11-05')).toBeNull();
    expect(categoryGrowthInsight(small, '2026-11', '2026-12-01')?.id).toBe('steady');
    const cuotas = buildInstallments(
      { type: 'expense', category: 'ropa', description: 'Campera', method: 'credito', createdAt: 0 },
      '2026-11-02', 300000, 3, 'c',
    );
    expect(categoryGrowthInsight([...history, ...cuotas], '2026-11', '2026-11-05')).toBeNull();
  });

  it('necesita al menos 2 meses de historia', () => {
    expect(categoryGrowthInsight([m('2026-10-01', 1000, 'ocio'), m('2026-11-01', 90000, 'ocio')], '2026-11', '2026-11-30')).toBeNull();
  });
});

describe('lectura: día de más gasto', () => {
  it('suma por día sin contar fijos ni cuotas, y nombra la compra principal', () => {
    const data = [
      m('2026-11-02', 82000, 'super', 'Coto'),
      m('2026-11-02', 4000, 'comida', 'Café'),
      m('2026-11-10', 95000, 'servicios', 'Expensas', { recurringId: 'r' }),
      m('2026-11-04', 30000, 'comida', 'Pizza'),
      m('2026-11-04', 25000, 'ocio', 'Cine'),
    ];
    expect(peakDayInsight(data, '2026-11', '2026-11-30')?.text).toBe(
      'Sin contar fijos ni cuotas, tu día de más gasto fue el lunes 2: $ 86.000, casi todo en Coto.',
    );
    const spread = [...data, m('2026-11-04', 40000, 'super', 'Día')];
    expect(peakDayInsight(spread, '2026-11', '2026-11-30')?.text).toBe(
      'Sin contar fijos ni cuotas, tu día de más gasto fue el miércoles 4: $ 95.000, en 3 compras, la mayor en Día.',
    );
  });
  it('sin gastos variables no dice nada', () => {
    expect(peakDayInsight([], '2026-11', '2026-11-30')).toBeNull();
  });
});

describe('lectura: peso de los gastos fijos', () => {
  const rules: RecurringRule[] = [
    { id: 'a', type: 'expense', amount: 95000, category: 'servicios', description: 'Expensas', method: 'transferencia', day: 10, startMonth: '2026-01', skipped: [] },
    { id: 'b', type: 'expense', amount: 5000, category: 'ocio', description: 'Spotify', method: 'credito', day: 11, startMonth: '2026-01', skipped: [] },
  ];
  it('contra los ingresos del mes', () => {
    const data = [m('2026-11-01', 1_000_000, 'sueldo', 'Sueldo', { type: 'income' })];
    expect(fixedShareInsight(data, rules, '2026-11')?.text).toBe(
      'Tus gastos fijos (2) suman $ 100.000 por mes: el 10% de lo que ingresó en noviembre.',
    );
  });
  it('sin ingresos, contra lo gastado; sin fijos, nada', () => {
    expect(fixedShareInsight([m('2026-11-02', 400000, 'super')], rules, '2026-11')?.text).toBe(
      'Tus gastos fijos (2) suman $ 100.000 por mes: el 25% de lo que gastaste en noviembre.',
    );
    expect(fixedShareInsight([], [], '2026-11')).toBeNull();
  });
  it('buildInsights junta solo las que tienen datos y usa el formato pedido', () => {
    const out = buildInsights([m('2026-11-02', 400000, 'super', 'Coto')], rules, '2026-11', '2026-11-30', (x) => `US$ ${x / 1000}`);
    expect(out.map((i) => i.id)).toEqual(['peak-day', 'fixed']);
    expect(out[1].text).toContain('US$ 100');
  });
});
