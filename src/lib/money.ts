const formatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** 12500 → "$ 12.500" */
export function formatARS(amount: number): string {
  const sign = amount < 0 ? '−' : '';
  return `${sign}$ ${formatter.format(Math.abs(Math.round(amount)))}`;
}

/**
 * Interpreta lo que escribe la persona: "12.500", "12500", "$ 12.500", "12500,60".
 * Devuelve pesos enteros (redondeados) o null si no es un monto válido.
 */
export function parseAmount(input: string): number | null {
  const clean = input.replace(/[$\s]/g, '');
  if (!/^\d[\d.]*(,\d{1,2})?$/.test(clean)) return null;
  const [intPart, decPart = '0'] = clean.split(',');
  const value = Number(intPart.replace(/\./g, '')) + Number(`0.${decPart}`);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/** Formatea lo que se va tipeando con separador de miles: "12500" → "12.500". */
export function formatAmountInput(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  return formatter.format(Number(digits));
}
