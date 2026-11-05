import { CircleAlert, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react';
import { monthName } from '../lib/dates';
import { formatARS } from '../lib/money';
import { budgetStatus, comparisonText, type MonthComparison } from '../lib/stats';
import type { MonthKey } from '../lib/types';

interface SummaryCardProps {
  month: MonthKey;
  total: number;
  budget: number;
  comparison: MonthComparison;
  onEditBudget: () => void;
}

export function SummaryCard({ month, total, budget, comparison, onEditBudget }: SummaryCardProps) {
  const status = budgetStatus(total, budget);
  const pct = Math.round(status.ratio * 100);
  const TrendIcon = (comparison.percent ?? 0) > 0 ? TrendingUp : TrendingDown;

  return (
    <section className="card hero" aria-labelledby="hero-title">
      <h2 id="hero-title" className="hero__label">
        Gastaste en {monthName(month)}
      </h2>
      <p className="hero__total display">{formatARS(total)}</p>
      <p className="hero__compare">
        {comparison.percent !== null && comparison.percent !== 0 && (
          <TrendIcon size={15} strokeWidth={2.2} aria-hidden="true" />
        )}
        {comparisonText(comparison)}
      </p>

      {budget > 0 && (
        <div className="budget">
          <div
            className={`budget__bar budget__bar--${status.level}`}
            role="progressbar"
            aria-label="Presupuesto usado"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(pct, 100)}
            aria-valuetext={`${pct}% de ${formatARS(budget)}`}
          >
            <span style={{ width: `${Math.min(status.ratio, 1) * 100}%` }} />
          </div>
          <div className="budget__meta">
            <span>
              {pct}% de {formatARS(budget)}
            </span>
            <span>
              {status.remaining >= 0
                ? `Te quedan ${formatARS(status.remaining)}`
                : `Te pasaste ${formatARS(-status.remaining)}`}
            </span>
          </div>
          {status.level !== 'ok' && (
            <p className={`budget__alert budget__alert--${status.level}`} role="status">
              {status.level === 'over' ? (
                <>
                  <CircleAlert size={16} aria-hidden="true" /> Te pasaste del presupuesto del mes.
                </>
              ) : (
                <>
                  <TriangleAlert size={16} aria-hidden="true" /> Ojo: ya usaste el {pct}% del presupuesto.
                </>
              )}
            </p>
          )}
        </div>
      )}

      <button type="button" className="hero__edit" onClick={onEditBudget}>
        {budget > 0 ? 'Editar presupuesto' : 'Definir un presupuesto mensual'}
      </button>
    </section>
  );
}
