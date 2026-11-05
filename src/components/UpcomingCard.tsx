import { CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useMoney } from '../hooks/useMoney';
import { shortDate } from '../lib/dates';
import type { Commitment } from '../lib/installments';
import type { UpcomingItem } from '../lib/recurring';
import type { Theme } from '../hooks/useTheme';
import { CategoryIcon } from './icons';

interface UpcomingCardProps {
  items: UpcomingItem[];
  nextMonthName: string;
  nextMonthCommitment: Commitment;
  theme: Theme;
}

const VISIBLE = 4;

/** Gastos fijos y cuotas que vienen en los próximos 30 días, más lo comprometido en cuotas para el mes que viene. */
export function UpcomingCard({ items, nextMonthName, nextMonthCommitment, theme }: UpcomingCardProps) {
  const { format } = useMoney();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, VISIBLE);
  const total = items.reduce((acc, i) => acc + i.amount, 0);

  return (
    <section className="card" aria-labelledby="upcoming-title">
      <div className="card__head">
        <h2 id="upcoming-title" className="card__title">
          Próximos vencimientos
        </h2>
        <span className="muted small">30 días</span>
      </div>

      {nextMonthCommitment.total > 0 && (
        <p className="callout">
          <CreditCard size={17} aria-hidden="true" />
          <span>
            Para {nextMonthName} ya tenés <strong className="num">{format(nextMonthCommitment.total)}</strong>{' '}
            comprometidos en cuotas
            {nextMonthCommitment.purchases > 1 ? ` (${nextMonthCommitment.purchases} compras)` : ''}.
          </span>
        </p>
      )}

      {items.length === 0 ? (
        <p className="muted small">No hay gastos fijos ni cuotas en los próximos 30 días.</p>
      ) : (
        <>
          <ul className="upcoming">
            {shown.map((i) => (
              <li key={i.key} className="upcoming__item">
                <span className="upcoming__date">{shortDate(i.date)}</span>
                <CategoryIcon id={i.category} theme={theme} size="sm" />
                <span className="upcoming__text">
                  <span className="upcoming__title">{i.description}</span>
                  <span className="badge">{i.kind === 'cuota' ? i.detail : 'Fijo'}</span>
                </span>
                <span className="upcoming__amount num">{format(i.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="upcoming__foot">
            {items.length > VISIBLE ? (
              <button type="button" className="link-btn" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
                {expanded ? 'Ver menos' : `Ver los ${items.length}`}
              </button>
            ) : (
              <span />
            )}
            <span className="small">
              Total <strong className="num">{format(total)}</strong>
            </span>
          </div>
        </>
      )}
    </section>
  );
}
