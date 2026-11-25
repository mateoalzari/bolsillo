import { StatementError } from './statement'

/**
 * Convierte un PDF con texto (no escaneado) en líneas, como se leen en pantalla.
 * pdf.js devuelve pedacitos de texto con su posición; acá se agrupan por renglón (misma altura)
 * y se ordenan de izquierda a derecha. Las columnas separadas quedan con dos espacios.
 */

export interface TextPiece {
  str: string
  /** Matriz de transformación de pdf.js: [a, b, c, d, x, y] */
  transform: number[]
  width: number
  height?: number
}

/** Agrupa los pedazos de texto de UNA página en líneas, de arriba hacia abajo. */
export function piecesToLines(pieces: TextPiece[]): string[] {
  const items = pieces
    .filter((p) => p.str.trim())
    .map((p) => ({ str: p.str, x: p.transform[4], y: p.transform[5], w: p.width, size: Math.abs(p.transform[3]) || p.height || 10 }))
  // De arriba hacia abajo (en PDF, y crece hacia arriba)
  items.sort((a, b) => b.y - a.y || a.x - b.x)
  const rows: (typeof items)[] = []
  for (const it of items) {
    const row = rows[rows.length - 1]
    // Mismo renglón si la altura difiere menos que la mitad del tamaño de letra
    if (row && Math.abs(row[0].y - it.y) <= Math.max(2, it.size * 0.5)) row.push(it)
    else rows.push([it])
  }
  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x)
    let line = ''
    let end = -Infinity
    for (const it of row) {
      const gap = it.x - end
      if (line) line += gap > it.size * 1.2 ? '  ' : gap > it.size * 0.15 ? ' ' : ''
      line += it.str
      end = it.x + it.w
    }
    return line.replace(/[ \t]+$/g, '')
  })
}

/** Lo mínimo de pdf.js que usamos (así los tests pueden pasar la versión para Node). */
export interface PdfLib {
  getDocument: (src: { data: Uint8Array; password?: string; isEvalSupported?: boolean; useSystemFonts?: boolean }) => {
    promise: Promise<{
      numPages: number
      getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }>
    }>
    destroy?: () => Promise<void>
  }
}

const MAX_PAGES = 30

/** Lee todas las líneas de texto de un PDF. Lanza StatementError si tiene contraseña o no tiene texto. */
export async function readPdfLines(lib: PdfLib, data: Uint8Array, password?: string): Promise<string[]> {
  // pdf.js se queda con el buffer: se pasa una copia para poder reintentar con contraseña
  const task = lib.getDocument({ data: data.slice(), password, isEvalSupported: false })
  let doc
  try {
    doc = await task.promise
  } catch (e) {
    const err = e as { name?: string; code?: number }
    if (err?.name === 'PasswordException') {
      throw err.code === 2
        ? new StatementError('password-wrong', 'La contraseña no es correcta.')
        : new StatementError('password-needed', 'Este PDF tiene contraseña.')
    }
    throw new StatementError('unreadable', 'No pudimos abrir este PDF. ¿Está completo y es un PDF de verdad?')
  }
  try {
    const lines: string[] = []
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      const pieces = content.items.filter((i): i is TextPiece => typeof (i as TextPiece).str === 'string' && Array.isArray((i as TextPiece).transform))
      lines.push(...piecesToLines(pieces))
    }
    const letters = lines.join('').replace(/\s/g, '').length
    if (letters < 40) {
      throw new StatementError('scanned', 'Este PDF no tiene texto (parece una foto o un escaneo). Descargá el resumen original desde el home banking, o usá el CSV.')
    }
    return lines
  } finally {
    void task.destroy?.()
  }
}
