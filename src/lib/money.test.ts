import { formatAmountInput, formatARS, parseAmount } from './money';

describe('formatARS', () => {
  it('usa punto de miles y espacio después del signo', () => {
    expect(formatARS(12500)).toBe('$\u00a012.500');
    expect(formatARS(1234567)).toBe('$\u00a01.234.567');
    expect(formatARS(0)).toBe('$\u00a00');
  });
  it('redondea y marca negativos', () => {
    expect(formatARS(999.6)).toBe('$\u00a01.000');
    expect(formatARS(-500)).toBe('−$\u00a0500');
  });
});

describe('parseAmount', () => {
  it('acepta los formatos que escribe la gente', () => {
    expect(parseAmount('12500')).toBe(12500);
    expect(parseAmount('12.500')).toBe(12500);
    expect(parseAmount('$\u00a012.500')).toBe(12500);
    expect(parseAmount('12500,60')).toBe(12501);
  });
  it('rechaza vacíos, ceros y basura', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-200')).toBeNull();
    expect(parseAmount('12,5,3')).toBeNull();
  });
});

describe('formatAmountInput', () => {
  it('agrega separador de miles mientras se tipea', () => {
    expect(formatAmountInput('12500')).toBe('12.500');
    expect(formatAmountInput('1.2a3')).toBe('123');
    expect(formatAmountInput('000')).toBe('');
  });
});
