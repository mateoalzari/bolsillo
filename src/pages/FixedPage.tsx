import { useId, useMemo, useState, type FormEvent } from 'react'
import { RateNotice, Section } from '../components/AppShell'
import { Icon } from '../components/Icon'
import { ConfirmDialog, Sheet } from '../components/Sheet'
import { categoriesFor, getCategory, METHODS, methodLabel } from '../lib/categories'
import { monthDiff, monthOf } from '../lib/dates'
import { entriesForMovement, installmentCount } from '../lib/ledger'
import { parseAmount } from '../lib/money'
import { upcomingDue } from '../lib/recurring'
import type { Kind, PaymentMethod, RecurringRule } from '../lib/types'
import { useApp, useFormat } from '../state/AppState'

export function FixedPage() {
  const { data, todayDate } = useApp()
  const fmt = useFormat()
  const [editing, setEditing] = useState<{ open: boolean; rule?: RecurringRule; key: number }>({ open: false, key: 0 })
  const upcoming = useMemo(() => upcomingDue(data.recurring, todayDate, 30), [data.recurring, todayDate])

  const expenses = data.recurring.filter((r) => r.kind === 'gasto').sort((a, b) => a.dayOfMonth - b.dayOfMonth)
  const incomes = data.recurring.filter((r) => r.kind === 'ingreso').sort((a, b) => a.dayOfMonth - b.dayOfMonth)
  const totalFixed = expenses.reduce((t, r) => t + r.amount, 0)

  const currentMonth = monthOf(todayDate)
  const plans = useMemo(
    () =>
      data.movements
        .filter((m) => installmentCount(m) > 1)
        .map((m) => {
          const n = installmentCount(m)
          const paid = Math.min(n, Math.max(0, monthDiff(monthOf(m.date), currentMonth) + 1))
          const parts = entriesForMovement(m)
          const remaining = parts.slice(paid).reduce((t, e) => t + e.amount, 0)
          return { m, n, paid, remaining, perMonth: parts[parts.length - 1].amount }
        })
        .filter((p) => p.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining),
    [data.movements, currentMonth],
  )
  const activePlans = plans
  const totalRemaining = activePlans.reduce((t, p) => t + p.remaining, 0)

  const open = (rule?: RecurringRule) => setEditing((e) => ({ open: true, rule, key: e.key + 1 }))
  const close = () => setEditing((e) => ({ ...e, open: false }))

  return (
    <div className="page page--narrow">
      <RateNotice />
      <Section
        title="Gastos fijos"
        action={
          <button type="button" className="btn btn--small btn--primary" onClick={() => open()}>
            <Icon name="plus" size={16} /> Nuevo fijo
          </button>
        }
      >
        <p className="muted">
          Se cargan solos cada mes. En total suman <strong className="num">{fmt(totalFixed)}</strong> por mes.
          {upcoming.length > 0 && ` ${upcoming.length} ${upcoming.length === 1 ? 'vence' : 'vencen'} en los próximos 30 días.`}
        </p>
        <RuleList rules={expenses} onEdit={open} empty="Todavía no cargaste gastos fijos: alquiler, servicios, prepaga…" />
      </Section>

      <Section title="Ingresos fijos">
        <RuleList rules={incomes} onEdit={open} empty="Cargá tu sueldo como ingreso fijo para que el balance del mes sea real." />
      </Section>

      <Section title="Compras en cuotas">
        {activePlans.length === 0 ? (
          <p className="muted">No tenés cuotas pendientes. Cuando cargues un gasto con crédito en cuotas, aparece acá.</p>
        ) : (
          <>
            <p className="muted">
              Te quedan <strong className="num">{fmt(totalRemaining)}</strong> por pagar en {activePlans.length} {activePlans.length === 1 ? 'compra' : 'compras'}.
            </p>
            <ul className="plans">
              {activePlans.map(({ m, n, paid, remaining, perMonth }) => (
                <li key={m.id} className="plan">
                  <div className="plan__top">
                    <span className="plan__name">{m.description}</span>
                    <span className="num">{fmt(perMonth)}/mes</span>
                  </div>
                  <div className="plan__track" role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={paid} aria-label={`${m.description}: cuota ${paid} de ${n}`}>
                    {Array.from({ length: n }, (_, i) => (
                      <span key={i} className={`plan__seg${i < paid ? ' is-paid' : ''}${i === paid - 1 ? ' is-current' : ''}`} />
                    ))}
                  </div>
                  <div className="plan__bottom muted">
                    <span>
                      Cuota {Math.max(paid, 1)}/{n} · {getCategory(m.category).label}
                    </span>
                    <span>
                      Faltan <span className="num">{fmt(remaining)}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Sheet open={editing.open} onClose={close} title={editing.rule ? `Editar ${editing.rule.kind} fijo` : 'Nuevo fijo'}>
        <RuleForm key={editing.key} rule={editing.rule} onDone={close} />
      </Sheet>
    </div>
  )
}

function RuleList({ rules, onEdit, empty }: { rules: RecurringRule[]; onEdit: (r: RecurringRule) => void; empty: string }) {
  const fmt = useFormat()
  if (!rules.length) return <p className="muted empty--inline">{empty}</p>
  return (
    <ul className="entries rules">
      {rules.map((r) => {
        const c = getCategory(r.category)
        return (
          <li key={r.id}>
            <button type="button" className="entry" onClick={() => onEdit(r)}>
              <span className="entry__icon entry__icon--day" aria-hidden="true">
                <small>día</small>
                {r.dayOfMonth}
              </span>
              <span className="entry__main">
                <span className="entry__desc">{r.description}</span>
                <span className="entry__meta">
                  {c.label} · {methodLabel(r.method)}
                </span>
              </span>
              <span className={`entry__amount num ${r.kind === 'ingreso' ? 'num--income' : ''}`}>{fmt(r.amount)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function RuleForm({ rule, onDone }: { rule?: RecurringRule; onDone: () => void }) {
  const { addRule, updateRule, deleteRule, todayDate } = useApp()
  const ids = useId()
  const [kind, setKind] = useState<Kind>(rule?.kind ?? 'gasto')
  const [amount, setAmount] = useState(rule ? String(rule.amount) : '')
  const [description, setDescription] = useState(rule?.description ?? '')
  const [category, setCategory] = useState(rule?.category ?? 'servicios')
  const [day, setDay] = useState(rule?.dayOfMonth ?? Number(todayDate.slice(8, 10)))
  const [method, setMethod] = useState<PaymentMethod>(rule?.method ?? 'debito')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = parseAmount(amount)
    if (!(n > 0)) return setError('Ingresá un monto mayor a 0')
    if (!description.trim()) return setError('Escribí una descripción, por ejemplo "Alquiler"')
    const base = { kind, amount: n, description: description.trim(), category, dayOfMonth: day, method }
    if (rule) updateRule({ ...rule, ...base })
    else addRule({ ...base, startMonth: monthOf(todayDate) })
    onDone()
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      {!rule && (
        <div className="segmented segmented--kind" role="radiogroup" aria-label="Tipo">
          {(['gasto', 'ingreso'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              className="segmented__opt"
              onClick={() => {
                setKind(k)
                setCategory(categoriesFor(k)[0].id)
                if (k === 'ingreso' && method === 'credito') setMethod('transferencia')
              }}
            >
              {k === 'gasto' ? 'Gasto fijo' : 'Ingreso fijo'}
            </button>
          ))}
        </div>
      )}
      <div className="field">
        <label htmlFor={`${ids}-d`}>Descripción</label>
        <input id={`${ids}-d`} autoComplete="off" maxLength={80} placeholder="Alquiler, luz, sueldo…" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${ids}-a`}>Monto por mes</label>
          <div className="amount-input amount-input--small">
            <span aria-hidden="true">$</span>
            <input id={`${ids}-a`} inputMode="decimal" autoComplete="off" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${ids}-day`}>Día del mes</label>
          <select id={`${ids}-day`} value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d === 31 ? '31 (o el último día)' : d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${ids}-c`}>Categoría</label>
          <select id={`${ids}-c`} value={category} onChange={(e) => setCategory(e.target.value)}>
            {categoriesFor(kind).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${ids}-m`}>Medio de pago</label>
          <select id={`${ids}-m`} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHODS.filter((m) => kind === 'gasto' || m.id !== 'credito').map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {rule && <p className="field__hint">Los cambios se aplican desde este mes. Los meses anteriores quedan como estaban.</p>}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        {rule && (
          <button type="button" className="btn btn--ghost btn--danger-text" onClick={() => setConfirm(true)}>
            <Icon name="trash" size={18} /> Borrar
          </button>
        )}
        <button type="submit" className="btn btn--primary btn--grow">
          {rule ? 'Guardar cambios' : `Agregar ${kind} fijo`}
        </button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="¿Borrar este fijo?"
        message="Deja de cargarse desde este mes. Los movimientos de meses anteriores se conservan."
        confirmLabel="Borrar"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          if (rule) deleteRule(rule.id)
          setConfirm(false)
          onDone()
        }}
      />
    </form>
  )
}
