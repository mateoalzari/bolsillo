import { formatMoney, parseRates } from './currency';

const api = [
  { moneda: 'USD', casa: 'oficial', compra: 1520, venta: 1570, fechaActualizacion: '2026-11-04T18:00:00.000Z' },
  { moneda: 'USD', casa: 'blue', compra: 1540, venta: 1560, fechaActualizacion: '2026-11-04T20:55:00.000Z' },
  { moneda: 'USD', casa: 'bolsa', compra: 1575, venta: 1588 },
];

describe('cotización del dólar', () => {
  it('toma el precio de venta del oficial y del blue', () => {
    expect(parseRates(api)).toEqual({ oficial: 1570, blue: 1560, updatedAt: '2026-11-04T20:55:00.000Z' });
  });
  it('rechaza respuestas incompletas o rotas', () => {
    expect(parseRates(null)).toBeNull();
    expect(parseRates({ error: 'x' })).toBeNull();
    expect(parseRates([api[0]])).toBeNull();
    expect(parseRates([{ casa: 'oficial', venta: 0 }, api[1]])).toBeNull();
  });
  it('convierte y formatea en dólares; sin cotización, queda en pesos', () => {
    const rates = parseRates(api)!;
    expect(formatMoney(1_570_000, 'oficial', rates)).toBe('US$\u00a01.000');
    expect(formatMoney(7800, 'blue', rates)).toBe('US$\u00a05,00');
    expect(formatMoney(-156_000, 'blue', rates)).toBe('−US$\u00a0100');
    expect(formatMoney(12500, 'ARS', rates)).toBe('$\u00a012.500');
    expect(formatMoney(12500, 'blue', null)).toBe('$\u00a012.500');
  });
});
