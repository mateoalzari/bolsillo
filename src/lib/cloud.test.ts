import { describe, expect, it } from 'vitest'
import { diffById, diffData, isEmptyDiff, movementToRow, rowToMovement, rowToRule, ruleToRow } from './cloud'
import { convert, formatIn, viewOptions } from './currency'
import type { AppData, Movement, RecurringRule } from './types'

const m: Movement = { id: 'a', kind: 'gasto', amount: 1200.5, category: 'super', date: '2026-11-10', description: 'Coto', method: 'credito', installments: 3, cardId: 'visa', paymentStart: '2026-12-05' }
const r: RecurringRule = { id: 'r', kind: 'gasto', amount: 500, category: 'casa', description: 'Alquiler', method: 'transferencia', dayOfMonth: 10, startMonth: '2026-01', skippedMonths: ['2026-03'] }
const base: AppData = { version: 1, movements: [m], recurring: [r], cards: [], currency: 'ARS', budget: 1000 }

describe('filas de la base', () => {
  it('ida y vuelta de un movimiento sin perder datos', () => {
    const row = movementToRow(m, 'u1')
    expect(row).toMatchObject({ user_id: 'u1', installments: 3, card_id: 'visa', payment_start: '2026-12-05', recurring_id: null })
    expect(rowToMovement(row)).toEqual(m)
  })
  it('un pago sin cuotas guarda installments en null', () => {
    expect(movementToRow({ ...m, installments: undefined }, 'u1').installments).toBeNull()
  })
  it('convierte montos numéricos que llegan como texto', () => {
    expect(rowToMovement({ ...movementToRow(m, 'u1'), amount: '99.9' as unknown as number }).amount).toBe(99.9)
  })
  it('ida y vuelta de una regla fija', () => {
    expect(rowToRule(ruleToRow(r, 'u1'))).toEqual(r)
  })
})

describe('diferencias para sincronizar', () => {
  it('sin cambios no manda nada', () => {
    expect(isEmptyDiff(diffData(base, { ...base }))).toBe(true)
  })
  it('detecta altas, cambios y bajas por referencia', () => {
    const changed = { ...m, amount: 1 }
    const added = { ...m, id: 'b' }
    const d = diffById([m, { ...m, id: 'x' }], [changed, added])
    expect(d.upserts.map((x) => x.id)).toEqual(['a', 'b'])
    expect(d.deletes).toEqual(['x'])
  })
  it('el presupuesto y la moneda van al perfil', () => {
    expect(diffData(base, { ...base, budget: 5 }).profile).toEqual({ budget: 5, currency: 'ARS' })
    expect(diffData(base, { ...base, currency: 'USD' }).profile).toEqual({ budget: 1000, currency: 'USD' })
  })
})

describe('monedas', () => {
  const rates = { USD: 1500, USD_BLUE: 1600, EUR: 1700, BRL: 270 }
  it('convierte de pesos a dólar oficial y blue', () => {
    expect(convert(160000, 'ARS', 'USD_BLUE', rates)).toBe(100)
    expect(convert(150000, 'ARS', 'USD', rates)).toBe(100)
  })
  it('convierte entre dos monedas pasando por el peso', () => {
    expect(convert(100, 'USD', 'ARS', rates)).toBe(150000)
    expect(convert(170, 'EUR', 'BRL', rates)).toBeCloseTo(1070.37, 1)
  })
  it('sin cotización devuelve null', () => {
    expect(convert(100, 'ARS', 'EUR', {})).toBeNull()
  })
  it('formatea cada moneda a la argentina', () => {
    expect(formatIn(12500, 'ARS').replace(/\s/g, ' ')).toBe('$ 12.500')
    expect(formatIn(12.5, 'USD').replace(/\s/g, ' ')).toBe('US$ 12,50')
    expect(formatIn(1500, 'EUR').replace(/\s/g, ' ')).toMatch(/1\.500/)
  })
  it('las opciones de vista no repiten la moneda principal', () => {
    expect(viewOptions('ARS')).toEqual(['base', 'USD', 'USD_BLUE', 'EUR', 'BRL'])
    expect(viewOptions('USD')).not.toContain('USD')
  })
})
