import { addDays, dateInMonth, daysInMonth } from './dates'
import { MAX_INSTALLMENTS } from './ledger'
import type { ISODate } from './types'

/**
 * Lector de resúmenes de tarjeta de crédito (Visa, Mastercard, Amex de bancos argentinos).
 * Trabaja sobre texto: el CSV se lee directo y el PDF se convierte antes en líneas (ver pdfText.ts).
 * No usa IA: son reglas simples y explicables, y el archivo nunca sale del navegador.
 */

export type RowType = 'compra' | 'cargo' | 'devolucion'
export type StatementCurrency = 'ARS' | 'USD'
export type CardBrand = 'visa' | 'mastercard' | 'amex'

export interface StatementRow {
  /** Posición en el archivo (sirve de clave estable en la pantalla de revisión). */
  index: number
  /** Fecha de la compra original (en una cuota, la fecha en que se compró, no la de pago). */
  date: ISODate
  /** true si la línea no tenía fecha (impuestos y cargos): se usa la del cierre. */
  dateFromStatement?: boolean
  description: string
  /** Lo que se cobra en ESTE resumen: en una compra en cuotas, el valor de una cuota. Siempre positivo. */
  amount: number
  currency: StatementCurrency
  installment?: { number: number; total: number }
  type: RowType
}

export interface ParsedStatement {
  format: 'csv' | 'pdf'
  rows: StatementRow[]
  /** Líneas reconocidas que no son consumos (pagos, saldo anterior, totales): no se importan. */
  skipped: number
  closingDate?: ISODate
  dueDate?: ISODate
  brand?: CardBrand
}

export class StatementError extends Error {
  constructor(
    public kind: 'empty' | 'scanned' | 'unreadable' | 'password-needed' | 'password-wrong' | 'unsupported',
    message: string,
  ) {
    super(message)
    this.name = 'StatementError'
  }
}

/* ---------------- Texto ---------------- */

export const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const upper = (s: string) => stripAccents(s).toUpperCase()

/* ---------------- Fechas ---------------- */

const MONTHS: Record<string, number> = {
  ENE: 1, JAN: 1, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, AUG: 8,
  SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12, DEC: 12,
}

function monthFromName(name: string): number | undefined {
  const n = upper(name).replace(/\./g, '')
  if (n.length < 3) return undefined
  const m = MONTHS[n.slice(0, 3)]
  if (!m) return undefined
  // "Septiembre", "Sept", "Octubre"…: el resto tiene que ser letras (no aceptar "MAYORISTA")
  if (n.length > 3 && !/^(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|SEPT|OCTUBRE|NOVIEMBRE|DICIEMBRE|JANUARY|FEBRUARY|MARCH|APRIL|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)$/.test(n)) return undefined
  return m
}

function validDate(y: number, m: number, d: number): ISODate | undefined {
  if (!(m >= 1 && m <= 12) || !(d >= 1) || y < 2000 || y > 2100) return undefined
  const key = `${y}-${String(m).padStart(2, '0')}`
  if (d > daysInMonth(key)) return undefined
  return dateInMonth(key, d)
}

function fullYear(y: string): number {
  const n = Number(y)
  return y.length <= 2 ? 2000 + n : n
}

/** Elige el año de una fecha sin año: el de la referencia, o el anterior si así quedaría en el futuro. */
function inferYear(m: number, d: number, ref: ISODate): ISODate | undefined {
  const y = Number(ref.slice(0, 4))
  const same = validDate(y, m, d)
  if (same && same <= addDays(ref, 10)) return same
  return validDate(y - 1, m, d)
}

const MON = '[A-Za-zÁÉÍÓÚáéíóú]{3,10}\\.?'
/** Fechas que aparecen en los resúmenes: 05-Sep-26, 05 Sep 2026, 05.09.26, 05/09/2026, 2026-09-05, 05-09 */
export const DATE_SOURCE = `(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[-./ ]${MON}(?:[-./ ]\\d{2,4})?|\\d{1,2}[-./]\\d{1,2}(?:[-./]\\d{2,4})?)`

/**
 * Convierte una fecha de resumen a YYYY-MM-DD. `ref` se usa para las fechas sin año
 * (normalmente el cierre del resumen). Devuelve undefined si no es una fecha válida.
 */
export function parseStatementDate(token: string, ref: ISODate): ISODate | undefined {
  const t = token.trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (m) return validDate(Number(m[1]), Number(m[2]), Number(m[3]))
  m = /^(\d{1,2})[-./ ]([A-Za-zÁÉÍÓÚáéíóú]{3,10})\.?(?:[-./ ](\d{2,4}))?$/.exec(t)
  if (m) {
    const month = monthFromName(m[2])
    if (!month) return undefined
    return m[3] ? validDate(fullYear(m[3]), month, Number(m[1])) : inferYear(month, Number(m[1]), ref)
  }
  m = /^(\d{1,2})[-./](\d{1,2})(?:[-./](\d{2,4}))?$/.exec(t)
  if (m) {
    if (m[3] && m[3].length === 3) return undefined
    return m[3] ? validDate(fullYear(m[3]), Number(m[2]), Number(m[1])) : inferYear(Number(m[2]), Number(m[1]), ref)
  }
  return undefined
}

/* ---------------- Montos ---------------- */

/**
 * Lee un monto escrito como en Argentina ("1.234,56", "1.234,56-", "-1234,56") o con punto decimal ("1234.56").
 * Devuelve el número con signo, o NaN.
 */
export function parseStatementAmount(input: string): number {
  let s = input.replace(/\s|\$|ARS|U\$S|USD/gi, '')
  if (!s) return NaN
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (s.endsWith('-')) {
    negative = !negative
    s = s.slice(0, -1)
  }
  if (s.startsWith('-')) {
    negative = !negative
    s = s.slice(1)
  } else if (s.startsWith('+')) s = s.slice(1)
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return NaN
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let normalized: string
  if (lastComma >= 0 && lastDot >= 0) {
    // El último separador es el decimal
    normalized = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma >= 0) {
    normalized = /^\d{1,3}(,\d{3})+$/.test(s) && s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(/,(?=.*,)/g, '').replace(',', '.')
  } else if (lastDot >= 0) {
    normalized = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s
  } else normalized = s
  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN
  const n = Math.round(Number(normalized) * 100) / 100
  return negative ? -n : n
}

/** Monto de un PDF: siempre con dos decimales y coma ("12.500,00", "1.234,56-", "-310.000,00"). */
const PDF_AMOUNT = /^-?\$?\d{1,3}(?:\.\d{3})*,\d{2}-?$|^-?\$?\d+,\d{2}-?$/

/* ---------------- Cuotas ---------------- */

const INSTALLMENT_PATTERNS = [
  /\bC\.?\s?(\d{1,2})\s?\/\s?(\d{1,2})\b/i, // C.03/06 · C 3/6
  /\bCUOTAS?\s*:?\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})\b/i, // Cuota 3 de 6 · CUOTA 03/06
  /\bCTAS?\.?\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})\b/i, // CTA 3/6
]

/** Busca la cuota en un texto ("C.03/06", "Cuota 3 de 6", "CTA 03/06"). Devuelve el texto sin la cuota. */
export function extractInstallment(text: string): { installment?: { number: number; total: number }; rest: string } {
  for (const re of INSTALLMENT_PATTERNS) {
    const m = re.exec(stripAccents(text))
    if (!m) continue
    const number = Number(m[1])
    const total = Number(m[2])
    if (number >= 1 && total >= 2 && number <= total && total <= MAX_INSTALLMENTS) {
      return { installment: { number, total }, rest: (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim() }
    }
  }
  return { rest: text }
}

/** Cuota escrita sola en una columna del CSV: "3/6", "03 de 06", "C.03/06". */
function parseInstallmentCell(cell: string): { number: number; total: number } | undefined {
  const t = cell.trim()
  if (!t) return undefined
  const m = /^(?:C\.?|CUOTA|CTA\.?)?\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})$/i.exec(stripAccents(t))
  if (!m) return extractInstallment(t).installment
  const number = Number(m[1])
  const total = Number(m[2])
  return number >= 1 && total >= 2 && number <= total && total <= MAX_INSTALLMENTS ? { number, total } : undefined
}

/* ---------------- Clasificación de líneas ---------------- */

/** Líneas que no son consumos: pagos, saldos y totales. */
const NOT_A_PURCHASE = /\b(SALDO ANTERIOR|SALDO ACTUAL|SALDO PENDIENTE|SU PAGO|PAGO (RECIBIDO|EFECTUADO|REALIZADO)|PAGO EN (PESOS|DOLARES|USD)|PAGO MINIMO|PAGOS?\s*\/?\s*CREDITOS|TOTAL\b|SUBTOTAL|LIMITE DE|DISPONIBLE|TASA NOMINAL|TNA\b|TEA\b|CFT)/
/** Impuestos, intereses y comisiones: son un gasto real del mes. */
const CHARGE = /\b(IMPUESTO|IMP\.|IVA\b|INTERES|PERCEP|SELLOS|COMISION|SEGURO|CARGO|DB\.?\s?RG|RG\s?\d{4}|IIBB|INGRESOS BRUTOS|MANTENIMIENTO|RENOVACION)/
/** Devoluciones y bonificaciones: restan del resumen. */
const REFUND = /\b(DEVOLUCION|DEVOL\.|BONIF|REINTEGRO|ANULACION|CREDITO POR|CONTRACARGO)/
const USD_MARK = /\b(USD|U\$S|US\$|DOLARES)\b/

function classify(description: string, signedAmount: number): RowType | 'skip' {
  const d = upper(description)
  if (NOT_A_PURCHASE.test(d)) return 'skip'
  if (signedAmount < 0 || REFUND.test(d)) return 'devolucion'
  if (CHARGE.test(d)) return 'cargo'
  return 'compra'
}

const SMALL_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'sa', 'srl'])

/** "MERPAGO*TIENDA  DEL SOL" → "Merpago*Tienda del Sol". Deja siglas cortas (YPF, SA) en mayúscula. */
export function tidyDescription(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').replace(/^[\s*·.-]+|[\s*·-]+$/g, '').trim()
  if (!s) return ''
  if (s !== s.toUpperCase()) return s
  return s
    .split(' ')
    .map((word, i) => {
      const lower = word.toLowerCase()
      if (i > 0 && SMALL_WORDS.has(lower)) return lower === 'sa' || lower === 'srl' ? word : lower
      if (/^[A-Z]{2,3}$/.test(word) && !/[AEIOU]/.test(word.slice(1))) return word // YPF, ABL
      if (/^[A-Z]{1,3}(\.[A-Z]{1,3})+\.?$/.test(word)) return word // DB.RG, S.A.
      return lower.replace(/(^|[*\-/(])([a-zñáéíóú])/g, (_, p: string, c: string) => p + c.toUpperCase())
    })
    .join(' ')
}

/* ---------------- Datos del resumen (cierre, vencimiento, marca) ---------------- */

export function detectBrand(text: string): CardBrand | undefined {
  const t = upper(text)
  if (/MASTER\s?CARD/.test(t)) return 'mastercard'
  if (/AMERICAN EXPRESS|\bAMEX\b/.test(t)) return 'amex'
  if (/\bVISA\b/.test(t)) return 'visa'
  return undefined
}

const LABEL = /(PR[OÓ]X(?:IMO|\.)?\s+)?(CIERRE|VENCIMIENTO|VTO\.?)(?:\s+ACTUAL)?(?:\s+DEL\s+RESUMEN)?\s*:?\s*/gi

/** Busca el cierre y el vencimiento del resumen actual (no los "próximos"). */
export function detectStatementDates(lines: string[], ref: ISODate): { closingDate?: ISODate; dueDate?: ISODate } {
  const out: { closingDate?: ISODate; dueDate?: ISODate } = {}
  const set = (label: string, date: ISODate) => {
    if (/CIERRE/i.test(label)) out.closingDate ??= date
    else out.dueDate ??= date
  }
  const dateAt = new RegExp(`^(${DATE_SOURCE})`)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const labels: { label: string; next?: boolean }[] = []
    // Se busca sobre el texto sin acentos ("Próximo"): mide lo mismo que el original
    for (const m of upper(line).matchAll(LABEL)) {
      if (m[1]) {
        labels.push({ label: 'skip' })
        continue
      }
      const after = line.slice((m.index ?? 0) + m[0].length)
      const d = dateAt.exec(after)
      const date = d && parseStatementDate(d[1], ref)
      if (date) set(m[2], date)
      else labels.push({ label: m[2], next: true })
    }
    // Rótulos en una línea y fechas en la siguiente ("CIERRE ACTUAL   VENCIMIENTO ACTUAL" / "26 Nov 26   05 Dic 26")
    const pending = labels.filter((l) => l.next)
    if (pending.length && i + 1 < lines.length) {
      const dates = [...lines[i + 1].matchAll(new RegExp(DATE_SOURCE, 'g'))].map((m) => parseStatementDate(m[0], ref)).filter((d): d is ISODate => Boolean(d))
      if (dates.length >= labels.length) labels.forEach((l, k) => l.label !== 'skip' && set(l.label, dates[k]))
    }
  }
  // Un vencimiento anterior al cierre es un error de lectura: se descarta
  if (out.closingDate && out.dueDate && out.dueDate < out.closingDate) delete out.dueDate
  return out
}

/* ---------------- Texto del PDF ---------------- */

const LINE_DATE = new RegExp(`^\\s*(${DATE_SOURCE})\\s+`)

/**
 * Lee las líneas de texto de un resumen (ya extraídas del PDF).
 * Una línea de consumo empieza con fecha y termina con uno o dos montos; los impuestos pueden venir sin fecha.
 */
export function parseStatementText(lines: string[], today: ISODate): ParsedStatement {
  const fullText = lines.join('\n')
  const dates = detectStatementDates(lines, today)
  const ref = dates.closingDate ?? today
  const rows: StatementRow[] = []
  let skipped = 0

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\s+/g, ' ').trim()
    if (!line) return
    // Montos al final de la línea (columna pesos y/o dólares)
    const tokens = line.split(' ')
    const amounts: string[] = []
    while (tokens.length && PDF_AMOUNT.test(tokens[tokens.length - 1]) && amounts.length < 2) amounts.unshift(tokens.pop()!)
    if (!amounts.length) return
    let rest = tokens.join(' ')

    const dm = LINE_DATE.exec(rest + ' ')
    let date = dm ? parseStatementDate(dm[1], ref) : undefined
    if (dm && date) rest = rest.slice(dm[0].length)
    // Número de comprobante y marcas sueltas ("004512 K", "123456 *")
    rest = rest.replace(/^\d{3,10}\s*(?:[*KkFfEe](?=\s))?\s*/, '').replace(/^\*\s*/, '')
    // Número de cupón al final ("CARREFOUR HIPER 1182")
    rest = rest.replace(/\s+\d{3,10}$/, '')

    let currency: StatementCurrency = 'ARS'
    // Los impuestos sobre compras en dólares (percepciones, IVA) se cobran en pesos aunque nombren "USD"
    if (USD_MARK.test(upper(rest)) && !CHARGE.test(upper(rest))) {
      currency = 'USD'
      // "USD 12,99" dentro de la descripción repite el monto original: se saca
      rest = rest.replace(/\b(USD|U\$S|US\$)\s*[\d.,]+/gi, ' ').replace(USD_MARK, ' ')
    }
    const signed = parseStatementAmount(amounts[amounts.length - 1])
    if (!Number.isFinite(signed) || signed === 0) return

    const { installment, rest: withoutInstallment } = extractInstallment(rest)
    const description = tidyDescription(withoutInstallment)
    if (!description) return
    const type = classify(description, signed)
    if (type === 'skip') {
      skipped++
      return
    }
    // Sin fecha solo se aceptan impuestos y cargos (suelen ir al final, sin fecha)
    const dateFromStatement = !date
    if (!date) {
      if (type !== 'cargo') return
      date = dates.closingDate ?? today
    }
    rows.push({ index: rows.length, date, dateFromStatement: dateFromStatement || undefined, description, amount: Math.abs(signed), currency, installment, type })
  })

  if (!rows.length && !skipped) {
    throw new StatementError('empty', 'No encontramos consumos en este archivo. ¿Es el resumen de la tarjeta?')
  }
  return { format: 'pdf', rows, skipped, ...dates, brand: detectBrand(fullText) }
}

/* ---------------- CSV ---------------- */

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20)
  let best = ','
  let bestScore = 0
  for (const d of [';', ',', '\t', '|']) {
    const counts = sample.map((l) => splitCSVLine(l, d).length - 1)
    const max = Math.max(0, ...counts)
    // Mejor el separador que da muchas columnas en muchas líneas
    const score = counts.filter((c) => c === max && c > 0).length * max
    if (score > bestScore) {
      best = d
      bestScore = score
    }
  }
  return best
}

function splitCSVLine(line: string, d: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === d) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

/** Separa un CSV en filas y celdas (con comillas, "" escapadas y saltos de línea dentro de comillas). */
export function parseCSV(text: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const d = detectDelimiter(clean)
  const rows: string[][] = []
  let buffer = ''
  for (const line of clean.split(/\r?\n/)) {
    buffer = buffer ? `${buffer}\n${line}` : line
    // Comillas sin cerrar: la fila sigue en la próxima línea
    if ((buffer.match(/"/g)?.length ?? 0) % 2 === 1) continue
    if (buffer.trim()) rows.push(splitCSVLine(buffer, d))
    buffer = ''
  }
  if (buffer.trim()) rows.push(splitCSVLine(buffer, d))
  return rows
}

interface Columns {
  date: number
  description: number
  installment: number
  ars: number
  usd: number
  amount: number
  currency: number
}

function findColumns(header: string[]): Columns | undefined {
  const h = header.map((c) => upper(c).trim())
  const find = (re: RegExp, not?: RegExp) => h.findIndex((c) => re.test(c) && !(not && not.test(c)))
  const cols: Columns = {
    date: find(/FECHA/, /CIERRE|VENC/),
    description: find(/DESCRIP|DETALLE|COMERCIO|CONCEPTO|ESTABLEC|MOVIMIENTO|REFERENCIA/),
    installment: find(/CUOTA/, /IMPORTE|MONTO/),
    usd: find(/DOLAR|USD|U\$S|US\$/),
    ars: find(/PESOS|\bARS\b|\$/, /DOLAR|USD|U\$S|US\$/),
    amount: find(/IMPORTE|MONTO|VALOR/, /DOLAR|USD|U\$S|US\$|PESOS|\bARS\b/),
    currency: find(/^MONEDA$/),
  }
  if (cols.date < 0 || (cols.ars < 0 && cols.usd < 0 && cols.amount < 0)) return undefined
  return cols
}

/**
 * Lee el CSV que exporta el home banking. Reconoce las columnas por el encabezado
 * (Fecha, Descripción/Comercio/Detalle, Cuota, Pesos/Importe, Dólares, Moneda).
 */
export function parseStatementCSV(text: string, today: ISODate): ParsedStatement {
  const table = parseCSV(text)
  if (!table.length) throw new StatementError('empty', 'El archivo está vacío.')
  const headerAt = table.findIndex((r) => findColumns(r))
  if (headerAt < 0) {
    throw new StatementError('unsupported', 'No reconocimos las columnas de este CSV. Tiene que tener al menos una columna de fecha y una de importe.')
  }
  const cols = findColumns(table[headerAt])!
  const preamble = table.slice(0, headerAt).map((r) => r.filter(Boolean).join(' '))
  const dates = detectStatementDates(preamble, today)
  const ref = dates.closingDate ?? today
  const rows: StatementRow[] = []
  let skipped = 0
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')

  for (const r of table.slice(headerAt + 1)) {
    let description = cell(r, cols.description)
    const ars = cell(r, cols.ars) || (cols.currency >= 0 && !/USD|DOL|U\$S/i.test(cell(r, cols.currency)) ? cell(r, cols.amount) : cols.currency < 0 ? cell(r, cols.amount) : '')
    const usd = cell(r, cols.usd) || (cols.currency >= 0 && /USD|DOL|U\$S/i.test(cell(r, cols.currency)) ? cell(r, cols.amount) : '')
    const arsN = parseStatementAmount(ars)
    const usdN = parseStatementAmount(usd)
    let signed: number
    let currency: StatementCurrency
    if (Number.isFinite(arsN) && arsN !== 0) {
      signed = arsN
      currency = 'ARS'
    } else if (Number.isFinite(usdN) && usdN !== 0) {
      signed = usdN
      currency = 'USD'
    } else continue

    let installment = parseInstallmentCell(cell(r, cols.installment))
    const fromDesc = extractInstallment(description)
    installment ??= fromDesc.installment
    description = tidyDescription(fromDesc.rest)
    const type = classify(description, signed)
    if (type === 'skip') {
      skipped++
      continue
    }
    let date = parseStatementDate(cell(r, cols.date), ref)
    const dateFromStatement = !date
    if (!date) {
      if (type !== 'cargo') continue
      date = dates.closingDate ?? today
    }
    if (!description) description = type === 'cargo' ? 'Cargo de la tarjeta' : 'Consumo con tarjeta'
    rows.push({ index: rows.length, date, dateFromStatement: dateFromStatement || undefined, description, amount: Math.abs(signed), currency, installment, type })
  }
  if (!rows.length && !skipped) throw new StatementError('empty', 'No encontramos consumos en este CSV.')
  return { format: 'csv', rows, skipped, ...dates, brand: detectBrand(text) }
}
