import {
  budgetStatus,
  compareWithPreviousMonth,
  comparisonText,
  expensesInMonth,
  filterExpenses,
  groupByDate,
  monthlySeries,
  monthTotals,
  sortByDateDesc,
  sumAmounts,
  totalsByCategory,
  totalsByDay,
} from './stats';
import type { AnyCategoryId, Movement } from './types';

let n = 0;
const exp = (date: string, amount: number, category: AnyCategoryId = 'comida', description = ''): Movement => ({
  id: String(++n),
  type: 'expense',
  date,
  amount,
  category,
  description,
  method: 'debito',
  createdAt: n,
});
const inc = (date: string, amount: number, description = 'Sueldo'): Movement => ({
  ...exp(date, amount, 'sueldo', description),
  type: 'income',
});

const data = [
  exp('2026-10-02', 10000, 'super', 'Coto'),
  exp('2026-10-04', 5000, 'comida', 'Café'),
  exp('2026-10-20', 25000, 'servicios', 'Luz'),
  exp('2026-11-01', 3000, 'comida', 'Café con medialunas'),
  exp('2026-11-03', 9000, 'super', 'Verdulería'),
  exp('2026-11-03', 1000, 'comida', 'Chicle'),
  exp('2026-12-01', 7000, 'ocio', 'Cine'),
  inc('2026-11-01', 100000),
];

describe('totales', () => {
  it('filtra gastos por mes (sin ingresos) y suma', () => {
    const nov = expensesInMonth(data, '2026-11');
    expect(nov).toHaveLength(3);
    expect(sumAmounts(nov)).toBe(13000);
    expect(sumAmounts([])).toBe(0);
  });

  it('agrupa por categoría de mayor a menor, con su proporción, ignorando ingresos', () => {
    const r = totalsByCategory(data.filter((m) => m.date.startsWith('2026-11')));
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

describe('balance del mes', () => {
  it('calcula ingresos, gastos, balance y tasa de ahorro', () => {
    expect(monthTotals(data, '2026-11')).toEqual({ income: 100000, expenses: 13000, balance: 87000, savingsRate: 0.87 });
  });
  it('el balance puede ser negativo y sin ingresos no hay tasa de ahorro', () => {
    expect(monthTotals(data, '2026-10')).toEqual({ income: 0, expenses: 40000, balance: -40000, savingsRate: null });
  });
  it('arma la serie de los últimos meses, incluidos los vacíos', () => {
    const s = monthlySeries(data, '2026-12', 6);
    expect(s.map((p) => p.month)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
    expect(s[4]).toEqual({ month: '2026-11', label: 'nov', income: 100000, expenses: 13000 });
    expect(s[0].expenses).toBe(0);
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
  it('compara meses completos cuando el mes ya terminó (solo gastos)', () => {
    const c = compareWithPreviousMonth(data, '2026-11', '2027-01-10');
    expect(c).toMatchObject({ current: 13000, previous: 40000, percent: -68, partial: false });
    expect(comparisonText(c)).toBe('68% menos que octubre');
  });

  it('en el mes en curso compara hasta el mismo día del mes anterior', () => {
    const c = compareWithPreviousMonth(data, '2026-11', '2026-11-05');
    expect(c.previous).toBe(15000);
    expect(c.percent).toBe(-13);
    expect(comparisonText(c)).toBe('13% menos que octubre a esta altura');
  });

  it('dice "más" cuando subió y avisa si no hay datos', () => {
    expect(comparisonText(compareWithPreviousMonth(data, '2026-12', '2027-02-01'))).toBe('46% menos que noviembre');
    const up = compareWithPreviousMonth([exp('2026-09-10', 100), exp('2026-10-10', 150)], '2026-10', '2026-12-01');
    expect(comparisonText(up)).toBe('50% más que septiembre');
    const none = compareWithPreviousMonth(data, '2026-10', '2026-12-01');
    expect(none.percent).toBeNull();
    expect(comparisonText(none)).toBe('Sin gastos en septiembre para comparar');
  });
});

describe('lista', () => {
  it('busca sin importar mayúsculas ni tildes, también por categoría', () => {
    expect(filterExpenses(data, { category: 'todas', query: 'CAFE' })).toHaveLength(2);
    expect(filterExpenses(data, { category: 'todas', query: 'verduleria' })).toHaveLength(1);
    expect(filterExpenses(data, { category: 'todas', query: 'ocio' })).toHaveLength(1);
  });
  it('combina categoría y búsqueda, y filtra ingresos o gastos', () => {
    expect(filterExpenses(data, { category: 'comida', query: '' })).toHaveLength(3);
    expect(filterExpenses(data, { category: 'comida', query: 'medialunas' })).toHaveLength(1);
    expect(filterExpenses(data, { category: 'ropa', query: '' })).toHaveLength(0);
    expect(filterExpenses(data, { category: 'ingresos', query: '' })).toHaveLength(1);
    expect(filterExpenses(data, { category: 'gastos', query: '' })).toHaveLength(7);
  });
  it('ordena por fecha y agrupa por día con neto (ingresos − gastos)', () => {
    const nov = data.filter((m) => m.date.startsWith('2026-11'));
    const groups = groupByDate(sortByDateDesc(nov));
    expect(groups.map((g) => g.date)).toEqual(['2026-11-03', '2026-11-01']);
    expect(groups[0].total).toBe(10000);
    expect(groups[0].items[0].description).toBe('Chicle');
    expect(groups[1]).toMatchObject({ total: 3000, net: 97000 });
  });
});
