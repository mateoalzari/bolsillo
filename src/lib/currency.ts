/** Monedas principales que puede elegir un usuario (mismas que acepta la tabla profiles). */
export type CurrencyCode = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'CLP' | 'UYU'

export const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: 'ARS', label: 'Peso argentino (ARS)' },
  { code: 'USD', label: 'Dólar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'BRL', label: 'Real (BRL)' },
  { code: 'CLP', label: 'Peso chileno (CLP)' },
  { code: 'UYU', label: 'Peso uruguayo (UYU)' },
]

export function isCurrency(v: unknown): v is CurrencyCode {
  return typeof v === 'string' && CURRENCIES.some((c) => c.code === v)
}

/**
 * Cómo se puede ver la app: en la moneda principal ("base") o convertida a otra.
 * USD_BLUE es el dólar blue; USD es el oficial.
 */
export type ViewCurrency = 'base' | CurrencyCode | 'USD_BLUE'

/** Pesos argentinos por unidad de cada moneda. ARS = 1. */
export type Rates = Partial<Record<Exclude<ViewCurrency, 'base'>, number>>

const formatters = new Map<string, Intl.NumberFormat>()

function fmt(code: CurrencyCode, decimals: number): Intl.NumberFormat {
  const key = `${code}:${decimals}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: code,
      currencyDisplay: code === 'ARS' ? 'narrowSymbol' : 'symbol',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    formatters.set(key, f)
  }
  return f
}

/** Monedas "fuertes": con montos chicos se muestran centavos. */
const HARD: CurrencyCode[] = ['USD', 'EUR', 'BRL']

export function formatIn(amount: number, code: CurrencyCode): string {
  const decimals = HARD.includes(code) && Math.abs(amount) < 100 ? 2 : 0
  return fmt(code, decimals).format(decimals ? amount : Math.round(amount))
}

/** Símbolo corto para prefijar inputs: "$", "US$", "€", "R$"… */
export function currencySymbol(code: CurrencyCode): string {
  return fmt(code, 0)
    .formatToParts(0)
    .find((p) => p.type === 'currency')!.value
}

/** Pesos por unidad de una moneda (ARS = 1). undefined si falta la cotización. */
export function arsPer(code: Exclude<ViewCurrency, 'base'>, rates: Rates): number | undefined {
  if (code === 'ARS') return 1
  return rates[code]
}

/** Convierte un monto de la moneda principal a la moneda de vista. null si falta alguna cotización. */
export function convert(amount: number, base: CurrencyCode, view: Exclude<ViewCurrency, 'base'>, rates: Rates): number | null {
  if (view === base) return amount
  const from = arsPer(base, rates)
  const to = arsPer(view, rates)
  if (!from || !to) return null
  return (amount * from) / to
}

/** Código de moneda que se muestra para una vista (el blue se muestra como USD). */
export function displayCode(view: Exclude<ViewCurrency, 'base'>): CurrencyCode {
  return view === 'USD_BLUE' ? 'USD' : view
}

export function viewLabel(view: ViewCurrency, base: CurrencyCode): string {
  if (view === 'base') return CURRENCIES.find((c) => c.code === base)?.label.replace(/ \(.*\)$/, '') ?? base
  if (view === 'USD') return 'US$ oficial'
  if (view === 'USD_BLUE') return 'US$ blue'
  return CURRENCIES.find((c) => c.code === view)?.label.replace(/ \(.*\)$/, '') ?? view
}

/** Opciones de vista disponibles según la moneda principal. */
export function viewOptions(base: CurrencyCode): ViewCurrency[] {
  const all: ViewCurrency[] = ['ARS', 'USD', 'USD_BLUE', 'EUR', 'BRL']
  return ['base', ...all.filter((v) => v !== base)]
}
