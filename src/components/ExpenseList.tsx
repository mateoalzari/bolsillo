import { Download, Plus, Repeat, Search, Trash2 } from 'lucide-react';
import { useMoney } from '../hooks/useMoney';
import type { Theme } from '../hooks/useTheme';
import { CATEGORIES, categoryInfo } from '../lib/categories';
import { dayLabel, monthName } from '../lib/dates';
import { installmentLabel } from '../lib/installments';
import { groupByDate, type ExpenseFilter } from '../lib/stats';
import { CATEGORY_IDS, PAYMENT_LABELS, type Movement, type MonthKey } from '../lib/types';
import { CategoryIcon } from './icons';

interface ExpenseListProps {
  month: MonthKey;
  today: string;
  theme: Theme;
  /** Movimientos del mes, ya filtrados y ordenados. */
  expenses: Movement[];
  monthCount: number;
  filter: ExpenseFilter;
  onFilterChange: (filter: ExpenseFilter) => void;
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
  onAdd: () => void;
  onExport: () => void;
  enteringId: string | null;
  leavingIds: string[];
}

export function ExpenseList(props: ExpenseListProps) {
  const { month, today, theme, expenses, monthCount, filter, onFilterChange } = props;
  const { format } = useMoney();
  const groups = groupByDate(expenses);
  const filtered = filter.category !== 'todas' || filter.query.trim() !== '';

  return (
    <section className="card list-card" aria-labelledby="list-title">
      <div className="card__head">
        <h2 id="list-title" className="card__title card__title--lg">
          Movimientos de {monthName(month)}
        </h2>
        <span className="list-card__meta">
          <span className="muted small">
            {monthCount} {monthCount === 1 ? 'movimiento' : 'movimientos'}
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
            Buscar por descripción o categoría
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
          <option value="todas">Todo</option>
          <option value="gastos">Solo gastos</option>
          <option value="ingresos">Solo ingresos</option>
          <optgroup label="Gastos por categoría">
            {CATEGORY_IDS.map((c) => (
              <option key={c} value={c}>
                {CATEGORIES[c].label}
              </option>
            ))}
          </optgroup>
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
              <p>Todavía no cargaste movimientos en {monthName(month)}.</p>
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
                <span className="num">{g.total > 0 ? format(g.total) : `+${format(g.net)}`}</span>
              </h3>
              <ul>
                {g.items.map((e) => {
                  const label = e.description || categoryInfo(e.category).label;
                  const isIncome = e.type === 'income';
                  return (
                    <li
                      key={e.id}
                      className={`item ${props.enteringId === e.id ? 'is-entering' : ''} ${props.leavingIds.includes(e.id) ? 'is-leaving' : ''}`}
                    >
                      <button
                        type="button"
                        className="item__main"
                        onClick={() => props.onEdit(e)}
                        aria-label={`Editar ${isIncome ? 'ingreso' : 'gasto'}: ${label}, ${format(e.amount)}${e.installment ? `, ${installmentLabel(e.installment)}` : ''}${e.recurringId ? ', fijo mensual' : ''}`}
                      >
                        <CategoryIcon id={e.category} theme={theme} />
                        <span className="item__text">
                          <span className="item__title">{label}</span>
                          <span className="item__meta">
                            {categoryInfo(e.category).label}
                            {!isIncome && ` · ${PAYMENT_LABELS[e.method]}`}
                            {e.installment && <span className="badge">{installmentLabel(e.installment)}</span>}
                            {e.recurringId && (
                              <span className="badge">
                                <Repeat size={11} aria-hidden="true" /> Fijo
                              </span>
                            )}
                          </span>
                        </span>
                        <span className={`item__amount num ${isIncome ? 'is-income' : ''}`}>
                          {isIncome ? `+${format(e.amount)}` : format(e.amount)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--ghost item__delete"
                        onClick={() => props.onDelete(e)}
                        aria-label={`Borrar: ${label}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
