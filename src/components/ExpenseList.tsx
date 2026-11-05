import { Download, Plus, Search, Trash2 } from 'lucide-react';
import { CATEGORIES } from '../lib/categories';
import { dayLabel, monthName } from '../lib/dates';
import { formatARS } from '../lib/money';
import { groupByDate, type ExpenseFilter } from '../lib/stats';
import { CATEGORY_IDS, PAYMENT_LABELS, type Expense, type MonthKey } from '../lib/types';
import type { Theme } from '../hooks/useTheme';
import { CategoryIcon } from './icons';

interface ExpenseListProps {
  month: MonthKey;
  today: string;
  theme: Theme;
  /** Gastos del mes, ya filtrados y ordenados. */
  expenses: Expense[];
  monthCount: number;
  filter: ExpenseFilter;
  onFilterChange: (filter: ExpenseFilter) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onAdd: () => void;
  onExport: () => void;
  enteringId: string | null;
  leavingId: string | null;
}

export function ExpenseList(props: ExpenseListProps) {
  const { month, today, theme, expenses, monthCount, filter, onFilterChange } = props;
  const groups = groupByDate(expenses);
  const filtered = filter.category !== 'todas' || filter.query.trim() !== '';

  return (
    <section className="card list-card" aria-labelledby="list-title">
      <div className="card__head">
        <h2 id="list-title" className="card__title card__title--lg">
          Gastos de {monthName(month)}
        </h2>
        <span className="list-card__meta">
          <span className="muted small">
            {monthCount} {monthCount === 1 ? 'gasto' : 'gastos'}
          </span>
          {monthCount > 0 && (
            <button type="button" className="link-btn" onClick={props.onExport}>
              <Download size={15} aria-hidden="true" /> Exportar CSV
            </button>
          )}
        </span>
      </div>

      <div className="list-tools" role="search">
        <div className="search-input">
          <Search size={16} aria-hidden="true" />
          <label htmlFor="search" className="sr-only">
            Buscar por descripción
          </label>
          <input
            id="search"
            type="search"
            placeholder="Buscar gasto…"
            value={filter.query}
            onChange={(e) => onFilterChange({ ...filter, query: e.target.value })}
          />
        </div>
        <label htmlFor="cat-filter" className="sr-only">
          Filtrar por categoría
        </label>
        <select
          id="cat-filter"
          className="select"
          value={filter.category}
          onChange={(e) => onFilterChange({ ...filter, category: e.target.value as ExpenseFilter['category'] })}
        >
          <option value="todas">Todas</option>
          {CATEGORY_IDS.map((c) => (
            <option key={c} value={c}>
              {CATEGORIES[c].label}
            </option>
          ))}
        </select>
      </div>

      {groups.length === 0 ? (
        <div className="empty">
          {filtered ? (
            <>
              <p>No hay gastos que coincidan con la búsqueda.</p>
              <button type="button" className="btn btn--secondary" onClick={() => onFilterChange({ category: 'todas', query: '' })}>
                Limpiar filtros
              </button>
            </>
          ) : (
            <>
              <p>Todavía no cargaste gastos en {monthName(month)}.</p>
              <button type="button" className="btn btn--primary" onClick={props.onAdd}>
                <Plus size={18} aria-hidden="true" /> Agregar gasto
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="day-groups">
          {groups.map((g) => (
            <section key={g.date} className="day-group" aria-label={dayLabel(g.date, today)}>
              <h3 className="day-group__head">
                <span>{dayLabel(g.date, today)}</span>
                <span className="num">{formatARS(g.total)}</span>
              </h3>
              <ul>
                {g.items.map((e) => (
                  <li
                    key={e.id}
                    className={`item ${props.enteringId === e.id ? 'is-entering' : ''} ${props.leavingId === e.id ? 'is-leaving' : ''}`}
                  >
                    <button
                      type="button"
                      className="item__main"
                      onClick={() => props.onEdit(e)}
                      aria-label={`Editar: ${e.description || CATEGORIES[e.category].label}, ${formatARS(e.amount)}`}
                    >
                      <CategoryIcon id={e.category} theme={theme} />
                      <span className="item__text">
                        <span className="item__title">{e.description || CATEGORIES[e.category].label}</span>
                        <span className="item__meta">
                          {CATEGORIES[e.category].label} · {PAYMENT_LABELS[e.method]}
                        </span>
                      </span>
                      <span className="item__amount num">{formatARS(e.amount)}</span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--ghost item__delete"
                      onClick={() => props.onDelete(e)}
                      aria-label={`Borrar: ${e.description || CATEGORIES[e.category].label}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
