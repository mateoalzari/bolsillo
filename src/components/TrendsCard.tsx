import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { useMoney } from '../hooks/useMoney';
import type { Theme } from '../hooks/useTheme';
import { monthLabel, monthName } from '../lib/dates';
import type { DayTotal, MonthPoint } from '../lib/stats';
import type { MonthKey } from '../lib/types';

/** Colores de gráfico verificados a ≥ 3:1 contra la superficie (scripts/contrast.mjs). */
const COLORS = {
  light: { expense: '#8A7D6E', income: '#2F7D52', axis: '#655C52', cursor: '#F4EFE7' },
  dark: { expense: '#8B829C', income: '#74C79A', axis: '#A9A2B6', cursor: '#25212F' },
};

type Tab = 'evolucion' | 'dia';

interface TrendsCardProps {
  series: MonthPoint[];
  days: DayTotal[];
  month: MonthKey;
  today: string;
  theme: Theme;
}

/** Evolución de los últimos 6 meses (principal) y detalle por día (pestaña secundaria). */
export function TrendsCard({ series, days, month, today, theme }: TrendsCardProps) {
  const [tab, setTab] = useState<Tab>('evolucion');
  const id = useId();
  const tabs: { key: Tab; label: string }[] = [
    { key: 'evolucion', label: 'Últimos 6 meses' },
    { key: 'dia', label: 'Por día' },
  ];
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ evolucion: null, dia: null });

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next: Tab = tab === 'evolucion' ? 'dia' : 'evolucion';
    setTab(next);
    refs.current[next]?.focus();
  }

  return (
    <section className="card" aria-labelledby={`${id}-title`}>
      <div className="card__head">
        <h2 id={`${id}-title`} className="card__title">
          Evolución
        </h2>
        <div className="tabs" role="tablist" aria-label="Tipo de gráfico" onKeyDown={onKeyDown}>
          {tabs.map((t) => (
            <button
              key={t.key}
              ref={(el) => (refs.current[t.key] = el)}
              type="button"
              role="tab"
              id={`${id}-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`${id}-panel`}
              tabIndex={tab === t.key ? 0 : -1}
              className="tabs__tab"
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`}>
        {tab === 'evolucion' ? (
          <EvolutionChart series={series} theme={theme} currentMonth={today.slice(0, 7)} />
        ) : (
          <DailyChart days={days} month={month} theme={theme} />
        )}
      </div>
    </section>
  );
}

function EvolutionTooltip({ active, payload }: TooltipProps<number, string>) {
  const { format } = useMoney();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as MonthPoint;
  return (
    <div className="chart-tooltip">
      <span className="muted">{monthLabel(p.month)}</span>
      <span>
        Ingresos <strong className="num">{format(p.income)}</strong>
      </span>
      <span>
        Gastos <strong className="num">{format(p.expenses)}</strong>
      </span>
      <span>
        Balance <strong className="num">{format(p.income - p.expenses)}</strong>
      </span>
    </div>
  );
}

function EvolutionChart({ series, theme, currentMonth }: { series: MonthPoint[]; theme: Theme; currentMonth: MonthKey }) {
  const { format } = useMoney();
  const c = COLORS[theme];
  const withData = series.filter((p) => p.income > 0 || p.expenses > 0);
  if (withData.length === 0) return <p className="muted small">Todavía no hay movimientos para mostrar.</p>;

  // El promedio usa solo meses cerrados: el mes en curso todavía no terminó.
  const closed = withData.filter((p) => p.month < currentMonth);
  const avgExpenses = closed.length ? closed.reduce((a, p) => a + p.expenses, 0) / closed.length : null;
  const inProgress = series.some((p) => p.month === currentMonth);
  const summary = `Ingresos y gastos de ${monthName(series[0].month)} a ${monthName(series[series.length - 1].month)}. ${series
    .map((p) => `${monthName(p.month)}: ingresos ${format(p.income)}, gastos ${format(p.expenses)}`)
    .join('; ')}.`;

  return (
    <>
      <p className="sr-only">{summary}</p>
      <div className="legend" aria-hidden="true">
        <span>
          <i style={{ background: c.income }} /> Ingresos
        </span>
        <span>
          <i style={{ background: c.expense }} /> Gastos
        </span>
        {avgExpenses !== null && (
          <span className="muted">
            Gasto promedio {closed.length > 1 ? `${closed[0].label}–${closed[closed.length - 1].label}` : closed[0].label}:{' '}
            <span className="num">{format(Math.round(avgExpenses))}</span>
          </span>
        )}
        {inProgress && <span className="muted">({monthName(currentMonth).slice(0, 3)}: mes en curso)</span>}
      </div>
      <div className="chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={series} margin={{ top: 6, right: 4, bottom: 0, left: 4 }} barGap={3} barCategoryGap="24%">
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
            <YAxis hide />
            <Tooltip cursor={{ fill: c.cursor }} content={<EvolutionTooltip />} isAnimationActive={false} />
            <Bar dataKey="income" fill={c.income} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="expenses" fill={c.expense} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function DayTooltip({ active, payload, label, month }: TooltipProps<number, string> & { month: MonthKey }) {
  const { format } = useMoney();
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="muted">
        {label} de {monthName(month)}
      </span>
      <strong className="num">{format(payload[0].value ?? 0)}</strong>
    </div>
  );
}

function DailyChart({ days, month, theme }: { days: DayTotal[]; month: MonthKey; theme: Theme }) {
  const { format } = useMoney();
  const c = COLORS[theme];
  const peak = days.reduce((best, d) => (d.total > best.total ? d : best), days[0]);
  const activeDays = days.filter((d) => d.total > 0).length;
  if (peak.total === 0) return <p className="muted small">Sin gastos en {monthName(month)}.</p>;

  return (
    <>
      <p className="sr-only">
        Gastaste en {activeDays} días de {monthName(month)}. El día con más gasto fue el {peak.day}, con {format(peak.total)}.
      </p>
      <div className="legend" aria-hidden="true">
        <span className="muted">
          Gastos de {monthName(month)} · pico el día {peak.day}: <span className="num">{format(peak.total)}</span>
        </span>
      </div>
      <div className="chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={days} margin={{ top: 6, right: 8, bottom: 0, left: 8 }} barCategoryGap="18%">
            <XAxis
              dataKey="day"
              ticks={[1, 8, 15, 22, days.length]}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={{ fill: c.axis, fontSize: 12 }}
            />
            <YAxis hide domain={[0, 'dataMax']} />
            <Tooltip cursor={{ fill: c.cursor }} content={<DayTooltip month={month} />} isAnimationActive={false} />
            <Bar dataKey="total" fill={c.expense} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
