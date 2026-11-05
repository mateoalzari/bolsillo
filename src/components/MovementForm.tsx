import { Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { CATEGORIES, INCOME_CATEGORIES } from '../lib/categories';
import { monthName } from '../lib/dates';
import { splitAmount } from '../lib/installments';
import { formatAmountInput, formatARS, parseAmount } from '../lib/money';
import {
  CATEGORY_IDS,
  INCOME_CATEGORY_IDS,
  MAX_INSTALLMENTS,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  type AnyCategoryId,
  type MovementType,
  type PaymentMethod,
} from '../lib/types';
import type { Theme } from '../hooks/useTheme';
import { CategoryIcon } from './icons';

export interface MovementDraft {
  type: MovementType;
  /** Monto total (en una compra en cuotas, el total de la compra). */
  amount: number;
  category: AnyCategoryId;
  date: string;
  description: string;
  method: PaymentMethod;
  /** 1 = un solo pago. */
  installments: number;
  fixed: boolean;
}

interface MovementFormProps {
  initial?: MovementDraft;
  today: string;
  theme: Theme;
  /** Aviso si se están viendo los montos en dólares: el formulario siempre es en pesos. */
  showPesosHint: boolean;
  onSubmit: (draft: MovementDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function MovementForm({ initial, today, theme, showPesosHint, onSubmit, onCancel, onDelete }: MovementFormProps) {
  const [type, setType] = useState<MovementType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial ? formatAmountInput(String(initial.amount)) : '');
  const [category, setCategory] = useState<AnyCategoryId | null>(initial?.category ?? null);
  const [date, setDate] = useState(initial?.date ?? today);
  const [method, setMethod] = useState<PaymentMethod>(initial?.method ?? 'debito');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [installments, setInstallments] = useState(initial?.installments ?? 1);
  const [fixed, setFixed] = useState(initial?.fixed ?? false);
  const [errors, setErrors] = useState<{ amount?: string; category?: string; date?: string }>({});
  const id = useId();

  const isExpense = type === 'expense';
  const canSplit = isExpense && method === 'credito';
  const cuotas = canSplit ? installments : 1;
  const parsed = parseAmount(amount);
  const categories = isExpense ? CATEGORY_IDS : INCOME_CATEGORY_IDS;
  const labelOf = (c: AnyCategoryId) =>
    isExpense ? CATEGORIES[c as keyof typeof CATEGORIES].label : INCOME_CATEGORIES[c as keyof typeof INCOME_CATEGORIES].label;
  const day = Number(date.slice(8, 10)) || 1;

  function changeType(next: MovementType) {
    if (next === type) return;
    setType(next);
    setCategory(null);
    setMethod(next === 'income' ? 'transferencia' : 'debito');
    setErrors({});
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (parsed === null) next.amount = 'Ingresá un monto mayor a $ 0.';
    else if (cuotas > 1 && parsed < cuotas) next.amount = 'El monto es muy chico para esa cantidad de cuotas.';
    if (!category) next.category = 'Elegí una categoría.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Elegí una fecha.';
    setErrors(next);
    if (next.amount || next.category || next.date) {
      const firstInvalid = next.amount ? `${id}-amount` : next.category ? `${id}-cat-0` : `${id}-date`;
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    onSubmit({
      type,
      amount: parsed!,
      category: category!,
      date,
      method,
      description: description.trim(),
      installments: cuotas,
      fixed: cuotas === 1 && fixed,
    });
  }

  const split = parsed && cuotas > 1 ? splitAmount(parsed, cuotas) : null;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <fieldset className="field">
        <legend className="sr-only">Tipo de movimiento</legend>
        <div className="segmented segmented--type">
          {(['expense', 'income'] as const).map((t) => (
            <label key={t} className="segmented__option">
              <input type="radio" name={`${id}-type`} checked={type === t} onChange={() => changeType(t)} />
              <span>{t === 'expense' ? 'Gasto' : 'Ingreso'}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor={`${id}-amount`} className="field__label">
          {cuotas > 1 ? 'Monto total de la compra' : 'Monto'}
          {showPesosHint && <span className="field__hint"> (en pesos)</span>}
        </label>
        <div className={`amount-input ${errors.amount ? 'is-invalid' : ''}`}>
          <span aria-hidden="true">$</span>
          <input
            id={`${id}-amount`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              setAmount(formatAmountInput(e.target.value));
              if (errors.amount) setErrors((er) => ({ ...er, amount: undefined }));
            }}
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? `${id}-amount-err` : undefined}
            data-autofocus
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
        <div className={`cat-grid ${isExpense ? '' : 'cat-grid--3'}`}>
          {categories.map((c, i) => (
            <label key={c} className="cat-option">
              <input
                type="radio"
                name={`${id}-category`}
                id={`${id}-cat-${i}`}
                value={c}
                checked={category === c}
                onChange={() => {
                  setCategory(c);
                  if (errors.category) setErrors((er) => ({ ...er, category: undefined }));
                }}
              />
              <span className="cat-option__box">
                <CategoryIcon id={c} theme={theme} size="sm" />
                {labelOf(c)}
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
            {cuotas > 1 ? 'Fecha de compra' : 'Fecha'}
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
            placeholder={isExpense ? 'Ej.: café con medialunas' : 'Ej.: sueldo de noviembre'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {isExpense && (
        <fieldset className="field">
          <legend className="field__label">Medio de pago</legend>
          <div className="segmented">
            {PAYMENT_METHODS.map((m) => (
              <label key={m} className="segmented__option">
                <input type="radio" name={`${id}-method`} value={m} checked={method === m} onChange={() => setMethod(m)} />
                <span>{PAYMENT_LABELS[m]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {canSplit && (
        <div className="field field--inline">
          <label htmlFor={`${id}-cuotas`} className="field__label">
            Cuotas
          </label>
          <select
            id={`${id}-cuotas`}
            className="select"
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
            aria-describedby={`${id}-cuotas-hint`}
          >
            {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? '1 pago' : `${n} cuotas`}
              </option>
            ))}
          </select>
          <p id={`${id}-cuotas-hint`} className="field__hint field__hint--block">
            {split
              ? `${cuotas} cuotas de ${formatARS(split[split.length - 1])}, una por mes desde ${monthName(date.slice(0, 7))}.`
              : cuotas > 1
                ? 'Se reparte en una cuota por mes.'
                : 'Elegí más de 1 para repartir la compra en cuotas.'}
          </p>
        </div>
      )}

      {cuotas === 1 && (
        <label className="check">
          <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
          <span>
            <strong>{isExpense ? 'Gasto fijo mensual' : 'Ingreso fijo mensual'}</strong>
            <span className="field__hint field__hint--block">
              {isExpense
                ? `Se carga solo todos los meses, el día ${day}. Ej.: alquiler, luz, internet, suscripciones.`
                : `Se carga solo todos los meses, el día ${day}. Ej.: sueldo.`}
            </span>
          </span>
        </label>
      )}

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
          {initial ? 'Guardar cambios' : isExpense ? 'Guardar gasto' : 'Guardar ingreso'}
        </button>
      </div>
    </form>
  );
}
