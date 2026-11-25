import type { PdfLib } from './pdfText'

/**
 * Carga pdf.js recién cuando se elige un PDF (pesa ~400 kB y la mayoría de las visitas no lo necesitan).
 * El "worker" lee el PDF en segundo plano para no trabar la pantalla.
 */
export async function loadPdfLib(): Promise<PdfLib> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs as unknown as PdfLib
}
