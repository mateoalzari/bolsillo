import {
  budgetStatus,
  compareWithPreviousMonth,
  comparisonText,
  expensesInMonth,
  filterExpenses,
  groupByDate,
  sortByDateDesc,
  sumAmounts,
  totalsByCategory,
  totalsByDay,
} from './stats';
import type { CategoryId, Expense } from './types';

let n = 0;
const exp = (date: string, amount: number, category: CategoryId = 'comida', description = ''): Expense => ({
  id: String(++n),
  date,
  amount,
  category,
  description,
  method: 'debito',
  createdAt: n,
});

const data = [
  exp('2026-10-02', 10000, 'super', 'Coto'),
  exp('2026-10-04', 5000, 'comida', 'Café'),
  exp('2026-10-20', 25000, 'servicios', 'Luz'),
  exp('2026-11-01', 3000, 'comida', 'Café con medialunas'),
  exp('2026-11-03', 9000, 'super', 'Verdulería'),
  exp('2026-11-03', 1000, 'comida', 'Chicle'),
  exp('2026-12-01', 7000, 'ocio', 'Cine'),
];

describe('totales', () => {
  it('filtra por mes y suma', () => {
    const nov = expensesInMonth(data, '2026-11');
    expect(nov).toHaveLength(3);
    expect(sumAmounts(nov)).toBe(13000);
    expect(sumAmounts([])).toBe(0);
  });

  it('agrupa por categoría de mayor a menor, con su proporción', () => {
    const r = totalsByCategory(expensesInMonth(data, '2026-11'));
    expect(r.map((c) => c.category)).toEqual(['super', 'comida']);
    expect(r[0].total).toBe(9000);
    expect(r[1].share).toBeCloseTo(4000 / 13000);
  });

  it('arma un valor por día del mes, con ceros', () => {
    const days = totalsByDay(data, '2026-11');
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ day: 1, total: 3000 });
    expect(days[1].total).toBe(0);
    expect(days[2].total).toBe(10000);
  });
});

describe('presupuesto', () => {
  it('avisa al 80% y al 100%', () => {
    expect(budgetStatus(79_000, 100_000).level).toBe('ok');
    expect(budgetStatus(80_000, 100_000).level).toBe('warning');
    expect(budgetStatus(100_000, 100_000).level).toBe('over');
    expect(budgetStatus(120_000, 100_000)).toEqual({ ratio: 1.2, remaining: -20_000, level: 'over' });
  });
  it('sin presupuesto no hay aviso', () => {
    expect(budgetStatus(5000, 0).level).toBe('ok');
  });
});

describe('comparación con el mes anterior', () => {
  it('compara meses completos cuando el mes ya terminó', () => {
    const c = compareWithPreviousMonth(data, '2026-11', '2027-01-10');
    expect(c).toMatchObject({ current: 13000, previous: 40000, percent: -68, partial: false });
    expect(comparisonText(c)).toBe('68% menos que octubre');
  });

  it('en el mes en curso compara hasta el mismo día del mes anterior', () => {
    const c = compareWithPreviousMonth(data, '2026-11', '2026-11-05');
    // Octubre hasta el día 5: 10.000 + 5.000
    expect(c.previous).toBe(15000);
    expect(c.percent).toBe(-13);
    expect(comparisonText(c)).toBe('13% menos que octubre a esta altura');
  });

  it('dice "más" cuando subió y avisa si no hay datos', () => {
    const c = compareWithPreviousMonth(data, '2026-12', '2027-02-01');
    expect(comparisonText(c)).toBe('46% menos que noviembre');
    const up = compareWithPreviousMonth([exp('2026-09-10', 100), exp('2026-10-10', 150)], '2026-10', '2026-12-01');
    expect(comparisonText(up)).toBe('50% más que septiembre');
    const none = compareWithPreviousMonth(data, '2026-10', '2026-12-01');
    expect(none.percent).toBeNull();
    expect(comparisonText(none)).toBe('Sin gastos en septiembre para comparar');
  });
});

describe('lista', () => {
  it('busca sin importar mayúsculas ni tildes', () => {
    expect(filterExpenses(data, { category: 'todas', query: 'CAFE' })).toHaveLength(2);
    expect(filterExpenses(data, { category: 'todas', query: 'verduleria' })).toHaveLength(1);
  });
  it('combina categoría y búsqueda', () => {
    expect(filterExpenses(data, { category: 'comida', query: '' })).toHaveLength(3);
    expect(filterExpenses(data, { category: 'comida', query: 'medialunas' })).toHaveLength(1);
    expect(filterExpenses(data, { category: 'ropa', query: '' })).toHaveLength(0);
  });
  it('ordena por fecha (más reciente primero) y agrupa por día', () => {
    const groups = groupByDate(sortByDateDesc(expensesInMonth(data, '2026-11')));
    expect(groups.map((g) => g.date)).toEqual(['2026-11-03', '2026-11-01']);
    expect(groups[0].total).toBe(10000);
    // Dentro del mismo día, el último cargado primero.
    expect(groups[0].items[0].description).toBe('Chicle');
  });
});
