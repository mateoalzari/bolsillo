import { useMemo } from 'react'
import { getCategory } from '../lib/categories'
import { dayOf, daysInMonth, monthLabel, monthShort } from '../lib/dates'
import { formatARS, formatPercent } from '../lib/money'
import { expensesByCategory, expensesByDay, lastMonthsSeries } from '../lib/stats'
import { useApp, useFormat } from '../state/AppState'
import { useMonthData } from '../state/useMonthData'
import { Section } from './AppShell'

/** Redondea hacia arriba a un número "lindo" para el máximo del eje. */
function niceMax(v: number): number {
  if (v <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(v))
  const f = v / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * exp
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} M`
  if (n >= 1_000) return `${Math.round(n / 1_000)} mil`
  return String(Math.round(n))
}

export function MonthsChart() {
  const { data, month } = useApp()
  const fmt = useFormat()
  const series = useMemo(() => lastMonthsSeries(data.movements, month, 6), [data.movements, month])
  const max = niceMax(Math.max(...series.map((p) => Math.max(p.income, p.expenses))))
  const W = 360
  const H = 190
  const pad = { t: 10, r: 4, b: 24, l: 40 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const slot = innerW / series.length
  const bw = Math.min(18, slot / 3.2)
  const y = (v: number) => pad.t + innerH - (v / max) * innerH
  const ticks = [0, max / 2, max]
  const empty = series.every((p) => !p.income && !p.expenses)

  return (
    <Section title="Últimos 6 meses" className="chart-card">
      <div className="legend" aria-hidden="true">
        <span className="legend__item">
          <span className="legend__swatch legend__swatch--income" /> Ingresos
        </span>
        <span className="legend__item">
          <span className="legend__swatch legend__swatch--expense" /> Gastos
        </span>
      </div>
      {empty ? (
        <p className="muted chart-empty">Cuando cargues movimientos vas a ver acá cómo evolucionan.</p>
      ) : (
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="months-desc">
          <desc id="months-desc">
            {series.map((p) => `${monthLabel(p.month)}: ingresos ${formatARS(p.income)}, gastos ${formatARS(p.expenses)}`).join('. ')}
          </desc>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart__grid" />
              <text x={pad.l - 8} y={y(t)} className="chart__axis" textAnchor="end" dominantBaseline="middle">
                {compact(t)}
              </text>
            </g>
          ))}
          {series.map((p, i) => {
            const cx = pad.l + slot * i + slot / 2
            const active = p.month === month
            return (
              <g key={p.month} className={`chart__group${active ? ' is-active' : ''}`} style={{ ['--i' as string]: i }}>
                <rect className="chart__bar chart__bar--income" x={cx - bw - 2} y={y(p.income)} width={bw} height={Math.max(0, pad.t + innerH - y(p.income))} rx={3}>
                  <title>{`Ingresos ${monthLabel(p.month)}: ${fmt(p.income)}`}</title>
                </rect>
                <rect className="chart__bar chart__bar--expense" x={cx + 2} y={y(p.expenses)} width={bw} height={Math.max(0, pad.t + innerH - y(p.expenses))} rx={3}>
                  <title>{`Gastos ${monthLabel(p.month)}: ${fmt(p.expenses)}`}</title>
                </rect>
                <text x={cx} y={H - 8} className={`chart__axis${active ? ' chart__axis--active' : ''}`} textAnchor="middle">
                  {monthShort(p.month)}
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </Section>
  )
}

export function CategoryBreakdown() {
  const fmt = useFormat()
  const { entries } = useMonthData()
  const cats = useMemo(() => expensesByCategory(entries), [entries])
  const top = cats[0]?.amount ?? 0
  return (
    <Section title="Gasto por categoría" className="chart-card">
      {cats.length === 0 ? (
        <p className="muted chart-empty">Sin gastos este mes.</p>
      ) : (
        <ul className="cat-bars">
          {cats.map((c, i) => {
            const cat = getCategory(c.category)
            return (
              <li key={c.category} className="cat-bar" style={{ ['--i' as string]: i }}>
                <span className="cat-bar__label">
                  <span className="chip__dot" style={{ background: cat.color }} aria-hidden="true" />
                  {cat.label}
                </span>
                <span className="cat-bar__value num">
                  {fmt(c.amount)} <span className="muted">· {formatPercent(c.share)}</span>
                </span>
                <span className="cat-bar__track" aria-hidden="true">
                  <span className="cat-bar__fill" style={{ transform: `scaleX(${top ? c.amount / top : 0})`, background: cat.color }} />
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

export function DaysChart() {
  const { month, todayDate, currentMonth } = useApp()
  const fmt = useFormat()
  const { entries } = useMonthData()
  const days = useMemo(() => expensesByDay(entries, month), [entries, month])
  const max = niceMax(Math.max(...days))
  const total = days.reduce((a, b) => a + b, 0)
  const n = daysInMonth(month)
  const W = 360
  const H = 120
  const pad = { t: 8, r: 2, b: 20, l: 2 }
  const innerH = H - pad.t - pad.b
  const slot = (W - pad.l - pad.r) / n
  const todayIdx = month === currentMonth ? dayOf(todayDate) - 1 : -1
  const peak = days.indexOf(Math.max(...days))

  return (
    <Section title="Gasto por día" className="chart-card">
      {total === 0 ? (
        <p className="muted chart-empty">Sin gastos este mes.</p>
      ) : (
        <>
          <p className="muted chart-note">
            El día que más gastaste fue el {peak + 1}: <span className="num">{fmt(days[peak])}</span>.
          </p>
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="days-desc">
            <desc id="days-desc">{`Gasto diario de ${monthLabel(month)}. Máximo el día ${peak + 1} con ${formatARS(days[peak])}.`}</desc>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + innerH} y2={pad.t + innerH} className="chart__grid" />
            {days.map((v, i) => {
              const h = (v / max) * innerH
              const x = pad.l + i * slot + slot * 0.18
              return (
                <rect key={i} className={`chart__bar chart__bar--day${i === todayIdx ? ' is-today' : ''}${i > todayIdx && todayIdx >= 0 ? ' is-future' : ''}`} x={x} y={pad.t + innerH - h} width={slot * 0.64} height={Math.max(h, v > 0 ? 2 : 0)} rx={2}>
                  <title>{`Día ${i + 1}: ${fmt(v)}`}</title>
                </rect>
              )
            })}
            {[1, 10, 20, n].map((d) => (
              <text key={d} x={pad.l + (d - 1) * slot + slot / 2} y={H - 6} className="chart__axis" textAnchor="middle">
                {d}
              </text>
            ))}
          </svg>
        </>
      )}
    </Section>
  )
}
