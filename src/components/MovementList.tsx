import { useDeferredValue, useMemo, useState } from 'react'
import { CATEGORIES, getCategory, methodLabel } from '../lib/categories'
import { entriesToCSV } from '../lib/csv'
import { dateLabel, dayMonthLabel, monthOf } from '../lib/dates'
import { installmentCount } from '../lib/ledger'
import type { Entry } from '../lib/types'
import { useApp, useFormat } from '../state/AppState'
import { useMonthData } from '../state/useMonthData'
import { useEditor } from './AppShell'
import { Icon } from './Icon'

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function MovementList() {
  const { data, month, todayDate } = useApp()
  const fmt = useFormat()
  const { openEdit, openNew } = useEditor()
  const { entries } = useMonthData()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery.trim())
    return entries.filter((e) => (!category || e.category === category) && (!q || normalize(`${e.description} ${getCategory(e.category).label}`).includes(q)))
  }, [entries, deferredQuery, category])

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const e of filtered) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return [...map.entries()]
  }, [filtered])

  // Compras de este mes con tarjeta que se pagan en un resumen posterior: no cuentan en el balance de este mes
  const deferred = useMemo(
    () =>
      data.movements
        .filter((m) => m.kind === 'gasto' && m.method === 'credito' && m.paymentStart && monthOf(m.date) === month && monthOf(m.paymentStart) > month)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.movements, month],
  )
  const cardName = (id?: string) => (id ? data.cards.find((c) => c.id === id)?.name : undefined)

  const usedCategories = useMemo(() => new Set(entries.map((e) => e.category)), [entries])
  const filtering = Boolean(deferredQuery.trim() || category)

  function exportCSV() {
    const blob = new Blob([entriesToCSV(filtered)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bolsillo-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const movementById = (id: string) => data.movements.find((m) => m.id === id)

  return (
    <section className="movements" aria-labelledby="mov-title">
      <div className="section__head">
        <h2 id="mov-title" className="section__title">
          Movimientos <span className="count">{filtered.length}</span>
        </h2>
        <button type="button" className="btn btn--small btn--ghost" onClick={exportCSV} disabled={!filtered.length}>
          <Icon name="download" size={16} />
          Exportar CSV
        </button>
      </div>

      <div className="filters">
        <div className="search">
          <Icon name="search" size={18} />
          <label htmlFor="q" className="visually-hidden">
            Buscar movimientos
          </label>
          <input id="q" type="search" placeholder="Buscar…" autoComplete="off" spellCheck={false} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <label htmlFor="cat" className="visually-hidden">
          Filtrar por categoría
        </label>
        <select id="cat" className="filters__cat" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas</option>
          {CATEGORIES.filter((c) => usedCategories.has(c.id) || c.id === category).map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {deferred.length > 0 && !filtering && (
        <div className="deferred">
          <h3 className="deferred__title">Con tarjeta: se pagan más adelante</h3>
          <p className="muted field__hint">Compras de este mes que entran en un resumen posterior. No restan del balance de este mes.</p>
          <div className="deferred__list">
            {deferred.map((m) => {
              const n = installmentCount(m)
              return (
                <button key={m.id} type="button" className="deferred__item" onClick={() => openEdit(m)}>
                  <span className="deferred__main">
                    <span className="deferred__name">{m.description}</span>
                    <span className="deferred__when">
                      {cardName(m.cardId) ?? 'Crédito'} · {n > 1 ? `${n} cuotas desde el ${dayMonthLabel(m.paymentStart!, todayDate)}` : `se paga el ${dayMonthLabel(m.paymentStart!, todayDate)}`}
                    </span>
                  </span>
                  <span className="num">{fmt(m.amount)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="empty">
          <Icon name="wallet" size={32} />
          <p className="empty__title">Todavía no hay movimientos este mes</p>
          <p className="muted">Cargá tu primer gasto o ingreso, o marcá uno como fijo para que se cargue solo todos los meses.</p>
          <button type="button" className="btn btn--primary" onClick={openNew}>
            <Icon name="plus" size={18} />
            Agregar movimiento
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty empty--small">
          <p className="empty__title">Nada coincide con la búsqueda</p>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => {
              setQuery('')
              setCategory('')
            }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="days" aria-busy={filtering && deferredQuery !== query}>
          {groups.map(([date, items]) => (
            <div key={date} className="day">
              <h3 className="day__label">{dateLabel(date, todayDate)}</h3>
              <ul className="entries">
                {items.map((e) => {
                  const c = getCategory(e.category)
                  const future = e.date > todayDate
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        className={`entry${future ? ' entry--future' : ''}`}
                        onClick={() => {
                          const m = movementById(e.movementId)
                          if (m) openEdit(m)
                        }}
                      >
                        <span className="entry__icon" style={{ background: `color-mix(in oklab, ${c.color} 16%, transparent)`, color: c.color }} aria-hidden="true">
                          <Icon name={c.icon} size={19} />
                        </span>
                        <span className="entry__main">
                          <span className="entry__desc">{e.description}</span>
                          <span className="entry__meta">
                            {c.label} · {cardName(e.cardId) ?? methodLabel(e.method)}
                            {e.installment && (
                              <span className="tag">
                                Cuota {e.installment.number}/{e.installment.total}
                              </span>
                            )}
                            {e.recurringId && (
                              <span className="tag tag--soft">
                                <Icon name="repeat" size={12} /> Fijo
                              </span>
                            )}
                            {future && <span className="tag tag--soft">Programado</span>}
                          </span>
                        </span>
                        <span className={`entry__amount num ${e.kind === 'ingreso' ? 'num--income' : ''}`}>
                          <span className="visually-hidden">{e.kind === 'gasto' ? 'Gasto de ' : 'Ingreso de '}</span>
                          {e.kind === 'ingreso' ? '+' : '−'}
                          {fmt(e.amount)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
