import { movementsToCSV } from './csv';
import { committedInMonth } from './installments';
import { generateSample } from './seed';
import { migrateV1, parseStored, sampleData } from './storage';
import { monthTotals } from './stats';
import type { Movement } from './types';

describe('datos de ejemplo', () => {
  const today = '2026-11-05';
  const { movements, rules } = generateSample(today);
  const past = movements.filter((m) => m.date <= today);

  it('cubren 6 meses, con sueldo todos los meses', () => {
    const months = new Set(past.map((m) => m.date.slice(0, 7)));
    expect([...months].sort()).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    for (const month of months) {
      expect(past.some((m) => m.category === 'sueldo' && m.date.startsWith(month))).toBe(true);
    }
  });

  it('tienen gastos fijos generados y 2 compras en cuotas con cuotas futuras', () => {
    expect(rules.filter((r) => r.type === 'expense').length).toBeGreaterThanOrEqual(3);
    expect(past.filter((m) => m.recurringId === 'fijo-expensas')).toHaveLength(5); // jun–oct (vence el 10)
    expect(new Set(movements.filter((m) => m.installment).map((m) => m.installment!.purchaseId)).size).toBe(2);
    expect(committedInMonth(movements, '2026-12').purchases).toBe(2);
  });

  it('el único futuro son las cuotas; ids únicos', () => {
    expect(movements.filter((m) => m.date > today).every((m) => m.installment)).toBe(true);
    expect(new Set(movements.map((m) => m.id)).size).toBe(movements.length);
  });

  it('dejan un balance positivo y el mes anterior cerca del presupuesto', () => {
    const oct = monthTotals(movements, '2026-10');
    expect(oct.balance).toBeGreaterThan(0);
    expect(oct.expenses / sampleData(today).budget).toBeGreaterThan(0.8);
    expect(oct.expenses / sampleData(today).budget).toBeLessThan(1);
  });

  it('ajusta días inexistentes al último día del mes', () => {
    const feb = generateSample('2027-03-02').movements.filter((m) => m.date.startsWith('2027-02'));
    expect(feb.every((m) => Number(m.date.slice(8)) <= 28)).toBe(true);
  });
});

describe('almacenamiento', () => {
  it('lee lo guardado y descarta registros inválidos', () => {
    const good = sampleData('2026-11-05').movements[0];
    const raw = JSON.stringify({ movements: [good, { id: 'x', amount: -3 }], rules: [{ id: 1 }], budget: 500000, isSample: false });
    const parsed = parseStored(raw)!;
    expect(parsed.movements).toHaveLength(1);
    expect(parsed.rules).toHaveLength(0);
    expect(parsed.budget).toBe(500000);
  });
  it('devuelve null si no hay nada o está roto', () => {
    expect(parseStored(null)).toBeNull();
    expect(parseStored('{no es json')).toBeNull();
    expect(parseStored('{"movements": 3}')).toBeNull();
  });
  it('migra los gastos de la versión 1 y descarta sus datos de ejemplo', () => {
    const v1 = { id: '1', amount: 5000, category: 'comida', date: '2026-11-01', description: 'Café', method: 'debito', createdAt: 3 };
    const migrated = migrateV1(JSON.stringify({ expenses: [v1], budget: 700000, isSample: false }))!;
    expect(migrated.movements[0]).toMatchObject({ type: 'expense', amount: 5000 });
    expect(migrated.budget).toBe(700000);
    expect(migrateV1(JSON.stringify({ expenses: [v1], budget: 1, isSample: true }))).toBeNull();
  });
});

describe('CSV', () => {
  it('usa ; como separador, fecha argentina, tipo, detalle de cuota y escapa comillas', () => {
    const e: Movement = {
      id: '1', type: 'expense', amount: 12500, category: 'comida', date: '2026-11-03',
      description: 'Pizza "grande"; con amigos', method: 'credito', createdAt: 0,
      installment: { purchaseId: 'p', number: 2, count: 3, totalAmount: 37500 },
    };
    const i: Movement = { ...e, id: '2', type: 'income', category: 'sueldo', description: 'Sueldo', method: 'transferencia', installment: undefined, recurringId: 'r' };
    const csv = movementsToCSV([e, i]).split('\r\n');
    expect(csv[0]).toBe('Fecha;Tipo;Categoría;Descripción;Medio de pago;Detalle;Monto');
    expect(csv[1]).toBe('03/11/2026;Gasto;Comida;"Pizza ""grande""; con amigos";Crédito;Cuota 2/3;12500');
    expect(csv[2]).toBe('03/11/2026;Ingreso;Sueldo;Sueldo;Transferencia;Fijo mensual;12500');
  });
});
