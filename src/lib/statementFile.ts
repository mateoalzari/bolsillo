import { readPdfLines, type PdfLib } from './pdfText'
import { parseStatementCSV, parseStatementText, StatementError, type ParsedStatement } from './statement'
import type { ISODate } from './types'

export const MAX_FILE_BYTES = 10 * 1024 * 1024

/** Texto de un CSV: UTF-8 si es válido; si no, Windows-1252 (lo que suele guardar Excel en español). */
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

export type FileKind = 'pdf' | 'csv' | 'excel' | 'other'

export function fileKind(name: string, bytes: Uint8Array): FileKind {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf' // %PDF
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (ext === 'xls' || ext === 'xlsx' || (bytes[0] === 0x50 && bytes[1] === 0x4b)) return 'excel'
  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') return 'csv'
  return 'other'
}

/**
 * Lee un resumen (PDF o CSV) y devuelve los consumos. `loadPdf` carga pdf.js solo si hace falta.
 * Lanza StatementError con un mensaje para mostrar.
 */
export async function readStatementFile(
  name: string,
  bytes: Uint8Array,
  today: ISODate,
  loadPdf: () => Promise<PdfLib>,
  password?: string,
): Promise<ParsedStatement> {
  if (bytes.length > MAX_FILE_BYTES) throw new StatementError('unsupported', 'El archivo pesa más de 10\u00a0MB. Un resumen suele pesar menos de 1\u00a0MB: ¿es el archivo correcto?')
  if (!bytes.length) throw new StatementError('empty', 'El archivo está vacío.')
  const kind = fileKind(name, bytes)
  if (kind === 'excel') throw new StatementError('unsupported', 'Es un archivo de Excel. Abrilo y guardalo como CSV (Archivo → Guardar como → CSV), o descargá el resumen en PDF.')
  if (kind === 'other') throw new StatementError('unsupported', 'Elegí el resumen en PDF o en CSV.')
  if (kind === 'csv') return parseStatementCSV(decodeText(bytes), today)
  let lib: PdfLib
  try {
    lib = await loadPdf()
  } catch {
    throw new StatementError('unreadable', 'No pudimos cargar el lector de PDF. Revisá tu conexión y probá de nuevo.')
  }
  return parseStatementText(await readPdfLines(lib, bytes, password), today)
}
