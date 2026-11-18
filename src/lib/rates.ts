import type { Rates } from './currency'

export interface RatesResult {
  rates: Rates
  updatedAt: string | null
  /** true si al menos una cotización viene de la última guardada (la API no respondió). */
  cached: boolean
}

const CACHE_KEY = 'bolsillo:rates:v2'
const API = 'https://dolarapi.com/v1'

interface Quote {
  moneda: string
  casa?: string
  venta: number
  fechaActualizacion: string
}

function readCache(): RatesResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as RatesResult) : null
  } catch {
    return null
  }
}

function writeCache(r: RatesResult) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(r))
  } catch {
    /* sin almacenamiento */
  }
}

const valid = (n: unknown): n is number => typeof n === 'number' && n > 0 && Number.isFinite(n)

/**
 * Cotizaciones del día en pesos argentinos desde dolarapi.com:
 * dólar oficial, euro, real, peso chileno y uruguayo (/cotizaciones) y dólar blue (/dolares/blue).
 * Si la API falla, completa con la última cotización guardada. Si nunca hubo una, devuelve rates vacío
 * y la app sigue en la moneda principal.
 */
export async function fetchRates(signal?: AbortSignal): Promise<RatesResult> {
  const [all, blue] = await Promise.allSettled([
    fetch(`${API}/cotizaciones`, { signal }).then((r) => (r.ok ? (r.json() as Promise<Quote[]>) : Promise.reject(new Error(`HTTP ${r.status}`)))),
    fetch(`${API}/dolares/blue`, { signal }).then((r) => (r.ok ? (r.json() as Promise<Quote>) : Promise.reject(new Error(`HTTP ${r.status}`)))),
  ])
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const fresh: Rates = {}
  let updatedAt: string | null = null
  if (all.status === 'fulfilled' && Array.isArray(all.value)) {
    for (const q of all.value) {
      if (['USD', 'EUR', 'BRL', 'CLP', 'UYU'].includes(q.moneda) && valid(q.venta)) {
        fresh[q.moneda as 'USD'] = q.venta
        updatedAt = q.fechaActualizacion ?? updatedAt
      }
    }
  }
  if (blue.status === 'fulfilled' && valid(blue.value?.venta)) {
    fresh.USD_BLUE = blue.value.venta
    updatedAt = updatedAt ?? blue.value.fechaActualizacion
  }

  const cache = readCache()
  const complete = Object.keys(fresh).length === 6
  const rates: Rates = { ...(cache?.rates ?? {}), ...fresh }
  const result: RatesResult = { rates, updatedAt: updatedAt ?? cache?.updatedAt ?? null, cached: !complete && Object.keys(rates).length > Object.keys(fresh).length }
  if (Object.keys(fresh).length) writeCache({ rates, updatedAt: result.updatedAt, cached: false })
  return result
}
