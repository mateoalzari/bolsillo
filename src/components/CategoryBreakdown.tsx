import { CATEGORIES } from '../lib/categories';
import type { CategoryTotal } from '../lib/stats';
import type { ListFilterValue } from '../lib/stats';
import { useMoney } from '../hooks/useMoney';
import type { Theme } from '../hooks/useTheme';
import { CategoryIcon, categoryColor } from './icons';

interface CategoryBreakdownProps {
  totals: CategoryTotal[];
  theme: Theme;
  selected: ListFilterValue;
  onSelect: (category: ListFilterValue) => void;
}

/** Barras horizontales por categoría. Cada fila filtra la lista al tocarla. */
export function CategoryBreakdown({ totals, theme, selected, onSelect }: CategoryBreakdownProps) {
  const { format } = useMoney();
  const max = totals[0]?.total ?? 0;
  return (
    <section className="card" aria-labelledby="cat-title">
      <div className="card__head">
        <h2 id="cat-title" className="card__title">
          Gastos por categoría
        </h2>
        {selected !== 'todas' && (
          <button type="button" className="link-btn" onClick={() => onSelect('todas')}>
            Ver todas
          </button>
        )}
      </div>
      {totals.length === 0 ? (
        <p className="muted small">Sin gastos este mes.</p>
      ) : (
        <ul className="cat-list">
          {totals.map(({ category, total, share }) => (
            <li key={category}>
              <button
                type="button"
                className={`cat-row ${selected === category ? 'is-selected' : ''}`}
                aria-pressed={selected === category}
                onClick={() => onSelect(selected === category ? 'todas' : category)}
                aria-label={`${CATEGORIES[category].label}: ${format(total)}, ${Math.round(share * 100)}% del mes. Filtrar la lista.`}
              >
                <CategoryIcon id={category} theme={theme} size="sm" />
                <span className="cat-row__body">
                  <span className="cat-row__top">
                    <span>{CATEGORIES[category].label}</span>
                    <span className="muted">{Math.round(share * 100)}%</span>
                  </span>
                  <span className="cat-row__track">
                    <span
                      style={{ width: `${(total / max) * 100}%`, background: categoryColor(category, theme) }}
                    />
                  </span>
                </span>
                <span className="cat-row__amount num">{format(total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
