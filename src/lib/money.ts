export type Currency = 'ARS' | 'USD'

const arsFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0, minimumFractionDigits: 0 })
const usdFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', currencyDisplay: 'code', maximumFractionDigits: 0, minimumFractionDigits: 0 })
const usdSmallFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', currencyDisplay: 'code', maximumFractionDigits: 2, minimumFractionDigits: 2 })
const numFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

/** "$ 12.500" — formato argentino, sin decimales. */
export function formatARS(amount: number): string {
  return arsFmt.format(Math.round(amount))
}

export function formatUSD(amount: number): string {
  return Math.abs(amount) < 100 ? usdSmallFmt.format(amount) : usdFmt.format(amount)
}

export function formatMoney(amountARS: number, currency: Currency, rate?: number | null): string {
  if (currency === 'USD' && rate && rate > 0) return formatUSD(amountARS / rate)
  return formatARS(amountARS)
}

export function formatNumber(n: number): string {
  return numFmt.format(n)
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

/**
 * Convierte lo que escribe el usuario a número: acepta "12.500", "12500", "12.500,50", "12500.5".
 * Devuelve NaN si no es un número válido.
 */
export function parseAmount(input: string): number {
  const s = input.replace(/[$\s]/g, '').trim()
  if (!s) return NaN
  let normalized: string
  if (s.includes(',')) {
    normalized = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, '')
  } else {
    normalized = s
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN
  return Number(normalized)
}

/** Redondea a centavos. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
