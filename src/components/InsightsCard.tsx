import { CalendarDays, Repeat, TrendingUp } from 'lucide-react';
import type { Insight } from '../lib/insights';

const ICONS: Record<Insight['id'], typeof TrendingUp> = {
  growth: TrendingUp,
  steady: TrendingUp,
  'peak-day': CalendarDays,
  fixed: Repeat,
};

/** Frases calculadas con los datos del mes. Si no hay datos suficientes, la tarjeta no aparece. */
export function InsightsCard({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <section className="card" aria-labelledby="insights-title">
      <div className="card__head">
        <h2 id="insights-title" className="card__title">
          Lecturas del mes
        </h2>
      </div>
      <ul className="insights">
        {insights.map((i) => {
          const Icon = ICONS[i.id];
          return (
            <li key={i.id}>
              <Icon size={16} aria-hidden="true" />
              <p>{i.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
