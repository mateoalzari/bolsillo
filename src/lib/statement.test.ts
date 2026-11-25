import { describe, expect, it } from 'vitest'
import { entriesForMovement } from './ledger'
import { findDuplicate, guessCategory, paymentStartFor, rowToMovement, suggestCard } from './importPlan'
import { readPdfLines, type PdfLib } from './pdfText'
import { extractInstallment, parseCSV, parseStatementAmount, parseStatementCSV, parseStatementDate, parseStatementText, StatementError, tidyDescription } from './statement'
import { asText, buildPdf, MASTERCARD_CSV, MASTERCARD_PDF_LINES, VISA_CSV, VISA_PDF_LINES } from './fixtures/statements'
import type { CreditCard, Movement } from './types'

const TODAY = '2026-11-25'

const pdfjs = () => import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as Promise<PdfLib>

describe('fechas de resumen', () => {
  it('lee los formatos de Visa y Mastercard', () => {
    expect(parseStatementDate('05-Sep-26', TODAY)).toBe('2026-09-05')
    expect(parseStatementDate('05 Dic 26', TODAY)).toBe('2026-12-05')
    expect(parseStatementDate('5 Set 2026', TODAY)).toBe('2026-09-05')
    expect(parseStatementDate('05.09.26', TODAY)).toBe('2026-09-05')
    expect(parseStatementDate('15/08/2026', TODAY)).toBe('2026-08-15')
    expect(parseStatementDate('2026-08-15', TODAY)).toBe('2026-08-15')
    expect(parseStatementDate('12 Octubre 26', TODAY)).toBe('2026-10-12')
  })

  it('sin año usa el del cierre, o el anterior si quedaría en el futuro', () => {
    expect(parseStatementDate('20/11', '2026-11-26')).toBe('2026-11-20')
    expect(parseStatementDate('28-Dic', '2027-01-26')).toBe('2026-12-28')
  })

  it('rechaza fechas inválidas y palabras que parecen meses', () => {
    expect(parseStatementDate('31/02/2026', TODAY)).toBeUndefined()
    expect(parseStatementDate('12 Mayorista', TODAY)).toBeUndefined()
    expect(parseStatementDate('5678', TODAY)).toBeUndefined()
  })
})

describe('montos y cuotas', () => {
  it('lee montos con coma decimal, signo al final y punto decimal', () => {
    expect(parseStatementAmount('18.333,33')).toBe(18333.33)
    expect(parseStatementAmount('310.000,00-')).toBe(-310000)
    expect(parseStatementAmount('-5.000,00')).toBe(-5000)
    expect(parseStatementAmount('$ 1.234,56')).toBe(1234.56)
    expect(parseStatementAmount('62104.90')).toBe(62104.9)
    expect(parseStatementAmount('1,234.56')).toBe(1234.56)
    expect(parseStatementAmount('(1.200,00)')).toBe(-1200)
    expect(parseStatementAmount('12.500')).toBe(12500)
    expect(parseStatementAmount('')).toBeNaN()
    expect(parseStatementAmount('abc')).toBeNaN()
  })

  it('reconoce las cuotas en los formatos habituales', () => {
    expect(extractInstallment('FRAVEGA ONLINE C.03/12').installment).toEqual({ number: 3, total: 12 })
    expect(extractInstallment('FRAVEGA ONLINE C.03/12').rest).toBe('FRAVEGA ONLINE')
    expect(extractInstallment('SAMSUNG Cuota 4 de 6').installment).toEqual({ number: 4, total: 6 })
    expect(extractInstallment('SAMSUNG CUOTA 04/06').installment).toEqual({ number: 4, total: 6 })
    expect(extractInstallment('TIENDA CTA 2/3').installment).toEqual({ number: 2, total: 3 })
    // 7 de 6 o 1 cuota no son cuotas válidas; 36 cuotas supera el máximo de la app
    expect(extractInstallment('X C.07/06').installment).toBeUndefined()
    expect(extractInstallment('X C.01/36').installment).toBeUndefined()
    expect(extractInstallment('PIZZERIA 10/12 SUC').installment).toBeUndefined()
  })

  it('ordena la descripción sin romper siglas', () => {
    expect(tidyDescription('SUPERMERCADO COTO SUC 45')).toBe('Supermercado Coto Suc 45')
    expect(tidyDescription('YPF SERVICLUB')).toBe('YPF Serviclub')
    expect(tidyDescription('MERPAGO*TIENDA DEL SOL')).toBe('Merpago*Tienda del Sol')
    expect(tidyDescription('Intereses de financiación')).toBe('Intereses de financiación')
  })
})

describe('resumen Visa en PDF (texto)', () => {
  const parsed = parseStatementText(asText(VISA_PDF_LINES), TODAY)

  it('encuentra cierre, vencimiento y marca', () => {
    expect(parsed.closingDate).toBe('2026-11-26')
    expect(parsed.dueDate).toBe('2026-12-05')
    expect(parsed.brand).toBe('visa')
  })

  it('lee los consumos, las cuotas y los dólares', () => {
    const simple = parsed.rows.map((r) => [r.date, r.description, r.amount, r.currency, r.installment ? `${r.installment.number}/${r.installment.total}` : '', r.type])
    expect(simple).toEqual([
      ['2026-06-12', 'Merpago*Tiendadelsol', 18333.33, 'ARS', '6/6', 'compra'],
      ['2026-09-05', 'Fravega Online', 41250, 'ARS', '3/12', 'compra'],
      ['2026-10-28', 'Supermercado Coto Suc 45', 45320.5, 'ARS', '', 'compra'],
      ['2026-11-02', 'YPF Serviclub', 38900, 'ARS', '', 'compra'],
      ['2026-11-10', 'Netflix.com', 12.99, 'USD', '', 'compra'],
      ['2026-11-14', 'Pedidosya*Burgers', 15780, 'ARS', '', 'compra'],
      ['2026-11-18', 'Devolucion Compra Fravega', 5000, 'ARS', '', 'devolucion'],
      ['2026-11-20', 'Farmacity', 9870.4, 'ARS', '', 'compra'],
      ['2026-11-26', 'DB.RG 5617 30% ( 12,99 )', 4677, 'ARS', '', 'cargo'],
      ['2026-11-26', 'Impuesto de Sellos', 1234.56, 'ARS', '', 'cargo'],
      ['2026-11-26', 'Iva RG 4240 21%', 320.15, 'ARS', '', 'cargo'],
    ])
  })

  it('no importa pagos, saldos ni el pago mínimo', () => {
    expect(parsed.skipped).toBe(4)
    expect(parsed.rows.some((r) => /\b(su pago|saldo|pago minimo)/i.test(r.description))).toBe(false)
  })

  it('marca los impuestos sin fecha con la fecha del cierre', () => {
    expect(parsed.rows.filter((r) => r.dateFromStatement).map((r) => r.type)).toEqual(['cargo', 'cargo', 'cargo'])
  })
})

describe('resumen Mastercard en PDF (texto)', () => {
  const parsed = parseStatementText(asText(MASTERCARD_PDF_LINES), TODAY)

  it('encuentra fechas en "Cierre actual: dd/mm/aaaa" e ignora las próximas', () => {
    expect(parsed.closingDate).toBe('2026-11-24')
    expect(parsed.dueDate).toBe('2026-12-04')
    expect(parsed.brand).toBe('mastercard')
  })

  it('saca el número de cupón y lee "Cuota 4 de 6"', () => {
    expect(parsed.rows.map((r) => [r.date, r.description, r.amount, r.currency, r.installment?.number ?? 0, r.type])).toEqual([
      ['2026-08-15', 'Samsung Store', 52500, 'ARS', 4, 'compra'],
      ['2026-10-30', 'Carrefour Hiper 112', 62104.9, 'ARS', 0, 'compra'],
      ['2026-11-03', 'Spotify', 4.99, 'USD', 0, 'compra'],
      ['2026-11-09', 'Cabify Viaje', 7420, 'ARS', 0, 'compra'],
      ['2026-11-21', 'Hoyts Abasto', 18000, 'ARS', 0, 'compra'],
      ['2026-11-24', 'Intereses de financiación', 2310.77, 'ARS', 0, 'cargo'],
    ])
    expect(parsed.skipped).toBe(2)
  })
})

describe('PDF real con pdf.js', () => {
  it('extrae las mismas líneas que se leen en pantalla', async () => {
    const lib = await pdfjs()
    const lines = await readPdfLines(lib, buildPdf(VISA_PDF_LINES))
    const fromPdf = parseStatementText(lines, TODAY)
    const fromText = parseStatementText(asText(VISA_PDF_LINES), TODAY)
    expect(fromPdf.rows).toEqual(fromText.rows)
    expect(fromPdf.dueDate).toBe('2026-12-05')
  })

  it('lee el PDF de Mastercard con acentos (WinAnsi)', async () => {
    const lib = await pdfjs()
    const parsed = parseStatementText(await readPdfLines(lib, buildPdf(MASTERCARD_PDF_LINES)), TODAY)
    expect(parsed.rows).toHaveLength(6)
    expect(parsed.rows[5].description).toBe('Intereses de financiación')
  })

  it('avisa si el PDF no tiene texto (escaneado)', async () => {
    const lib = await pdfjs()
    await expect(readPdfLines(lib, buildPdf([[[40, 'X']]]))).rejects.toMatchObject({ kind: 'scanned' })
  })

  it('avisa si el archivo no es un PDF', async () => {
    const lib = await pdfjs()
    await expect(readPdfLines(lib, new TextEncoder().encode('hola, no soy un pdf'))).rejects.toMatchObject({ kind: 'unreadable' })
  })

  it('distingue PDF con contraseña y contraseña incorrecta', async () => {
    const fake = (code: number): PdfLib => ({
      getDocument: () => ({ promise: Promise.reject(Object.assign(new Error('pw'), { name: 'PasswordException', code })) }),
    })
    await expect(readPdfLines(fake(1), new Uint8Array(4))).rejects.toMatchObject({ kind: 'password-needed' })
    await expect(readPdfLines(fake(2), new Uint8Array(4), '1234')).rejects.toMatchObject({ kind: 'password-wrong' })
  })
})

describe('CSV', () => {
  it('separa celdas con comillas, ; dentro de comillas y BOM', () => {
    expect(parseCSV('﻿a;b;c\n1;"x; y";"dice ""hola"""\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x; y', 'dice "hola"'],
    ])
  })

  it('lee el CSV de Visa: encabezado después de datos de la tarjeta, columna de cuota y de dólares', () => {
    const p = parseStatementCSV(VISA_CSV, TODAY)
    expect(p.closingDate).toBe('2026-11-26')
    expect(p.dueDate).toBe('2026-12-05')
    expect(p.brand).toBe('visa')
    expect(p.skipped).toBe(1)
    expect(p.rows.map((r) => [r.date, r.description, r.amount, r.currency, r.installment?.total ?? 1, r.type])).toEqual([
      ['2026-06-12', 'Merpago*Tiendadelsol', 18333.33, 'ARS', 6, 'compra'],
      ['2026-09-05', 'Fravega Online', 41250, 'ARS', 12, 'compra'],
      ['2026-10-28', 'Supermercado Coto Suc 45', 45320.5, 'ARS', 1, 'compra'],
      ['2026-11-10', 'Netflix.com', 12.99, 'USD', 1, 'compra'],
      ['2026-11-14', 'Pedidosya*Burgers; Combo', 15780, 'ARS', 1, 'compra'],
      ['2026-11-18', 'Devolucion Compra Fravega', 5000, 'ARS', 1, 'devolucion'],
      ['2026-11-26', 'Impuesto de Sellos', 1234.56, 'ARS', 1, 'cargo'],
    ])
  })

  it('lee el CSV de Mastercard: coma, punto decimal, columna de moneda y cuotas en la descripción', () => {
    const p = parseStatementCSV(MASTERCARD_CSV, TODAY)
    expect(p.rows.map((r) => [r.date, r.description, r.amount, r.currency, r.installment?.number ?? 0])).toEqual([
      ['2026-08-15', 'Samsung Store', 52500, 'ARS', 4],
      ['2026-10-30', 'Carrefour Hiper 112', 62104.9, 'ARS', 0],
      ['2026-11-03', 'Spotify', 4.99, 'USD', 0],
      ['2026-11-09', 'Cabify Viaje', 7420, 'ARS', 0],
      ['2026-11-21', 'Hoyts Abasto', 18000, 'ARS', 0],
    ])
    expect(p.skipped).toBe(1)
  })

  it('explica cuando el CSV no tiene columnas reconocibles', () => {
    expect(() => parseStatementCSV('nombre;edad\nAna;30\n', TODAY)).toThrow(StatementError)
    expect(() => parseStatementCSV('', TODAY)).toThrow(/vacío/)
  })
})

describe('del resumen a Bolsillo', () => {
  const visa: CreditCard = { id: 'visa', name: 'Visa Plata', closingDay: 26, dueDay: 5 }
  const master: CreditCard = { id: 'mc', name: 'Mastercard Pampa', closingDay: 24, dueDay: 4 }
  const rows = parseStatementText(asText(VISA_PDF_LINES), TODAY).rows
  const fravega = rows[1]

  it('una cuota 3/12 se guarda como UNA compra de 12 cuotas y la cuota 3 cae en el vencimiento', () => {
    const m = rowToMovement(fravega, { category: 'compras', cardId: 'visa' }, '2026-12-05', [visa])
    expect(m).toMatchObject({ kind: 'gasto', amount: 495000, installments: 12, date: '2026-09-05', method: 'credito', cardId: 'visa', paymentStart: '2026-10-05' })
    const entries = entriesForMovement({ ...m, id: 'x' })
    expect(entries).toHaveLength(12)
    expect(entries[2]).toMatchObject({ date: '2026-12-05', amount: 41250 })
  })

  it('un consumo en un pago se paga en el vencimiento del resumen', () => {
    const coto = rows[2]
    expect(rowToMovement(coto, { category: 'super', cardId: 'visa' }, '2026-12-05', [visa])).toMatchObject({ amount: 45320.5, paymentStart: '2026-12-05' })
    expect(rowToMovement(coto, { category: 'super', cardId: 'visa' }, '2026-12-05', [visa]).installments).toBeUndefined()
  })

  it('sin vencimiento detectado usa el cierre de la tarjeta', () => {
    expect(paymentStartFor(rows[2], undefined, visa)).toBe('2026-12-05')
    expect(paymentStartFor(rows[2], undefined, undefined)).toBeUndefined()
  })

  it('una devolución se guarda como ingreso en el vencimiento', () => {
    expect(rowToMovement(rows[6], { category: 'otros-ingresos', cardId: 'visa' }, '2026-12-05', [visa])).toMatchObject({ kind: 'ingreso', amount: 5000, date: '2026-12-05' })
  })

  it('detecta lo que ya está cargado (a mano o en una importación anterior)', () => {
    const existing: Movement[] = [
      // Cargado a mano un día después, sin tarjeta
      { id: 'a', kind: 'gasto', amount: 45320.5, category: 'super', date: '2026-10-29', description: 'Coto', method: 'credito' },
      // Importado el mes pasado como C.02/12
      { id: 'b', kind: 'gasto', amount: 495000, installments: 12, category: 'compras', date: '2026-09-05', description: 'Fravega', method: 'credito', cardId: 'visa' },
      // Mismo monto que YPF pero otra fecha: no es duplicado
      { id: 'c', kind: 'gasto', amount: 38900, category: 'transporte', date: '2026-10-02', description: 'YPF', method: 'debito' },
    ]
    expect(findDuplicate(rows[2], existing)?.id).toBe('a')
    expect(findDuplicate(fravega, existing)?.id).toBe('b')
    expect(findDuplicate(rows[3], existing)).toBeUndefined()
    // La compra en cuotas no se confunde con un gasto en un pago del mismo valor
    expect(findDuplicate({ ...fravega, installment: undefined }, existing)).toBeUndefined()
  })

  it('sugiere categorías por comercio y aprende de lo que ya cargaste', () => {
    const cat = (i: number, history: Movement[] = []) => guessCategory(rows[i], history)
    expect(cat(2)).toBe('super')
    expect(cat(3)).toBe('transporte')
    expect(cat(4)).toBe('servicios')
    expect(cat(5)).toBe('comida')
    expect(cat(7)).toBe('salud')
    expect(cat(9)).toBe('otros')
    expect(cat(6)).toBe('otros-ingresos')
    const history: Movement[] = [{ id: 'h', kind: 'gasto', amount: 1, category: 'casa', date: '2026-10-01', description: 'Supermercado Coto', method: 'debito' }]
    expect(cat(2, history)).toBe('casa')
  })

  it('elige la tarjeta por la marca del resumen', () => {
    expect(suggestCard([visa, master], 'mastercard')).toBe('mc')
    expect(suggestCard([visa, master], 'visa')).toBe('visa')
    expect(suggestCard([visa, master], undefined)).toBe('')
    expect(suggestCard([visa], 'amex')).toBe('visa')
    expect(suggestCard([], 'visa')).toBe('')
  })
})
