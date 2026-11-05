import { expensesToCSV } from './csv';
import { generateSampleExpenses } from './seed';
import { parseStored, sampleData } from './storage';
import type { Expense } from './types';

describe('datos de ejemplo', () => {
  const sample = generateSampleExpenses('2026-11-05');

  it('son unos 40 gastos de los últimos 2 meses, sin fechas futuras', () => {
    expect(sample.length).toBeGreaterThanOrEqual(38);
    expect(sample.length).toBeLessThanOrEqual(45);
    for (const e of sample) {
      expect(e.date <= '2026-11-05').toBe(true);
      expect(e.date >= '2026-09-05').toBe(true);
    }
  });

  it('el mes actual y el anterior tienen gastos', () => {
    expect(sample.some((e) => e.date.startsWith('2026-11'))).toBe(true);
    expect(sample.filter((e) => e.date.startsWith('2026-10')).length).toBeGreaterThan(15);
  });

  it('tienen ids únicos', () => {
    expect(new Set(sample.map((e) => e.id)).size).toBe(sample.length);
  });
});

describe('almacenamiento', () => {
  it('lee lo guardado y descarta registros inválidos', () => {
    const good = sampleData('2026-11-05').expenses[0];
    const raw = JSON.stringify({ expenses: [good, { id: 'x', amount: -3 }], budget: 500000, isSample: false });
    const parsed = parseStored(raw)!;
    expect(parsed.expenses).toHaveLength(1);
    expect(parsed.budget).toBe(500000);
    expect(parsed.isSample).toBe(false);
  });
  it('devuelve null si no hay nada o está roto', () => {
    expect(parseStored(null)).toBeNull();
    expect(parseStored('{no es json')).toBeNull();
    expect(parseStored('{"expenses": 3}')).toBeNull();
  });
});

describe('CSV', () => {
  it('usa ; como separador, fecha argentina y escapa comillas', () => {
    const e: Expense = {
      id: '1', amount: 12500, category: 'comida', date: '2026-11-03',
      description: 'Pizza "grande"; con amigos', method: 'credito', createdAt: 0,
    };
    const csv = expensesToCSV([e]).split('\r\n');
    expect(csv[0]).toBe('Fecha;Categoría;Descripción;Medio de pago;Monto');
    expect(csv[1]).toBe('03/11/2026;Comida;"Pizza ""grande""; con amigos";Crédito;12500');
  });
});
