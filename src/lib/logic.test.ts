import { describe, expect, it } from 'vitest'
import { entriesToCSV } from './csv'
import { addMonths, dateInMonth, monthDiff } from './dates'
import { buildInsights } from './insights'
import { entriesForMonth, entriesForMovement, installmentCount, splitInstallments } from './ledger'
import { formatARS, parseAmount } from './money'
import { materializeRecurring, upcomingDue } from './recurring'
import { buildSampleData } from './sample'
import { balanceOf, budgetState, committedFor, compareWithPreviousMonth, expensesByCategory, expensesByDay, lastMonthsSeries } from './stats'
import type { Movement, RecurringRule } from './types'

const mov = (p: Partial<Movement>): Movement => ({
  id: 'm1',
  kind: 'gasto',
  amount: 1000,
  category: 'super',
  date: '2026-11-10',
  description: 'Test',
  method: 'debito',
  ...p,
})

describe('fechas', () => {
  it('suma meses cruzando el año', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(monthDiff('2026-11', '2027-02')).toBe(3)
  })
  it('ajusta al último día del mes', () => {
    expect(dateInMonth('2027-02', 31)).toBe('2027-02-28')
    expect(dateInMonth('2028-02', 30)).toBe('2028-02-29')
  })
})

describe('montos', () => {
  it('formatea en pesos argentinos', () => {
    expect(formatARS(12500).replace(/\s/g, ' ')).toBe('$ 12.500')
  })
  it('entiende lo que escribe la gente', () => {
    expect(parseAmount('12.500')).toBe(12500)
    expect(parseAmount('12500')).toBe(12500)
    expect(parseAmount('12.500,50')).toBe(12500.5)
    expect(parseAmount('$ 1.200.000')).toBe(1200000)
    expect(parseAmount('12500.5')).toBe(12500.5)
    expect(parseAmount('abc')).toBeNaN()
    expect(parseAmount('')).toBeNaN()
  })
})

describe('cuotas', () => {
  it('reparte el total sin perder centavos', () => {
    const parts = splitInstallments(1000, 3)
    expect(parts).toEqual([333.34, 333.33, 333.33])
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 10)
  })

  it('solo hay cuotas en gastos con crédito, entre 1 y 24', () => {
    expect(installmentCount(mov({ method: 'debito', installments: 6 }))).toBe(1)
    expect(installmentCount(mov({ kind: 'ingreso', method: 'credito', installments: 6 }))).toBe(1)
    expect(installmentCount(mov({ method: 'credito', installments: 30 }))).toBe(24)
    expect(installmentCount(mov({ method: 'credito', installments: 0 }))).toBe(1)
  })

  it('una cuota por mes, con "Cuota n/N"', () => {
    const m = mov({ method: 'credito', installments: 6, amount: 600, date: '2026-10-31' })
    const entries = entriesForMovement(m)
    expect(entries).toHaveLength(6)
    expect(entries.map((e) => e.date)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31'])
    expect(entries[1].installment).toEqual({ number: 2, total: 6 })
    expect(entries.every((e) => e.amount === 100)).toBe(true)
  })

  it('el mes muestra solo la cuota que le toca', () => {
    const movements = [mov({ id: 'tv', method: 'credito', installments: 3, amount: 300, date: '2026-10-05' })]
    expect(entriesForMonth(movements, '2026-09')).toHaveLength(0)
    expect(entriesForMonth(movements, '2026-11')[0].installment?.number).toBe(2)
    expect(entriesForMonth(movements, '2027-01')).toHaveLength(0)
  })

  it('calcula lo comprometido para el mes siguiente (cuotas + fijos)', () => {
    const movements = [
      mov({ id: 'a', method: 'credito', installments: 3, amount: 300, date: '2026-11-05' }),
      mov({ id: 'b', method: 'credito', installments: 2, amount: 200, date: '2026-10-05' }),
      mov({ id: 'c', amount: 999, date: '2026-11-05' }),
    ]
    const rules: RecurringRule[] = [{ id: 'r', kind: 'gasto', amount: 50, category: 'servicios', description: 'Luz', method: 'debito', dayOfMonth: 10, startMonth: '2026-01' }]
    const c = committedFor(movements, rules, '2026-12')
    expect(c.installments).toBe(100)
    expect(c.installmentCount).toBe(1)
    expect(c.recurring).toBe(50)
    expect(c.total).toBe(150)
  })
})

describe('gastos e ingresos fijos', () => {
  const rule: RecurringRule = { id: 'alq', kind: 'gasto', amount: 500, category: 'casa', description: 'Alquiler', method: 'transferencia', dayOfMonth: 31, startMonth: '2026-09' }

  it('genera un movimiento por mes hasta el mes indicado', () => {
    const created = materializeRecurring([rule], [], '2026-11')
    expect(created.map((m) => m.date)).toEqual(['2026-09-30', '2026-10-31', '2026-11-30'])
    expect(created.every((m) => m.recurringId === 'alq')).toBe(true)
  })

  it('es idempotente: no duplica si ya existe', () => {
    const first = materializeRecurring([rule], [], '2026-11')
    expect(materializeRecurring([rule], first, '2026-11')).toHaveLength(0)
    expect(materializeRecurring([rule], first, '2026-12')).toHaveLength(1)
  })

  it('respeta meses borrados y fecha de fin', () => {
    const created = materializeRecurring([{ ...rule, skippedMonths: ['2026-10'], endMonth: '2026-11' }], [], '2027-03')
    expect(created.map((m) => m.date.slice(0, 7))).toEqual(['2026-09', '2026-11'])
  })

  it('lista los vencimientos de los próximos 30 días', () => {
    const rules: RecurringRule[] = [
      { ...rule, id: 'a', dayOfMonth: 25 },
      { ...rule, id: 'b', dayOfMonth: 5 },
      { ...rule, id: 'c', kind: 'ingreso', dayOfMonth: 20 },
    ]
    const up = upcomingDue(rules, '2026-11-18', 30)
    expect(up.map((u) => [u.ruleId, u.date, u.daysLeft])).toEqual([
      ['a', '2026-11-25', 7],
      ['b', '2026-12-05', 17],
    ])
  })
})

describe('balance y presupuesto', () => {
  const movements = [
    mov({ id: '1', kind: 'ingreso', amount: 1000, category: 'sueldo', date: '2026-11-01' }),
    mov({ id: '2', amount: 300, date: '2026-11-05' }),
    mov({ id: '3', amount: 200, category: 'comida', date: '2026-11-20' }),
    mov({ id: '4', amount: 100, date: '2026-10-03' }),
    mov({ id: '5', amount: 500, date: '2026-10-25' }),
  ]

  it('ingresos menos gastos', () => {
    expect(balanceOf(entriesForMonth(movements, '2026-11'))).toEqual({ income: 1000, expenses: 500, left: 500 })
  })

  it('compara contra el mes anterior a la misma altura', () => {
    const c = compareWithPreviousMonth(movements, '2026-11', 10)
    expect(c.current).toBe(300)
    expect(c.previous).toBe(100)
    expect(c.change).toBe(2)
  })

  it('avisa al 80% y al 100%', () => {
    expect(budgetState(1000, 500).status).toBe('ok')
    expect(budgetState(1000, 800).status).toBe('warn')
    expect(budgetState(1000, 1000).status).toBe('over')
    expect(budgetState(0, 1000).status).toBe('none')
  })

  it('agrupa por categoría y por día', () => {
    const entries = entriesForMonth(movements, '2026-11')
    const cats = expensesByCategory(entries)
    expect(cats[0]).toMatchObject({ category: 'super', amount: 300 })
    expect(cats[1].share).toBeCloseTo(0.4)
    const days = expensesByDay(entries, '2026-11')
    expect(days).toHaveLength(30)
    expect(days[4]).toBe(300)
    expect(days[19]).toBe(200)
  })

  it('serie de 6 meses', () => {
    const s = lastMonthsSeries(movements, '2026-11')
    expect(s.map((p) => p.month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(s[4].expenses).toBe(600)
  })
})

describe('lecturas automáticas', () => {
  it('detecta una categoría por encima del promedio', () => {
    const base = (month: string, amount: number, id: string) => mov({ id, category: 'salud', amount, date: `${month}-05` })
    const movements = [
      base('2026-08', 100, 'a'),
      base('2026-09', 100, 'b'),
      base('2026-10', 100, 'c'),
      base('2026-11', 168, 'd'),
      mov({ id: 'e', category: 'super', amount: 50, date: '2026-11-03' }),
    ]
    const ins = buildInsights({ movements, rules: [], budget: 0, month: '2026-11', day: 18, isCurrentMonth: true })
    expect(ins[0].text).toBe('En Salud ya llevás 68% más que tu promedio de los últimos 3 meses.')
    expect(ins.length).toBeLessThanOrEqual(3)
  })
})

describe('CSV', () => {
  it('usa ; y coma decimal, y escapa comillas y fórmulas', () => {
    const csv = entriesToCSV(entriesForMonth([mov({ description: 'Dice "hola"; chau', amount: 1234.5 }), mov({ id: 'x', description: '=HYPERLINK()' })], '2026-11'))
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe('Fecha;Tipo;Categoría;Descripción;Medio de pago;Cuota;Monto')
    expect(csv).toContain('"Dice ""hola""; chau"')
    expect(csv).toContain('-1234,50')
    expect(csv).toContain("'=HYPERLINK()")
  })
})

describe('datos de ejemplo', () => {
  it('son consistentes y muestran todas las funciones', () => {
    const data = buildSampleData('2026-11-18')
    const nov = entriesForMonth(data.movements, '2026-11')
    expect(nov.some((e) => e.installment)).toBe(true)
    expect(nov.some((e) => e.recurringId)).toBe(true)
    expect(nov.some((e) => e.kind === 'ingreso')).toBe(true)
    expect(new Set(data.movements.map((m) => m.id)).size).toBe(data.movements.length)
    expect(materializeRecurring(data.recurring, data.movements, '2026-11')).toHaveLength(0)
    const ins = buildInsights({ movements: data.movements, rules: data.recurring, budget: data.budget, month: '2026-11', day: 18, isCurrentMonth: true })
    expect(ins.length).toBe(3)
  })
})
