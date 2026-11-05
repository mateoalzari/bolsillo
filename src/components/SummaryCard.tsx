import { CircleAlert, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react';
import { useMoney } from '../hooks/useMoney';
import { monthName } from '../lib/dates';
import { budgetStatus, comparisonText, type MonthComparison, type MonthTotals } from '../lib/stats';
import type { MonthKey } from '../lib/types';

interface SummaryCardProps {
  month: MonthKey;
  totals: MonthTotals;
  budget: number;
  comparison: MonthComparison;
  onEditBudget: () => void;
}

export function SummaryCard({ month, totals, budget, comparison, onEditBudget }: SummaryCardProps) {
  const { format } = useMoney();
  const status = budgetStatus(totals.expenses, budget);
  const pct = Math.round(status.ratio * 100);
  const TrendIcon = (comparison.percent ?? 0) > 0 ? TrendingUp : TrendingDown;
  const name = monthName(month);

  let balanceNote: string;
  if (totals.income === 0) balanceNote = `Sin ingresos cargados en ${name}.`;
  else if (totals.balance >= 0) balanceNote = `Te queda el ${Math.round((totals.savingsRate ?? 0) * 100)}% de lo que ingresó.`;
  else balanceNote = `Gastaste ${format(-totals.balance)} más de lo que ingresó.`;

  return (
    <section className="card hero" aria-labelledby="hero-title">
      <h2 id="hero-title" className="hero__label">
        Balance de {name}
      </h2>
      <p className={`hero__total display ${totals.balance < 0 ? 'is-negative' : ''}`}>{format(totals.balance)}</p>
      <p className="hero__note">{balanceNote}</p>

      <dl className="hero__stats">
        <div>
          <dt>Ingresos</dt>
          <dd className="num">{format(totals.income)}</dd>
        </div>
        <div>
          <dt>Gastos</dt>
          <dd className="num">{format(totals.expenses)}</dd>
        </div>
      </dl>

      <p className="hero__compare">
        {comparison.percent !== null && comparison.percent !== 0 && (
          <TrendIcon size={15} strokeWidth={2.2} aria-hidden="true" />
        )}
        <span>
          <span className="sr-only">Gastos: </span>
          {comparisonText(comparison)}
        </span>
      </p>

      {budget > 0 && (
        <div className="budget">
          <div
            className={`budget__bar budget__bar--${status.level}`}
            role="progressbar"
            aria-label="Presupuesto de gastos usado"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(pct, 100)}
            aria-valuetext={`${pct}% de ${format(budget)}`}
          >
            <span style={{ width: `${Math.min(status.ratio, 1) * 100}%` }} />
          </div>
          <div className="budget__meta">
            <span>
              {pct}% de {format(budget)}
            </span>
            <span>
              {status.remaining >= 0 ? `Quedan ${format(status.remaining)}` : `Te pasaste ${format(-status.remaining)}`}
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
