import { useId, useState, type FormEvent } from 'react'
import { getCategory } from '../lib/categories'
import { addMonths, dateLabel, monthName } from '../lib/dates'
import { formatARS, formatPercent, parseAmount } from '../lib/money'
import { useApp, useFormat } from '../state/AppState'
import { useMonthData } from '../state/useMonthData'
import { Section } from './AppShell'
import { Icon } from './Icon'

/**
 * El balance como una frase, no como un tablero: responde directo la pregunta del producto.
 */
export function BalanceHero() {
  const { month } = useApp()
  const fmt = useFormat()
  const { balance, comparison, isCurrent, isFuture, committedThis } = useMonthData()
  const negative = balance.left < 0
  const verb = isFuture ? 'Para' : isCurrent ? 'Te quedan' : 'En'

  return (
    <section className="hero" aria-labelledby="hero-title">
      <h2 id="hero-title" className="hero__sentence">
        {isFuture ? (
          <>
            {verb} {monthName(month)} ya tenés <span className="hero__amount">{fmt(committedThis?.total ?? 0)}</span> comprometidos
          </>
        ) : isCurrent ? (
          negative ? (
            <>
              Este mes estás <span className="hero__amount hero__amount--neg">{fmt(-balance.left)}</span> en rojo
            </>
          ) : (
            <>
              {verb} <span className="hero__amount">{fmt(balance.left)}</span> hasta fin de mes
            </>
          )
        ) : (
          <>
            {verb} {monthName(month)} {negative ? 'gastaste' : 'te sobraron'} <span className={`hero__amount${negative ? ' hero__amount--neg' : ''}`}>{fmt(Math.abs(balance.left))}</span>
            {negative ? ' más de lo que entró' : ''}
          </>
        )}
      </h2>

      <dl className="hero__facts">
        {committedThis ? (
          <>
            <div>
              <dt>En tarjeta y cuotas</dt>
              <dd className="num">{fmt(committedThis.installments)}</dd>
            </div>
            <div>
              <dt>En gastos fijos</dt>
              <dd className="num">{fmt(committedThis.recurring)}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>Ingresos</dt>
              <dd className="num num--income">{fmt(balance.income)}</dd>
            </div>
            <div>
              <dt>Gastos</dt>
              <dd className="num">{fmt(balance.expenses)}</dd>
            </div>
          </>
        )}
        {comparison && comparison.change !== null && (
          <div className="hero__compare">
            <dt>Contra {monthName(addMonths(month, -1))}</dt>
            <dd>
              <span className={`delta ${comparison.change > 0 ? 'delta--up' : 'delta--down'}`}>
                <Icon name={comparison.change > 0 ? 'arrowUp' : 'arrowDown'} size={14} />
                {formatPercent(Math.abs(comparison.change))}
              </span>{' '}
              <span className="hero__compare-note">{isCurrent ? `de gasto al día ${comparison.day}` : 'de gasto'}</span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}

export function BudgetMeter() {
  const { data, setBudget } = useApp()
  const fmt = useFormat()
  const { budget, isFuture } = useMonthData()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const id = useId()

  function save(e: FormEvent) {
    e.preventDefault()
    const n = value.trim() === '' ? 0 : parseAmount(value)
    if (Number.isNaN(n) || n < 0) {
      setError('Ingresá un monto válido, por ejemplo 1.900.000 (o vacío para quitarlo)')
      return
    }
    setBudget(Math.round(n))
    setEditing(false)
    setError('')
  }

  const startEdit = () => {
    setValue(data.budget ? String(data.budget) : '')
    setEditing(true)
  }

  if (isFuture) return null

  return (
    <Section
      title="Presupuesto"
      className="budget"
      action={
        !editing && (
          <button type="button" className="btn btn--small btn--ghost" onClick={startEdit}>
            <Icon name="pencil" size={16} />
            {budget.status === 'none' ? 'Definir' : 'Editar'}
          </button>
        )
      }
    >
      {editing ? (
        <form className="budget__form" onSubmit={save} noValidate>
          <label htmlFor={id} className="visually-hidden">
            Presupuesto mensual en pesos
          </label>
          <div className="amount-input amount-input--small">
            <span aria-hidden="true">$</span>
            <input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder="1.900.000" autoFocus aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} />
          </div>
          <button type="submit" className="btn btn--primary btn--small">
            Guardar
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setEditing(false)}>
            Cancelar
          </button>
          {error && (
            <p className="field__error" id={`${id}-err`}>
              {error}
            </p>
          )}
        </form>
      ) : budget.status === 'none' ? (
        <p className="muted">Definí cuánto querés gastar por mes y te avisamos al llegar al 80% y al 100%.</p>
      ) : (
        <>
          <div
            className={`meter meter--${budget.status}`}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={budget.budget}
            aria-valuenow={Math.round(budget.spent)}
            aria-valuetext={`${formatPercent(budget.ratio)} usado: ${formatARS(budget.spent)} de ${formatARS(budget.budget)}`}
            aria-label="Presupuesto usado"
          >
            <span className="meter__fill" style={{ transform: `scaleX(${Math.min(budget.ratio, 1)})` }} />
            <span className="meter__mark" style={{ left: '80%' }} aria-hidden="true" />
          </div>
          <p className="budget__line">
            <span className="num">{fmt(budget.spent)}</span> de <span className="num">{fmt(budget.budget)}</span>
            <span className="budget__pct">{formatPercent(budget.ratio)}</span>
          </p>
          {budget.status === 'warn' && (
            <p className="notice notice--warn" role="status">
              <Icon name="alert" size={18} /> Ya usaste el {formatPercent(budget.ratio)} del presupuesto. Te quedan {fmt(budget.remaining)}.
            </p>
          )}
          {budget.status === 'over' && (
            <p className="notice notice--danger" role="status">
              <Icon name="alert" size={18} /> Te pasaste {fmt(-budget.remaining)} del presupuesto del mes.
            </p>
          )}
        </>
      )}
    </Section>
  )
}

export function InsightsList() {
  const { insights } = useMonthData()
  if (!insights.length) return null
  return (
    <Section title="Lecturas del mes" className="insights">
      <ul className="insights__list">
        {insights.map((i) => (
          <li key={i.id} className={`insight insight--${i.tone}`}>
            <Icon name="sparkle" size={18} />
            <span>{i.text}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function UpcomingPanel({ limit = 4 }: { limit?: number }) {
  const { month, todayDate } = useApp()
  const fmt = useFormat()
  const { upcoming, committedNext, isFuture } = useMonthData()
  if (isFuture) return null
  const items = upcoming.slice(0, limit)
  return (
    <Section title="Lo que viene" className="upcoming">
      <div className="committed">
        <p className="committed__line">
          <span>Comprometido para {monthName(addMonths(month, 1))}</span>
          <span className="num committed__total">{fmt(committedNext.total)}</span>
        </p>
        <p className="committed__split muted">
          {fmt(committedNext.installments)} en tarjeta y cuotas · {fmt(committedNext.recurring)} en fijos
        </p>
      </div>
      {upcoming.length > 0 && (
        <>
          <h3 className="subhead">Vencimientos en los próximos 30 días</h3>
          <ul className="due-list">
            {items.map((u) => (
              <li key={`${u.ruleId}-${u.date}`} className="due">
                <span className="due__dot" style={{ background: getCategory(u.category).color }} aria-hidden="true" />
                <span className="due__what">
                  <span className="due__name">{u.description}</span>
                  <span className="due__when">{u.daysLeft === 0 ? 'Vence hoy' : u.daysLeft === 1 ? 'Vence mañana' : `${dateLabel(u.date, todayDate)} · en ${u.daysLeft} días`}</span>
                </span>
                <span className="num">{fmt(u.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  )
}
