import { formatARS } from './money';

export type Currency = 'ARS' | 'oficial' | 'blue';

export const CURRENCY_LABELS: Record<Currency, string> = {
  ARS: 'Pesos',
  oficial: 'Dólar oficial',
  blue: 'Dólar blue',
};

export interface Rates {
  /** Precio de venta, en pesos por dólar. */
  oficial: number;
  blue: number;
  /** Fecha ISO de la última actualización informada por la API. */
  updatedAt: string;
}

export const RATES_URL = 'https://dolarapi.com/v1/dolares';

/** Lee la respuesta de dolarapi.com (/v1/dolares). Devuelve null si no tiene lo que necesitamos. */
export function parseRates(json: unknown): Rates | null {
  if (!Array.isArray(json)) return null;
  const find = (casa: string) =>
    json.find((r) => r && typeof r === 'object' && (r as { casa?: unknown }).casa === casa) as
      | { venta?: unknown; fechaActualizacion?: unknown }
      | undefined;
  const oficial = find('oficial');
  const blue = find('blue');
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
  if (!ok(oficial?.venta) || !ok(blue?.venta)) return null;
  const dates = [oficial.fechaActualizacion, blue.fechaActualizacion].filter((d): d is string => typeof d === 'string');
  return { oficial: oficial.venta, blue: blue.venta, updatedAt: dates.sort()[dates.length - 1] ?? '' };
}

const usd = (digits: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * Formatea un monto en pesos en la moneda elegida, a la cotización del día.
 * Sin cotización, siempre en pesos.
 */
export function formatMoney(amountARS: number, currency: Currency, rates: Rates | null): string {
  if (currency === 'ARS' || !rates) return formatARS(amountARS);
  const value = amountARS / rates[currency];
  const abs = Math.abs(value);
  const text = usd(abs < 100 ? 2 : 0).format(abs);
  return `${value < 0 ? '−' : ''}US$ ${text}`;
}
