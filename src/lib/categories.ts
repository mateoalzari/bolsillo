import type { IconName } from '../components/Icon'
import type { Kind, PaymentMethod } from './types'

export interface Category {
  id: string
  label: string
  kind: Kind
  /** Variable CSS del color de la categoría (definido en tokens.css para cada tema). */
  color: string
  icon: IconName
}

export const CATEGORIES: Category[] = [
  { id: 'super', icon: 'cart', label: 'Supermercado', kind: 'gasto', color: 'var(--cat-1)' },
  { id: 'comida', icon: 'fork', label: 'Comida afuera', kind: 'gasto', color: 'var(--cat-2)' },
  { id: 'casa', icon: 'home', label: 'Alquiler y casa', kind: 'gasto', color: 'var(--cat-3)' },
  { id: 'servicios', icon: 'bolt', label: 'Servicios', kind: 'gasto', color: 'var(--cat-4)' },
  { id: 'transporte', icon: 'bus', label: 'Transporte', kind: 'gasto', color: 'var(--cat-5)' },
  { id: 'salud', icon: 'heart', label: 'Salud', kind: 'gasto', color: 'var(--cat-6)' },
  { id: 'ocio', icon: 'ticket', label: 'Salidas y ocio', kind: 'gasto', color: 'var(--cat-7)' },
  { id: 'compras', icon: 'bag', label: 'Compras', kind: 'gasto', color: 'var(--cat-8)' },
  { id: 'educacion', icon: 'book', label: 'Educación', kind: 'gasto', color: 'var(--cat-9)' },
  { id: 'otros', icon: 'dots', label: 'Otros gastos', kind: 'gasto', color: 'var(--cat-10)' },
  { id: 'sueldo', icon: 'wallet', label: 'Sueldo', kind: 'ingreso', color: 'var(--cat-in-1)' },
  { id: 'extra', icon: 'sparkle', label: 'Trabajos extra', kind: 'ingreso', color: 'var(--cat-in-2)' },
  { id: 'otros-ingresos', icon: 'coins', label: 'Otros ingresos', kind: 'ingreso', color: 'var(--cat-in-3)' },
]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: string): Category {
  return byId.get(id) ?? { id, label: id, kind: 'gasto', color: 'var(--cat-10)', icon: 'dots' }
}

export function categoriesFor(kind: Kind): Category[] {
  return CATEGORIES.filter((c) => c.kind === kind)
}

export const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'debito', label: 'Débito' },
  { id: 'credito', label: 'Crédito' },
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
]

export function methodLabel(m: PaymentMethod): string {
  return METHODS.find((x) => x.id === m)?.label ?? m
}
