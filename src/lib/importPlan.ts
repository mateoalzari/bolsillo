import { firstPaymentDate } from './cards'
import { addMonths, dateInMonth, dayOf, daysBetween, monthOf } from './dates'
import { installmentCount } from './ledger'
import { round2 } from './money'
import { stripAccents, type StatementRow } from './statement'
import type { CreditCard, ISODate, Movement } from './types'

/**
 * Del resumen leído a movimientos de Bolsillo: categoría sugerida, duplicados y armado de la compra.
 * Una línea "C.03/06" se guarda como UNA compra de 6 cuotas (total = cuota × 6), igual que si se cargara a mano,
 * con el primer pago ubicado para que la cuota 3 caiga en el vencimiento de este resumen.
 */

const KEYWORDS: [string, RegExp][] = [
  ['super', /\b(SUPERMERCADO|SUPER\b|COTO|CARREFOUR|JUMBO|DISCO|VEA\b|DIA\b|DIA %|CHANGOMAS|CHANGO MAS|LA ANONIMA|MAKRO|VITAL|YAGUAR|MAXICONSUMO|DIARCO|AUTOSERVICIO|ALMACEN|VERDULERIA|CARNICERIA|FIAMBRERIA|DIETETICA)/],
  ['comida', /\b(RAPPI|PEDIDOSYA|PEDIDOS YA|MCDONALD|BURGER|MOSTAZA|STARBUCKS|HAVANNA|CAFE|BAR\b|RESTO|RESTAURANT|PARRILLA|PIZZ|SUSHI|HELAD|GRIDO|FREDDO|PANADERIA|CONFITERIA|DELIVERY|FOOD|KFC|SUBWAY)/],
  ['transporte', /\b(YPF|SHELL|AXION|PUMA ENERGY|GULF|UBER|CABIFY|DIDI|SUBE|PEAJE|AUTOPISTA|AUSA|ESTACIONAMIENTO|PARKING|AEROLINEAS|FLYBONDI|JETSMART|LATAM|DESPEGAR|TREN|COLECTIVO|NAFTA|COMBUSTIBLE)/],
  ['servicios', /\b(NETFLIX|SPOTIFY|DISNEY|HBO|\bMAX\b|PRIME VIDEO|AMAZON PRIME|YOUTUBE|PARAMOUNT|STAR\+|APPLE\.COM|ICLOUD|GOOGLE|MICROSOFT|OPENAI|CHATGPT|CLAUDE|ANTHROPIC|PERSONAL|MOVISTAR|CLARO|TELECENTRO|FIBERTEL|FLOW|DIRECTV|EDENOR|EDESUR|METROGAS|NATURGY|AYSA|ABL|TELECOM|IPLAN)/],
  ['salud', /\b(FARMACIA|FARMACITY|FARMA|OSDE|SWISS MEDICAL|GALENO|MEDICUS|OMINT|SANCOR SALUD|ODONTO|CLINICA|SANATORIO|LABORATORIO|OPTICA|HOSPITAL|MEDIC)/],
  ['ocio', /\b(CINE|HOYTS|CINEMARK|SHOWCASE|TICKETEK|TICKETPORTAL|ALLACCESS|ENTRADA|TEATRO|STEAM|PLAYSTATION|XBOX|NINTENDO|EPIC GAMES|BOLICHE|SPA\b|GIMNASIO|GYM|MEGATLON|SPORTCLUB|TURISMO|HOTEL|AIRBNB|BOOKING)/],
  ['educacion', /\b(UDEMY|COURSERA|PLATZI|DOMESTIKA|DUOLINGO|LIBRERIA|CUSPIDE|YENNY|EL ATENEO|UNIVERSIDAD|COLEGIO|INSTITUTO|ESCUELA|CURSO)/],
  ['casa', /\b(EASY|SODIMAC|BLAISTEN|EXPENSAS|PINTURERIA|FERRETERIA|HOMECENTER|MUEBLE|COLCHON|BAZAR|ALQUILER|INMOBILIARIA)/],
  ['compras', /\b(MERCADOLIBRE|MERCADO LIBRE|MERPAGO|MERCADOPAGO|FRAVEGA|GARBARINO|MUSIMUNDO|ON CITY|CETROGAR|NALDO|ZARA|H&M|ADIDAS|NIKE|PUMA\b|DEXTER|GRID|OPEN SPORTS|FALABELLA|SHEIN|TEMU|AMAZON|AliExpress|TIENDA|SHOPPING|OUTLET|INDUMENTARIA|CALZADO|JOYERIA|PERFUMERIA)/i],
]

/** Clave para comparar descripciones: sin acentos ni signos, las dos primeras palabras. */
export function descriptionKey(s: string): string {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .join(' ')
}

/**
 * Sugiere la categoría: primero la que ya usaste para un comercio parecido; si no, por palabras clave.
 * Impuestos y cargos van a "Otros gastos"; devoluciones a "Otros ingresos".
 */
export function guessCategory(row: Pick<StatementRow, 'description' | 'type'>, history: Movement[]): string {
  if (row.type === 'devolucion') return 'otros-ingresos'
  if (row.type === 'cargo') return 'otros'
  const key = descriptionKey(row.description)
  if (key) {
    // El más reciente gana
    const match = [...history].sort((a, b) => b.date.localeCompare(a.date)).find((m) => m.kind === 'gasto' && descriptionKey(m.description) === key)
    if (match) return match.category
  }
  const d = stripAccents(row.description).toUpperCase()
  for (const [cat, re] of KEYWORDS) if (re.test(d)) return cat
  return 'otros'
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.01)

/**
 * ¿Ya está cargado? Busca un gasto con la misma fecha de compra (±3 días) y el mismo monto:
 * en cuotas, la misma cantidad de cuotas y el mismo valor de cuota (así una compra importada el mes pasado
 * como "C.02/06" se reconoce cuando llega la "C.03/06").
 */
export function findDuplicate(row: StatementRow, movements: Movement[]): Movement | undefined {
  if (row.type === 'devolucion') {
    return movements.find((m) => m.kind === 'ingreso' && Math.abs(daysBetween(m.date, row.date)) <= 3 && close(m.amount, row.amount))
  }
  const n = row.installment?.total ?? 1
  return movements.find((m) => {
    if (m.kind !== 'gasto' || Math.abs(daysBetween(m.date, row.date)) > 3) return false
    const mn = installmentCount(m)
    if (mn !== n) return false
    return n === 1 ? close(m.amount, row.amount) : close(m.amount / mn, row.amount)
  })
}

/**
 * Fecha del primer pago para que la cuota k de la línea caiga en el vencimiento de este resumen.
 * Sin vencimiento conocido se usa el de la tarjeta (o la fecha de compra si no hay tarjeta).
 */
export function paymentStartFor(row: StatementRow, dueDate: ISODate | undefined, card: CreditCard | undefined): ISODate | undefined {
  const k = row.installment?.number ?? 1
  const due = dueDate ?? (card ? firstPaymentDate(row.date, card) : undefined)
  if (!due) return undefined
  return dateInMonth(addMonths(monthOf(due), -(k - 1)), dayOf(due))
}

export interface RowChoice {
  category: string
  /** '' = sin tarjeta */
  cardId: string
}

/** Arma el movimiento a guardar para una línea elegida. */
export function rowToMovement(row: StatementRow, choice: RowChoice, dueDate: ISODate | undefined, cards: CreditCard[]): Omit<Movement, 'id'> {
  const card = cards.find((c) => c.id === choice.cardId)
  if (row.type === 'devolucion') {
    // La devolución descuenta del resumen: se registra como ingreso el día del vencimiento
    return {
      kind: 'ingreso',
      amount: round2(row.amount),
      category: choice.category,
      date: dueDate ?? row.date,
      description: row.description,
      method: 'transferencia',
    }
  }
  const n = row.installment?.total ?? 1
  const movement: Omit<Movement, 'id'> = {
    kind: 'gasto',
    amount: round2(row.amount * n),
    category: choice.category,
    date: row.date,
    description: row.description,
    method: 'credito',
  }
  if (n > 1) movement.installments = n
  if (card) movement.cardId = card.id
  const start = paymentStartFor(row, dueDate, card)
  if (start) movement.paymentStart = start
  return movement
}

/** Elige la tarjeta más probable: la que en su nombre dice la marca del resumen; si hay una sola, esa. */
export function suggestCard(cards: CreditCard[], brand: string | undefined): string {
  if (!cards.length) return ''
  if (brand) {
    const words = brand === 'mastercard' ? /master/i : brand === 'amex' ? /amex|american/i : /visa/i
    const match = cards.find((c) => words.test(c.name))
    if (match) return match.id
  }
  return cards.length === 1 ? cards[0].id : ''
}
