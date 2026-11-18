export type DolarKind = 'oficial' | 'blue'

export interface DolarRate {
  kind: DolarKind
  /** Precio de venta en pesos */
  sell: number
  updatedAt: string
  /** true si viene de la última cotización guardada, no de la API en este momento */
  cached: boolean
}

const CACHE_KEY = 'bolsillo:dolar'
const API = 'https://dolarapi.com/v1/dolares'

interface ApiResponse {
  venta: number
  fechaActualizacion: string
}

function readCache(): Partial<Record<DolarKind, DolarRate>> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeCache(rate: DolarRate) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), [rate.kind]: rate }))
  } catch {
    /* sin almacenamiento: seguimos sin caché */
  }
}

/**
 * Cotización del día desde dolarapi.com. Si la API falla, devuelve la última cotización guardada;
 * si nunca hubo una, devuelve null y la app sigue en pesos.
 */
export async function fetchDolar(kind: DolarKind, signal?: AbortSignal): Promise<DolarRate | null> {
  try {
    const res = await fetch(`${API}/${kind}`, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as ApiResponse
    if (typeof data.venta !== 'number' || data.venta <= 0) throw new Error('Respuesta inválida')
    const rate: DolarRate = { kind, sell: data.venta, updatedAt: data.fechaActualizacion, cached: false }
    writeCache(rate)
    return rate
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    const cached = readCache()[kind]
    return cached ? { ...cached, cached: true } : null
  }
}
