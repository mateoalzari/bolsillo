import { getCategory, methodLabel } from './categories'
import type { Entry } from './types'

/**
 * CSV pensado para abrir en Excel/Sheets en español: separador ";" y coma decimal,
 * con BOM para que respete los acentos.
 */
export function entriesToCSV(entries: Entry[]): string {
  const header = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Medio de pago', 'Cuota', 'Monto']
  const rows = entries.map((e) => [
    e.date.split('-').reverse().join('/'),
    e.kind === 'gasto' ? 'Gasto' : 'Ingreso',
    getCategory(e.category).label,
    e.description,
    methodLabel(e.method),
    e.installment ? `${e.installment.number}/${e.installment.total}` : '',
    (e.kind === 'gasto' ? -e.amount : e.amount).toFixed(2).replace('.', ','),
  ])
  return '﻿' + [header, ...rows].map((r) => r.map(escapeCell).join(';')).join('\r\n')
}

function escapeCell(value: string): string {
  // Evita inyección de fórmulas al abrir en Excel
  const safe = /^[=+\-@\t\r]/.test(value) && !/^-?\d+(,\d+)?$/.test(value) ? `'${value}` : value
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
