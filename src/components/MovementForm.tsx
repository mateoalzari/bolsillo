import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { categoriesFor, getCategory, METHODS } from '../lib/categories'
import { dayOf, monthOf } from '../lib/dates'
import { MAX_INSTALLMENTS, splitInstallments } from '../lib/ledger'
import { formatARS, parseAmount } from '../lib/money'
import type { Kind, Movement, PaymentMethod } from '../lib/types'
import { useApp } from '../state/AppState'
import { Icon } from './Icon'
import { ConfirmDialog } from './Sheet'

interface Props {
  /** Movimiento a editar. Sin valor = nuevo. */
  movement?: Movement
  onDone: () => void
}

interface Errors {
  amount?: string
  description?: string
}

export function MovementForm({ movement, onDone }: Props) {
  const { addMovement, updateMovement, deleteMovement, addRule, todayDate } = useApp()
  const ids = useId()
  const editing = Boolean(movement)
  const [kind, setKind] = useState<Kind>(movement?.kind ?? 'gasto')
  const [amount, setAmount] = useState(movement ? String(movement.amount).replace('.', ',') : '')
  const [description, setDescription] = useState(movement?.description ?? '')
  const [category, setCategory] = useState(movement?.category ?? 'super')
  const [date, setDate] = useState(movement?.date ?? todayDate)
  const [method, setMethod] = useState<PaymentMethod>(movement?.method ?? 'debito')
  const [installments, setInstallments] = useState(movement?.installments ?? 1)
  const [isFixed, setIsFixed] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)

  const cats = categoriesFor(kind)
  const canInstallments = kind === 'gasto' && method === 'credito' && !isFixed
  const parsed = parseAmount(amount)
  const preview = useMemo(() => {
    if (!canInstallments || installments < 2 || !(parsed > 0)) return null
    return splitInstallments(parsed, installments)[1]
  }, [canInstallments, installments, parsed])

  function switchKind(k: Kind) {
    setKind(k)
    if (getCategory(category).kind !== k) setCategory(categoriesFor(k)[0].id)
    if (k === 'ingreso' && method === 'credito') setMethod('transferencia')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const errs: Errors = {}
    if (!(parsed > 0)) errs.amount = 'Ingresá un monto mayor a 0, por ejemplo 12.500'
    else if (parsed > 1e11) errs.amount = 'El monto es demasiado grande'
    if (!description.trim()) errs.description = 'Escribí una descripción corta, por ejemplo "Supermercado"'
    setErrors(errs)
    if (errs.amount) return amountRef.current?.focus()
    if (errs.description) return descRef.current?.focus()

    const base = {
      kind,
      amount: Math.round(parsed * 100) / 100,
      category,
      date,
      description: description.trim(),
      method,
      ...(canInstallments && installments > 1 ? { installments } : {}),
    }
    if (movement) {
      const { installments: _drop, ...rest } = movement
      void _drop
      updateMovement({ ...rest, ...base })
    } else if (isFixed) {
      addRule({ kind, amount: base.amount, category, description: base.description, method, dayOfMonth: dayOf(date), startMonth: monthOf(date) })
    } else {
      addMovement(base)
    }
    onDone()
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="segmented segmented--kind" role="radiogroup" aria-label="Tipo de movimiento">
        {(['gasto', 'ingreso'] as Kind[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className="segmented__opt" onClick={() => switchKind(k)}>
            {k === 'gasto' ? 'Gasto' : 'Ingreso'}
          </button>
        ))}
      </div>

      <div className="field field--amount">
        <label htmlFor={`${ids}-amount`}>Monto</label>
        <div className="amount-input">
          <span aria-hidden="true">$</span>
          <input
            ref={amountRef}
            id={`${ids}-amount`}
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? `${ids}-amount-err` : undefined}
            autoFocus={!editing && window.matchMedia('(pointer: fine)').matches}
          />
        </div>
        {errors.amount && (
          <p className="field__error" id={`${ids}-amount-err`}>
            {errors.amount}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`${ids}-desc`}>Descripción</label>
        <input
          ref={descRef}
          id={`${ids}-desc`}
          name="description"
          autoComplete="off"
          maxLength={80}
          placeholder={kind === 'gasto' ? 'Supermercado, nafta, farmacia…' : 'Sueldo, trabajo extra…'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? `${ids}-desc-err` : undefined}
        />
        {errors.description && (
          <p className="field__error" id={`${ids}-desc-err`}>
            {errors.description}
          </p>
        )}
      </div>

      <fieldset className="field">
        <legend>Categoría</legend>
        <div className="chips">
          {cats.map((c) => (
            <label key={c.id} className="chip">
              <input type="radio" name={`${ids}-cat`} value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} />
              <span className="chip__dot" style={{ background: c.color }} aria-hidden="true" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`${ids}-date`}>Fecha</label>
          <input id={`${ids}-date`} name="date" type="date" required value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${ids}-method`}>Medio de pago</label>
          <select id={`${ids}-method`} name="method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHODS.filter((m) => kind === 'gasto' || m.id !== 'credito').map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canInstallments && (
        <div className="field">
          <label htmlFor={`${ids}-inst`}>Cuotas</label>
          <select id={`${ids}-inst`} name="installments" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
            {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'Un pago' : `${n} cuotas`}
              </option>
            ))}
          </select>
          {preview !== null && (
            <p className="field__hint" aria-live="polite">
              {installments} cuotas de {formatARS(preview)}, una por mes desde {date.slice(5, 7)}/{date.slice(0, 4)}.
            </p>
          )}
        </div>
      )}

      {!editing && (
        <label className="check">
          <input type="checkbox" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} />
          <span>
            <strong>Se repite todos los meses</strong>
            <span className="check__hint">Se carga solo el día {dayOf(date)} de cada mes. Lo podés cambiar en Fijos.</span>
          </span>
        </label>
      )}

      {movement?.recurringId && <p className="field__hint">Este movimiento lo generó un {movement.kind} fijo. Si lo editás, cambia solo este mes.</p>}

      <div className="form-actions">
        {editing && (
          <button type="button" className="btn btn--ghost btn--danger-text" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={18} />
            Borrar
          </button>
        )}
        <button type="submit" className="btn btn--primary btn--grow">
          {editing ? 'Guardar cambios' : isFixed ? `Agregar ${kind} fijo` : `Agregar ${kind}`}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Borrar este movimiento?"
        message={
          movement?.installments && movement.installments > 1
            ? `Se borra la compra completa con sus ${movement.installments} cuotas. No se puede deshacer.`
            : 'No se puede deshacer.'
        }
        confirmLabel="Borrar"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (movement) deleteMovement(movement.id)
          setConfirmDelete(false)
          onDone()
        }}
      />
    </form>
  )
}
