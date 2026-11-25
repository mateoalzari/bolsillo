import { useId, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import { firstPaymentDate } from '../lib/cards'
import { categoriesFor, getCategory } from '../lib/categories'
import { formatIn, viewLabel } from '../lib/currency'
import { dayMonthLabel, monthOf } from '../lib/dates'
import { findDuplicate, guessCategory, rowToMovement, suggestCard } from '../lib/importPlan'
import { entriesForMovement } from '../lib/ledger'
import { loadPdfLib } from '../lib/pdfLoader'
import { StatementError, type ParsedStatement, type StatementRow } from '../lib/statement'
import { readStatementFile } from '../lib/statementFile'
import type { Movement } from '../lib/types'
import { useApp } from '../state/AppState'

type Phase =
  | { k: 'pick'; error?: string }
  | { k: 'reading'; name: string }
  | { k: 'password'; name: string; bytes: Uint8Array; error?: string }
  | { k: 'review'; name: string; parsed: ParsedStatement; duplicates: Map<number, Movement> }
  | { k: 'done'; ids: string[]; dueDate: string; thisStatement: number; later: number }

interface Choice {
  selected: boolean
  category: string
  cardId: string
}

/**
 * Fecha que representa al resumen para calcular su vencimiento con la tarjeta: el cierre si lo trae;
 * si no, la última compra (un resumen se descarga después del cierre, así que "hoy" correría un mes).
 */
function statementReference(parsed: ParsedStatement, today: string): string {
  if (parsed.closingDate) return parsed.closingDate
  const dated = parsed.rows.filter((r) => !r.dateFromStatement).map((r) => r.date)
  return dated.length ? dated.reduce((a, b) => (a > b ? a : b)) : today
}

const BRAND: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' }

export function ImportPage() {
  usePageTitle('Importar resumen')
  const { data, todayDate, addMovements, removeMovements, setMonth } = useApp()
  const [phase, setPhase] = useState<Phase>({ k: 'pick' })
  const [choices, setChoices] = useState<Map<number, Choice>>(new Map())
  const [cardId, setCardId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const navigate = useNavigate()

  async function read(name: string, bytes: Uint8Array, password?: string) {
    setPhase({ k: 'reading', name })
    try {
      const parsed = await readStatementFile(name, bytes, todayDate, loadPdfLib, password)
      const card = suggestCard(data.cards, parsed.brand)
      const statementRef = statementReference(parsed, todayDate)
      const cardObj = data.cards.find((c) => c.id === card)
      const duplicates = new Map<number, Movement>()
      const next = new Map<number, Choice>()
      for (const row of parsed.rows) {
        const dup = findDuplicate(row, data.movements)
        if (dup) duplicates.set(row.index, dup)
        next.set(row.index, {
          // Se proponen las compras y cargos en la moneda principal que no estén ya cargados; las devoluciones, a elección
          selected: !dup && row.currency === data.currency && row.type !== 'devolucion',
          category: guessCategory(row, data.movements),
          cardId: card,
        })
      }
      setChoices(next)
      setCardId(card)
      setDueDate(parsed.dueDate ?? (cardObj ? firstPaymentDate(statementRef, cardObj) : ''))
      setPhase({ k: 'review', name, parsed, duplicates })
    } catch (e) {
      if (e instanceof StatementError && (e.kind === 'password-needed' || e.kind === 'password-wrong')) {
        setPhase({ k: 'password', name, bytes, error: e.kind === 'password-wrong' ? e.message : undefined })
      } else {
        setPhase({ k: 'pick', error: e instanceof StatementError ? e.message : 'No pudimos leer el archivo. Probá de nuevo o con el CSV.' })
      }
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    read(file.name, new Uint8Array(await file.arrayBuffer()))
  }

  function doImport() {
    if (phase.k !== 'review') return
    const rows = phase.parsed.rows.filter((r) => choices.get(r.index)?.selected && r.currency === data.currency)
    const movements = rows.map((r) => {
      const c = choices.get(r.index)!
      return rowToMovement(r, { category: c.category, cardId: c.cardId }, dueDate || undefined, data.cards)
    })
    const ids = addMovements(movements)
    // Cuánto de lo importado se paga en este resumen y cuánto queda en cuotas futuras
    let thisStatement = 0
    let later = 0
    const dueMonth = dueDate ? monthOf(dueDate) : monthOf(todayDate)
    movements.forEach((m, i) => {
      if (m.kind !== 'gasto') return
      for (const e of entriesForMovement({ ...m, id: ids[i] })) {
        const month = monthOf(e.date)
        if (month === dueMonth) thisStatement += e.amount
        else if (month > dueMonth) later += e.amount
      }
    })
    setPhase({ k: 'done', ids, dueDate: dueDate || todayDate, thisStatement, later })
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="page import">
      <header className="import__head">
        <h1 className="import__title">Importar resumen de tarjeta</h1>
        {phase.k !== 'done' && (
          <p className="muted">Subí el resumen en PDF o en CSV, revisá lo que encontramos y elegí qué cargar. El archivo se lee en este dispositivo: no se guarda ni se manda a ningún lado.</p>
        )}
      </header>

      {(phase.k === 'pick' || phase.k === 'reading') && <Picker busy={phase.k === 'reading' ? phase.name : undefined} error={phase.k === 'pick' ? phase.error : undefined} onFile={onFile} />}

      {phase.k === 'password' && <PasswordForm name={phase.name} error={phase.error} onSubmit={(pw) => read(phase.name, phase.bytes, pw)} onCancel={() => setPhase({ k: 'pick' })} />}

      {phase.k === 'review' && (
        <Review
          name={phase.name}
          parsed={phase.parsed}
          duplicates={phase.duplicates}
          choices={choices}
          setChoices={setChoices}
          cardId={cardId}
          setCardId={(id) => {
            setCardId(id)
            // La tarjeta de arriba se aplica a todas las filas
            setChoices((old) => new Map([...old].map(([k, c]) => [k, { ...c, cardId: id }])))
            const card = data.cards.find((c) => c.id === id)
            if (!phase.parsed.dueDate && card) setDueDate(firstPaymentDate(statementReference(phase.parsed, todayDate), card))
          }}
          dueDate={dueDate}
          setDueDate={setDueDate}
          onImport={doImport}
          onCancel={() => setPhase({ k: 'pick' })}
        />
      )}

      {phase.k === 'done' && (
        <section className="section import__done" aria-live="polite">
          <span className="import__done-icon" aria-hidden="true">
            <Icon name="check" size={28} />
          </span>
          <h2 className="section__title">
            {phase.ids.length === 1 ? 'Importaste 1 movimiento' : `Importaste ${phase.ids.length} movimientos`}
          </h2>
          <p>
            En el resumen que vence el {dayMonthLabel(phase.dueDate, todayDate)} se pagan <strong className="num">{formatIn(phase.thisStatement, data.currency)}</strong> de lo que importaste.
            {phase.later > 0 && (
              <>
                {' '}
                Quedan <strong className="num">{formatIn(phase.later, data.currency)}</strong> en cuotas para los meses siguientes.
              </>
            )}
          </p>
          <div className="form-actions import__done-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setMonth(monthOf(phase.dueDate))
                navigate('/app')
              }}
            >
              Ver el mes del vencimiento
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setPhase({ k: 'pick' })}>
              Importar otro resumen
            </button>
          </div>
          <button
            type="button"
            className="link-btn import__undo"
            onClick={() => {
              removeMovements(phase.ids)
              setPhase({ k: 'pick' })
            }}
          >
            Deshacer esta importación
          </button>
        </section>
      )}
    </div>
  )
}

/* ---------------- Elegir archivo ---------------- */

function Picker({ busy, error, onFile }: { busy?: string; error?: string; onFile: (f: File | undefined) => void }) {
  const id = useId()
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!busy) onFile(e.dataTransfer.files[0])
  }
  return (
    <section className="section import__pick">
      <div
        className={`dropzone ${dragging ? 'dropzone--over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {busy ? (
          <div className="loading" role="status">
            <span className="loading__bar" aria-hidden="true" />
            Leyendo {busy}…
          </div>
        ) : (
          <>
            <Icon name="file" size={32} className="dropzone__icon" />
            <label htmlFor={id} className="btn btn--primary">
              <Icon name="upload" size={18} />
              Elegir el resumen
            </label>
            <input
              ref={input}
              id={id}
              type="file"
              className="visually-hidden"
              accept=".pdf,.csv,.txt,application/pdf,text/csv"
              onChange={(e) => {
                onFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <p className="dropzone__hint">PDF o CSV del home banking. En la compu también podés arrastrarlo acá.</p>
          </>
        )}
      </div>
      {error && (
        <p className="notice notice--danger" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </p>
      )}
      <ul className="import__tips">
        <li>El PDF tiene que ser el original del banco (con texto). Una foto o un escaneo no se puede leer.</li>
        <li>Reconocemos las cuotas como «C.03/06» o «Cuota 3 de 6»: cada compra se carga una sola vez, con todas sus cuotas.</li>
        <li>Los pagos de la tarjeta y los saldos no se importan. Lo que ya cargaste aparece marcado para no duplicarlo.</li>
      </ul>
    </section>
  )
}

function PasswordForm({ name, error, onSubmit, onCancel }: { name: string; error?: string; onSubmit: (pw: string) => void; onCancel: () => void }) {
  const id = useId()
  const [pw, setPw] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (pw) onSubmit(pw)
  }
  return (
    <form className="section import__password" onSubmit={submit} noValidate>
      <h2 className="section__title">{name} tiene contraseña</h2>
      <p className="muted">Muchos bancos protegen el resumen con tu DNI o una clave que figura en el mail. La contraseña se usa solo para abrirlo acá y no se guarda.</p>
      <div className="field">
        <label htmlFor={id}>Contraseña del PDF</label>
        <input
          id={id}
          type="password"
          autoComplete="off"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        {error && (
          <p className="field__error" id={`${id}-err`} role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Elegir otro archivo
        </button>
        <button type="submit" className="btn btn--primary" disabled={!pw}>
          Abrir el resumen
        </button>
      </div>
    </form>
  )
}

/* ---------------- Revisión ---------------- */

interface ReviewProps {
  name: string
  parsed: ParsedStatement
  duplicates: Map<number, Movement>
  choices: Map<number, Choice>
  setChoices: (fn: (old: Map<number, Choice>) => Map<number, Choice>) => void
  cardId: string
  setCardId: (id: string) => void
  dueDate: string
  setDueDate: (d: string) => void
  onImport: () => void
  onCancel: () => void
}

function Review({ name, parsed, duplicates, choices, setChoices, cardId, setCardId, dueDate, setDueDate, onImport, onCancel }: ReviewProps) {
  const { data, todayDate } = useApp()
  const ids = useId()
  const base = data.currency
  const importable = (r: StatementRow) => r.currency === base
  const rows = parsed.rows
  const selected = rows.filter((r) => importable(r) && choices.get(r.index)?.selected)
  const otherCurrency = rows.filter((r) => !importable(r))
  const total = selected.reduce((t, r) => t + (r.type === 'devolucion' ? -r.amount : r.amount), 0)
  const allOn = rows.filter(importable).every((r) => choices.get(r.index)?.selected)

  const update = (index: number, patch: Partial<Choice>) => setChoices((old) => new Map(old).set(index, { ...old.get(index)!, ...patch }))
  const setAll = (on: boolean) => setChoices((old) => new Map([...old].map(([k, c]) => [k, { ...c, selected: on && importable(rows[k]) }])))

  const facts = [parsed.brand && BRAND[parsed.brand], parsed.closingDate && `cierre ${dayMonthLabel(parsed.closingDate, todayDate)}`, parsed.dueDate && `vence ${dayMonthLabel(parsed.dueDate, todayDate)}`].filter(Boolean)

  return (
    <>
      <section className="section import__summary" aria-labelledby={`${ids}-sum`}>
        <h2 id={`${ids}-sum`} className="section__title import__file">
          <Icon name="file" size={18} />
          <span>{name}</span>
        </h2>
        <p className="muted">
          {rows.length === 1 ? 'Encontramos 1 consumo' : `Encontramos ${rows.length} consumos`}
          {facts.length > 0 && ` · ${facts.join(' · ')}`}
          {parsed.skipped > 0 && ` · ${parsed.skipped} ${parsed.skipped === 1 ? 'línea de pago o saldo no se importa' : 'líneas de pagos y saldos no se importan'}`}
        </p>
        <div className="field-row import__settings">
          <div className="field">
            <label htmlFor={`${ids}-card`}>Tarjeta</label>
            <select id={`${ids}-card`} value={cardId} onChange={(e) => setCardId(e.target.value)}>
              {data.cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="">Sin tarjeta</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${ids}-due`}>Vencimiento del resumen</label>
            <input id={`${ids}-due`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-describedby={`${ids}-due-hint`} />
          </div>
        </div>
        <p className="field__hint" id={`${ids}-due-hint`}>
          {dueDate
            ? `Todo se cuenta como pagado el ${dayMonthLabel(dueDate, todayDate)}; las cuotas que faltan siguen en los meses siguientes.`
            : 'Poné la fecha de vencimiento del resumen: es cuando se pagan estos consumos.'}
        </p>
        {!data.cards.length && (
          <p className="notice notice--warn">
            <Icon name="card" size={18} />
            <span>No tenés tarjetas cargadas. Podés importar igual, o cargar la tarjeta en Ajustes para que las compras nuevas caigan solas en el mes correcto.</span>
          </p>
        )}
        {otherCurrency.length > 0 && (
          <p className="notice notice--warn">
            <Icon name="alert" size={18} />
            <span>
              {otherCurrency.length === 1 ? 'Hay 1 consumo' : `Hay ${otherCurrency.length} consumos`} en otra moneda que no se {otherCurrency.length === 1 ? 'puede' : 'pueden'} importar: tu moneda principal es {viewLabel('base', base).toLowerCase()}. Cargalos a mano con lo que pagaste.
            </span>
          </p>
        )}
      </section>

      <section className="section import__rows" aria-labelledby={`${ids}-list`}>
        <div className="section__head">
          <h2 id={`${ids}-list`} className="section__title">
            Elegí qué importar <span className="count">{selected.length} de {rows.length}</span>
          </h2>
          <button type="button" className="btn btn--small btn--ghost" onClick={() => setAll(!allOn)}>
            {allOn ? 'Ninguno' : 'Todos'}
          </button>
        </div>
        <ul className="import-list">
          {rows.map((r) => (
            <ImportRow key={r.index} row={r} choice={choices.get(r.index)!} duplicate={duplicates.get(r.index)} importable={importable(r)} onChange={(p) => update(r.index, p)} />
          ))}
        </ul>
      </section>

      <div className="import__bar" role="region" aria-label="Confirmar importación">
        <p className="import__bar-total">
          <span className="muted">{selected.length === 1 ? '1 elegido' : `${selected.length} elegidos`}</span>
          <strong className="num">{formatIn(total, base)}</strong>
        </p>
        <div className="import__bar-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" disabled={!selected.length || !dueDate} onClick={onImport}>
            Importar {selected.length || ''}
          </button>
        </div>
      </div>
    </>
  )
}

function ImportRow({ row, choice, duplicate, importable, onChange }: { row: StatementRow; choice: Choice; duplicate?: Movement; importable: boolean; onChange: (p: Partial<Choice>) => void }) {
  const { data, todayDate } = useApp()
  const id = useId()
  const kind = row.type === 'devolucion' ? 'ingreso' : 'gasto'
  const cat = getCategory(choice.category)
  const meta = [
    row.dateFromStatement ? 'sin fecha (va al cierre)' : dayMonthLabel(row.date, todayDate),
    row.installment && `cuota ${row.installment.number} de ${row.installment.total}`,
  ].filter(Boolean)
  return (
    <li className={`import-row ${choice.selected ? 'import-row--on' : ''} ${importable ? '' : 'import-row--off'}`}>
      <div className="import-row__top">
        <input id={`${id}-on`} type="checkbox" className="check" checked={choice.selected} disabled={!importable} onChange={(e) => onChange({ selected: e.target.checked })} />
        <label htmlFor={`${id}-on`} className="import-row__main">
          <span className="import-row__desc">{row.description}</span>
          <span className="import-row__meta">
            {meta.join(' · ')}
            {row.type === 'cargo' && <span className="tag tag--soft">Impuesto o cargo</span>}
            {row.type === 'devolucion' && <span className="tag tag--soft">Devolución</span>}
            {!importable && <span className="tag tag--soft">{row.currency}</span>}
          </span>
        </label>
        <span className={`import-row__amount num ${kind === 'ingreso' ? 'num--income' : ''}`}>
          {kind === 'ingreso' ? '+ ' : ''}
          {formatIn(row.amount, row.currency)}
          {row.installment && <small className="import-row__total">total {formatIn(row.amount * row.installment.total, row.currency)}</small>}
        </span>
      </div>
      {duplicate && (
        <p className="import-row__dup">
          <Icon name="alert" size={16} />
          <span>
            Parece que ya está cargado: «{duplicate.description}» del {dayMonthLabel(duplicate.date, todayDate)}.
          </span>
        </p>
      )}
      {row.type === 'devolucion' && choice.selected && <p className="import-row__note">Se carga como ingreso el día del vencimiento.</p>}
      {importable && (
        <div className="import-row__selects">
          <div className="field">
            <label htmlFor={`${id}-cat`} className="visually-hidden">
              Categoría de {row.description}
            </label>
            <span className="import-row__dot" style={{ background: cat.color }} aria-hidden="true" />
            <select id={`${id}-cat`} value={choice.category} onChange={(e) => onChange({ category: e.target.value })}>
              {categoriesFor(kind).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {kind === 'gasto' && (
            <div className="field">
              <label htmlFor={`${id}-card`} className="visually-hidden">
                Tarjeta de {row.description}
              </label>
              <select id={`${id}-card`} value={choice.cardId} onChange={(e) => onChange({ cardId: e.target.value })}>
                {data.cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="">Sin tarjeta</option>
              </select>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

