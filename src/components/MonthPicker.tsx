import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, monthLabel } from '../lib/dates';
import type { MonthKey } from '../lib/types';

interface MonthPickerProps {
  month: MonthKey;
  maxMonth: MonthKey;
  onChange: (month: MonthKey) => void;
}

export function MonthPicker({ month, maxMonth, onChange }: MonthPickerProps) {
  const atMax = month >= maxMonth;
  return (
    <nav className="month-picker" aria-label="Elegir mes">
      <button
        type="button"
        className="icon-btn icon-btn--ghost"
        onClick={() => onChange(addMonths(month, -1))}
        aria-label={`Ir a ${monthLabel(addMonths(month, -1))}`}
      >
        <ChevronLeft size={20} />
      </button>
      <span className="month-picker__label" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button
        type="button"
        className="icon-btn icon-btn--ghost"
        onClick={() => onChange(addMonths(month, 1))}
        disabled={atMax}
        aria-label={atMax ? 'Ya estás en el mes actual' : `Ir a ${monthLabel(addMonths(month, 1))}`}
      >
        <ChevronRight size={20} />
      </button>
    </nav>
  );
}
