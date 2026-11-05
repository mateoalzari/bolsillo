import { Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { CATEGORIES } from '../lib/categories';
import { formatAmountInput, parseAmount } from '../lib/money';
import {
  CATEGORY_IDS,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  type CategoryId,
  type Expense,
  type PaymentMethod,
} from '../lib/types';
import type { Theme } from '../hooks/useTheme';
import { CategoryIcon } from './icons';

export type ExpenseDraft = Omit<Expense, 'id' | 'createdAt'>;

interface ExpenseFormProps {
  initial?: Expense;
  today: string;
  theme: Theme;
  onSubmit: (draft: ExpenseDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function ExpenseForm({ initial, today, theme, onSubmit, onCancel, onDelete }: ExpenseFormProps) {
  const [amount, setAmount] = useState(initial ? formatAmountInput(String(initial.amount)) : '');
  const [category, setCategory] = useState<CategoryId | null>(initial?.category ?? null);
  const [date, setDate] = useState(initial?.date ?? today);
  const [method, setMethod] = useState<PaymentMethod>(initial?.method ?? 'debito');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [errors, setErrors] = useState<{ amount?: string; category?: string; date?: string }>({});
  const id = useId();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    const next: typeof errors = {};
    if (value === null) next.amount = 'Ingresá un monto mayor a $ 0.';
    if (!category) next.category = 'Elegí una categoría.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Elegí una fecha.';
    setErrors(next);
    if (Object.keys(next).length) {
      const firstInvalid = next.amount ? `${id}-amount` : next.category ? `${id}-cat-0` : `${id}-date`;
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    onSubmit({ amount: value!, category: category!, date, method, description: description.trim() });
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-amount`} className="field__label">
          Monto
        </label>
        <div className={`amount-input ${errors.amount ? 'is-invalid' : ''}`}>
          <span aria-hidden="true">$</span>
          <input
            id={`${id}-amount`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(formatAmountInput(e.target.value))}
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? `${id}-amount-err` : undefined}
            autoFocus
          />
        </div>
        {errors.amount && (
          <p id={`${id}-amount-err`} className="field__error">
            {errors.amount}
          </p>
        )}
      </div>

      <fieldset className="field" aria-describedby={errors.category ? `${id}-cat-err` : undefined}>
        <legend className="field__label">Categoría</legend>
        <div className="cat-grid">
          {CATEGORY_IDS.map((c, i) => (
            <label key={c} className="cat-option">
              <input
                type="radio"
                name={`${id}-category`}
                id={`${id}-cat-${i}`}
                value={c}
                checked={category === c}
                onChange={() => setCategory(c)}
              />
              <span className="cat-option__box">
                <CategoryIcon id={c} theme={theme} size="sm" />
                {CATEGORIES[c].label}
              </span>
            </label>
          ))}
        </div>
        {errors.category && (
          <p id={`${id}-cat-err`} className="field__error">
            {errors.category}
          </p>
        )}
      </fieldset>

      <div className="form__row">
        <div className="field">
          <label htmlFor={`${id}-date`} className="field__label">
            Fecha
          </label>
          <input
            id={`${id}-date`}
            type="date"
            className="input"
            value={date}
            max="2099-12-31"
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? `${id}-date-err` : undefined}
          />
          {errors.date && (
            <p id={`${id}-date-err`} className="field__error">
              {errors.date}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor={`${id}-desc`} className="field__label">
            Descripción <span className="field__hint">(opcional)</span>
          </label>
          <input
            id={`${id}-desc`}
            className="input"
            maxLength={60}
            placeholder="Ej.: café con medialunas"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <fieldset className="field">
        <legend className="field__label">Medio de pago</legend>
        <div className="segmented">
          {PAYMENT_METHODS.map((m) => (
            <label key={m} className="segmented__option">
              <input
                type="radio"
                name={`${id}-method`}
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
              />
              <span>{PAYMENT_LABELS[m]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="dialog__actions dialog__actions--form">
        {onDelete && (
          <button type="button" className="btn btn--danger-text" onClick={onDelete}>
            <Trash2 size={16} aria-hidden="true" /> Borrar
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary">
          {initial ? 'Guardar cambios' : 'Guardar gasto'}
        </button>
      </div>
    </form>
  );
}
