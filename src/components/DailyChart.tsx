import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { monthName } from '../lib/dates';
import { formatARS } from '../lib/money';
import type { DayTotal } from '../lib/stats';
import type { MonthKey } from '../lib/types';
import type { Theme } from '../hooks/useTheme';

const COLORS = {
  light: { bar: '#8A7D6E', axis: '#655C52', cursor: '#F4EFE7' },
  dark: { bar: '#8B829C', axis: '#A9A2B6', cursor: '#25212F' },
};

function ChartTooltip({ active, payload, label, month }: TooltipProps<number, string> & { month: MonthKey }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="muted">
        {label} de {monthName(month)}
      </span>
      <strong className="num">{formatARS(payload[0].value ?? 0)}</strong>
    </div>
  );
}

interface DailyChartProps {
  days: DayTotal[];
  month: MonthKey;
  theme: Theme;
}

export function DailyChart({ days, month, theme }: DailyChartProps) {
  const c = COLORS[theme];
  const peak = days.reduce((best, d) => (d.total > best.total ? d : best), days[0]);
  const activeDays = days.filter((d) => d.total > 0).length;
  const summary =
    peak.total > 0
      ? `Gastaste en ${activeDays} días de ${monthName(month)}. El día con más gasto fue el ${peak.day}, con ${formatARS(peak.total)}.`
      : `Sin gastos en ${monthName(month)}.`;
  const last = days.length;

  return (
    <section className="card" aria-labelledby="day-title">
      <div className="card__head">
        <h2 id="day-title" className="card__title">
          Por día
        </h2>
        {peak.total > 0 && (
          <span className="muted small">
            Pico: día {peak.day} · <span className="num">{formatARS(peak.total)}</span>
          </span>
        )}
      </div>
      <p className="sr-only">{summary}</p>
      <div className="daily-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={days} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="18%">
            <XAxis
              dataKey="day"
              ticks={[1, 8, 15, 22, last]}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={{ fill: c.axis, fontSize: 12 }}
            />
            <YAxis hide domain={[0, 'dataMax']} />
            <Tooltip
              cursor={{ fill: c.cursor }}
              content={<ChartTooltip month={month} />}
              isAnimationActive={false}
            />
            <Bar dataKey="total" fill={c.bar} radius={[3, 3, 0, 0]} minPointSize={0} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
