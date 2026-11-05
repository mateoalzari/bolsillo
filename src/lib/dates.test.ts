import { addMonths, dayLabel, daysInMonth, monthLabel, monthName, shortDate, toISODate } from './dates';

describe('fechas', () => {
  it('formatea fechas locales sin corrimiento de huso horario', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
  it('suma y resta meses cruzando el año', () => {
    expect(addMonths('2026-11', -1)).toBe('2026-10');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });
  it('sabe cuántos días tiene cada mes', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-10')).toBe(31);
  });
  it('nombra meses y días en español', () => {
    expect(monthName('2026-10')).toBe('octubre');
    expect(monthLabel('2026-11')).toBe('Noviembre 2026');
    expect(dayLabel('2026-11-05', '2026-11-05')).toBe('Hoy');
    expect(dayLabel('2026-11-04', '2026-11-05')).toBe('Ayer');
    expect(dayLabel('2026-11-02', '2026-11-05')).toBe('Lunes 2');
    expect(dayLabel('2026-10-31', '2026-11-01')).toBe('Ayer');
    expect(shortDate('2026-11-03')).toBe('3 nov');
  });
});
