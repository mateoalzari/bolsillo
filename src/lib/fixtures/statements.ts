/**
 * Resúmenes de ejemplo INVENTADOS para los tests: imitan el formato de los resúmenes de Visa y Mastercard
 * de bancos argentinos, pero los bancos, comercios, números y montos son ficticios.
 */

/** Resumen Visa en PDF (como lo imprime un banco tipo "Banco del Plata"): rótulos arriba y fechas abajo. */
export const VISA_PDF_LINES: [x: number, text: string][][] = [
  [[40, 'BANCO DEL PLATA S.A.'], [400, 'VISA']],
  [[40, 'RESUMEN DE CUENTA - TARJETA VISA'], [400, 'Cuenta 0000 1234 5678']],
  [[40, 'CIERRE ACTUAL'], [160, 'VENCIMIENTO ACTUAL'], [320, 'PROXIMO CIERRE'], [440, 'PROXIMO VTO.']],
  [[40, '26 Nov 26'], [160, '05 Dic 26'], [320, '24 Dic 26'], [440, '05 Ene 27']],
  [[40, 'SALDO ANTERIOR'], [480, '310.000,00']],
  [[40, '29 Oct 26'], [100, 'SU PAGO EN PESOS'], [480, '310.000,00-']],
  [[40, 'FECHA'], [100, 'COMPROBANTE'], [180, 'DETALLE DE TRANSACCION'], [420, 'PESOS'], [490, 'DOLARES']],
  [[40, '12 Jun 26'], [100, '004512 *'], [180, 'MERPAGO*TIENDADELSOL'], [330, 'C.06/06'], [420, '18.333,33']],
  [[40, '05 Sep 26'], [100, '123456 *'], [180, 'FRAVEGA ONLINE'], [330, 'C.03/12'], [420, '41.250,00']],
  [[40, '28 Oct 26'], [100, '778811 K'], [180, 'SUPERMERCADO COTO SUC 45'], [420, '45.320,50']],
  [[40, '02 Nov 26'], [100, '552190 *'], [180, 'YPF SERVICLUB'], [420, '38.900,00']],
  [[40, '10 Nov 26'], [100, '000317 *'], [180, 'NETFLIX.COM'], [330, 'USD 12,99'], [490, '12,99']],
  [[40, '14 Nov 26'], [100, '661204 *'], [180, 'PEDIDOSYA*BURGERS'], [420, '15.780,00']],
  [[40, '18 Nov 26'], [100, '661299 *'], [180, 'DEVOLUCION COMPRA FRAVEGA'], [420, '5.000,00-']],
  [[40, '20 Nov 26'], [100, '701010 *'], [180, 'FARMACITY 123'], [420, '9.870,40']],
  [[180, 'DB.RG 5617 30% ( 12,99 )'], [420, '4.677,00']],
  [[180, 'IMPUESTO DE SELLOS'], [420, '1.234,56']],
  [[180, 'IVA RG 4240 21%'], [420, '320,15']],
  [[40, 'SALDO ACTUAL'], [420, '179.102,94'], [490, '12,99']],
  [[40, 'PAGO MINIMO'], [420, '25.000,00']],
]

/** Resumen Mastercard en PDF (tipo "Banco Pampa"): fechas con barra y "Cuota 3 de 6". */
export const MASTERCARD_PDF_LINES: [x: number, text: string][][] = [
  [[40, 'Banco Pampa'], [380, 'Mastercard Black']],
  [[40, 'Estado de cuenta al: 24/11/2026']],
  [[40, 'Cierre actual: 24/11/2026'], [300, 'Vencimiento actual: 04/12/2026']],
  [[40, 'Próximo cierre: 22/12/2026'], [300, 'Próximo vencimiento: 05/01/2027']],
  [[40, 'Fecha'], [110, 'Descripción'], [330, 'Nro. Cupón'], [420, 'Pesos'], [490, 'Dólares']],
  [[40, '15/08/2026'], [110, 'SAMSUNG STORE Cuota 4 de 6'], [330, '0091'], [420, '52.500,00']],
  [[40, '30/10/2026'], [110, 'CARREFOUR HIPER 112'], [330, '1182'], [420, '62.104,90']],
  [[40, '03/11/2026'], [110, 'SPOTIFY USD'], [330, '1190'], [490, '4,99']],
  [[40, '09/11/2026'], [110, 'CABIFY VIAJE'], [330, '1201'], [420, '7.420,00']],
  [[40, '21/11/2026'], [110, 'HOYTS ABASTO'], [330, '1240'], [420, '18.000,00']],
  [[40, '22/11/2026'], [110, 'Pago recibido - gracias'], [420, '-150.000,00']],
  [[110, 'Intereses de financiación'], [420, '2.310,77']],
  [[40, 'Total consumos del período'], [420, '142.335,67']],
]

/** Une las columnas de una línea como las devuelve el extractor (dos espacios entre columnas). */
export const asText = (doc: [number, string][][]) => doc.map((line) => line.map(([, t]) => t).join('  '))

/** CSV de Visa exportado del home banking (punto y coma, coma decimal, columna de cuota). */
export const VISA_CSV = `﻿Tarjeta;Visa Signature terminada en 5678
Fecha de cierre;26/11/2026
Fecha de vencimiento;05/12/2026

Fecha;Descripción;Cuota;Pesos;Dólares
12/06/2026;MERPAGO*TIENDADELSOL;06/06;18.333,33;
05/09/2026;FRAVEGA ONLINE;03/12;41.250,00;
28/10/2026;SUPERMERCADO COTO SUC 45;;45.320,50;
10/11/2026;NETFLIX.COM;;;12,99
14/11/2026;"PEDIDOSYA*BURGERS; COMBO";;15.780,00;
18/11/2026;DEVOLUCION COMPRA FRAVEGA;;-5.000,00;
29/10/2026;SU PAGO EN PESOS;;-310.000,00;
;IMPUESTO DE SELLOS;;1.234,56;
`

/** CSV de Mastercard (coma, comillas, importe con punto decimal y columna de moneda; cuotas en la descripción). */
export const MASTERCARD_CSV = `"Fecha","Comercio","Importe","Moneda"
"2026-08-15","SAMSUNG STORE Cuota 4 de 6","52500.00","ARS"
"2026-10-30","CARREFOUR HIPER 112","62104.90","ARS"
"2026-11-03","SPOTIFY","4.99","USD"
"2026-11-09","CABIFY VIAJE","7420.00","ARS"
"2026-11-21","HOYTS ABASTO","18000.00","ARS"
"2026-11-22","PAGO RECIBIDO","-150000.00","ARS"
`

/**
 * Arma un PDF de verdad (con texto, una página, letra Helvetica) a partir de líneas con posición x.
 * Sirve para probar la extracción con pdf.js sin guardar archivos binarios en el repo.
 */
export function buildPdf(lines: [number, string][][]): Uint8Array {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  let y = 800
  let stream = 'BT\n/F1 9 Tf\n'
  for (const line of lines) {
    for (const [x, text] of line) stream += `1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj\n`
    y -= 16
  }
  stream += 'ET'
  const streamBytes = latin1(stream)
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`,
  ]
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(latin1(out).length)
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = latin1(out).length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return latin1(out)
}

function latin1(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}
