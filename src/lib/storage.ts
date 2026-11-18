import type { AppData } from './types'

/**
 * Capa de datos. En la Fase 1 todo vive en el navegador (localStorage).
 * En la Fase 2 se agrega una implementación con Supabase que cumple la misma interfaz,
 * y la demo sigue usando esta.
 */
export interface DataStore {
  load(): AppData | null
  save(data: AppData): void
  clear(): void
}

const KEY = 'bolsillo:data:v1'

export const localStore: DataStore = {
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return null
      const data = JSON.parse(raw) as AppData
      if (data?.version !== 1 || !Array.isArray(data.movements) || !Array.isArray(data.recurring)) return null
      return data
    } catch {
      return null
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* almacenamiento lleno o bloqueado: la sesión sigue funcionando en memoria */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nada que limpiar */
    }
  },
}
