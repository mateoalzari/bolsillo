import { Moon, Plus, Settings, Sun } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { CurrencySelect, CurrencyNote } from './components/CurrencySelect';
import { ConfirmDialog, Dialog } from './components/Dialog';
import { ExpenseList } from './components/ExpenseList';
import { Logo } from './components/icons';
import { InsightsCard } from './components/InsightsCard';
import { MonthPicker } from './components/MonthPicker';
import { MovementForm, type MovementDraft } from './components/MovementForm';
import { BudgetDialog, SettingsDialog } from './components/SettingsDialog';
import { SummaryCard } from './components/SummaryCard';
import { TrendsCard } from './components/TrendsCard';
import { UpcomingCard } from './components/UpcomingCard';
import { useMoney } from './hooks/useMoney';
import { useTheme } from './hooks/useTheme';
import { categoryInfo } from './lib/categories';
import { movementsToCSV } from './lib/csv';
import { addMonths, monthKeyOf, monthName, todayISO } from './lib/dates';
import { buildInsights } from './lib/insights';
import { buildInstallments, committedInMonth, purchaseRows } from './lib/installments';
import { materializeRecurring, upcomingDue } from './lib/recurring';
import {
  compareWithPreviousMonth,
  filterExpenses,
  monthlySeries,
  monthTotals,
  movementsInMonth,
  sortByDateDesc,
  totalsByCategory,
  totalsByDay,
  type ExpenseFilter,
} from './lib/stats';
import { loadData, sampleData, saveData, type AppData } from './lib/storage';
import type { Movement, RecurringRule } from './lib/types';

type FormState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; movement: Movement };
type Confirm = { kind: 'delete'; movement: Movement } | { kind: 'reset' } | { kind: 'sample' } | null;

const ANIM_MS = 180;
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Completa los fijos mensuales que falten hasta hoy. */
function withRecurring(data: AppData, today: string): AppData {
  const created = materializeRecurring(data.rules, data.movements, today);
  return created.length ? { ...data, movements: [...data.movements, ...created] } : data;
}

/** Datos del formulario a partir de una fila (si es cuota, se edita la compra completa). */
function draftFor(m: Movement, rules: RecurringRule[], all: Movement[]): MovementDraft {
  if (m.installment) {
    const first = purchaseRows(all, m.installment.purchaseId)[0] ?? m;
    return { ...m, date: first.date, amount: m.installment.totalAmount, installments: m.installment.count, fixed: false };
  }
  const rule = rules.find((r) => r.id === m.recurringId);
  const stillRepeats = !!rule && (!rule.endMonth || rule.endMonth > monthKeyOf(m.date));
  return { ...m, installments: 1, fixed: stillRepeats };
}

export default function App() {
  const today = useMemo(() => todayISO(), []);
  const currentMonth = monthKeyOf(today);
  const { theme, toggle } = useTheme();
  const { format, shown } = useMoney();

  const [data, setData] = useState<AppData>(() => withRecurring(loadData(), today));
  const [month, setMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<ExpenseFilter>({ category: 'todas', query: '' });
  const [form, setForm] = useState<FormState>({ mode: 'closed' });
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [leavingIds, setLeavingIds] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const timer = useRef<number>();

  useEffect(() => saveData(data), [data]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** Lo que ya pasó: las cuotas futuras solo cuentan en "Próximos vencimientos". */
  const past = useMemo(() => data.movements.filter((m) => m.date <= today), [data.movements, today]);
  const monthMovements = useMemo(() => movementsInMonth(past, month), [past, month]);
  const totals = useMemo(() => monthTotals(past, month), [past, month]);
  const comparison = useMemo(() => compareWithPreviousMonth(past, month, today), [past, month, today]);
  const byCategory = useMemo(() => totalsByCategory(monthMovements), [monthMovements]);
  const byDay = useMemo(() => totalsByDay(monthMovements, month), [monthMovements, month]);
  const series = useMemo(() => monthlySeries(past, month, 6), [past, month]);
  const visible = useMemo(() => sortByDateDesc(filterExpenses(monthMovements, filter)), [monthMovements, filter]);
  const insights = useMemo(
    () => buildInsights(past, data.rules, month, today, format),
    [past, data.rules, month, today, format],
  );
  const upcoming = useMemo(() => upcomingDue(data.rules, data.movements, today), [data.rules, data.movements, today]);
  const nextMonth = addMonths(currentMonth, 1);
  const commitment = useMemo(() => committedInMonth(data.movements, nextMonth), [data.movements, nextMonth]);

  function flash(id: string) {
    setEnteringId(id);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setEnteringId(null), 600);
  }

  function saveMovement(draft: MovementDraft) {
    const editing = form.mode === 'edit' ? form.movement : null;
    let movements = data.movements;
    let rules = data.rules;
    const createdAt = editing?.createdAt ?? Date.now();
    const base = {
      type: draft.type,
      category: draft.category,
      description: draft.description,
      method: draft.method,
      createdAt,
    };

    // 1. Sacar lo que se está editando (una compra en cuotas se reemplaza completa).
    if (editing?.installment) {
      const pid = editing.installment.purchaseId;
      movements = movements.filter((m) => m.installment?.purchaseId !== pid);
    } else if (editing) {
      movements = movements.filter((m) => m.id !== editing.id);
    }

    // 2. Si era fijo, actualizar la regla (o cortarla si se destildó).
    const editedRule = editing?.recurringId ? rules.find((r) => r.id === editing.recurringId) : undefined;
    if (editedRule) {
      rules = rules.map((r) =>
        r.id !== editedRule.id
          ? r
          : draft.fixed
            ? { ...r, ...base, amount: draft.amount, day: Number(draft.date.slice(8, 10)), endMonth: undefined }
            : { ...r, endMonth: monthKeyOf(editing!.date) },
      );
    }

    // 3. Crear las filas nuevas.
    let focusId: string;
    let message: string;
    if (draft.installments > 1) {
      const pid = editing?.installment?.purchaseId ?? newId();
      const rows = buildInstallments(base, draft.date, draft.amount, draft.installments, pid);
      movements = [...movements, ...rows];
      focusId = rows[0].id;
      message = `Compra en ${draft.installments} cuotas guardada.`;
    } else {
      let recurringId = editing?.recurringId;
      if (draft.fixed && !editedRule) {
        const rule: RecurringRule = {
          id: newId(),
          ...base,
          amount: draft.amount,
          day: Number(draft.date.slice(8, 10)),
          startMonth: monthKeyOf(draft.date),
          skipped: [],
        };
        rules = [...rules, rule];
        recurringId = rule.id;
      }
      const row: Movement = {
        ...base,
        id: editing && !editing.installment ? editing.id : newId(),
        amount: draft.amount,
        date: draft.date,
        ...(recurringId ? { recurringId } : {}),
      };
      movements = [...movements, row];
      focusId = row.id;
      message = editing ? 'Movimiento actualizado.' : `${draft.type === 'income' ? 'Ingreso' : 'Gasto'} de ${format(draft.amount)} agregado.`;
    }

    setData((d) => withRecurring({ ...d, movements, rules }, today));
    setAnnouncement(message);
    flash(focusId);
    // Ir al mes del movimiento (si es futuro, al mes actual).
    setMonth(draft.date > today ? currentMonth : monthKeyOf(draft.date));
    setForm({ mode: 'closed' });
  }

  function deleteMovement(m: Movement) {
    setConfirm(null);
    const ids = m.installment ? purchaseRows(data.movements, m.installment.purchaseId).map((r) => r.id) : [m.id];
    setLeavingIds(ids);
    window.setTimeout(() => {
      setData((d) => ({
        ...d,
        movements: d.movements.filter((x) => !ids.includes(x.id)),
        // Un fijo borrado a mano no se vuelve a generar ese mes.
        rules: m.recurringId
          ? d.rules.map((r) => (r.id === m.recurringId ? { ...r, skipped: [...r.skipped, monthKeyOf(m.date)] } : r))
          : d.rules,
      }));
      setLeavingIds([]);
      setAnnouncement(m.installment ? 'Compra en cuotas borrada.' : 'Movimiento borrado.');
    }, ANIM_MS);
  }

  function exportCSV() {
    const rows = sortByDateDesc(monthMovements).reverse();
    const blob = new Blob(['﻿' + movementsToCSV(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `bolsillo-${month}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleConfirm() {
    if (!confirm) return;
    if (confirm.kind === 'delete') return deleteMovement(confirm.movement);
    if (confirm.kind === 'reset') {
      setData((d) => ({ ...d, movements: [], rules: [], isSample: false }));
      setAnnouncement('Listo, empezaste de cero.');
    } else {
      setData(sampleData(today));
      setAnnouncement('Se cargaron los datos de ejemplo.');
    }
    setMonth(currentMonth);
    setFilter({ category: 'todas', query: '' });
    setConfirm(null);
  }

  const openNew = () => setForm({ mode: 'new' });
  const confirmCopy = (() => {
    if (confirm?.kind === 'delete') {
      const m = confirm.movement;
      const name = m.description || categoryInfo(m.category).label;
      if (m.installment) {
        return {
          title: '¿Borrar la compra en cuotas?',
          description: (
            <>
              Se borran las <strong>{m.installment.count} cuotas</strong> de <strong>{name}</strong> (
              <strong>{format(m.installment.totalAmount)}</strong> en total). No se puede deshacer.
            </>
          ),
          label: 'Borrar cuotas',
        };
      }
      return {
        title: m.type === 'income' ? '¿Borrar este ingreso?' : '¿Borrar este gasto?',
        description: (
          <>
            <strong>{name}</strong> por <strong>{format(m.amount)}</strong>.{' '}
            {m.recurringId
              ? `Es fijo: se borra solo el de ${monthName(monthKeyOf(m.date))}. Para que no se repita más, editalo y destildá “fijo mensual”.`
              : 'No se puede deshacer.'}
          </>
        ),
        label: 'Borrar',
      };
    }
    if (confirm?.kind === 'reset') {
      return {
        title: data.isSample ? '¿Empezar de cero?' : '¿Borrar todos los movimientos?',
        description: data.isSample
          ? 'Se borran los datos de ejemplo (movimientos, fijos y cuotas) y la app queda vacía para que cargues los tuyos. Tu presupuesto se mantiene.'
          : `Se borran los ${data.movements.length} movimientos y los fijos guardados en este navegador. No se puede deshacer.`,
        label: data.isSample ? 'Borrar y empezar' : 'Borrar todo',
      };
    }
    return {
      title: '¿Cargar los datos de ejemplo?',
      description: 'Tus movimientos actuales se reemplazan por los de ejemplo. No se puede deshacer.',
      label: 'Reemplazar',
    };
  })();

  return (
    <div className="app">
      <a href="#list-title" className="skip-link">
        Ir a la lista de movimientos
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <Logo />
          <div className="topbar__month">
            <MonthPicker month={month} maxMonth={currentMonth} onChange={setMonth} />
          </div>
          <div className="topbar__actions">
            <span className="only-desktop">
              <CurrencySelect idSuffix="desk" />
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Configuración">
              <Settings size={18} />
            </button>
            <button type="button" className="btn btn--primary only-desktop" onClick={openNew}>
              <Plus size={18} aria-hidden="true" /> Agregar
            </button>
          </div>
        </div>
      </header>

      <main className="layout">
        <div className="mobile-month">
          <MonthPicker month={month} maxMonth={currentMonth} onChange={setMonth} />
          <CurrencySelect idSuffix="mobile" />
        </div>

        <CurrencyNote />

        {data.isSample && (
          <div className="sample-note">
            <p>
              Estos son <strong>datos de ejemplo</strong>.
            </p>
            <button type="button" className="link-btn" onClick={() => setConfirm({ kind: 'reset' })}>
              Empezar de cero
            </button>
          </div>
        )}

        <aside className="layout__side" aria-label="Resumen del mes">
          <SummaryCard
            month={month}
            totals={totals}
            budget={data.budget}
            comparison={comparison}
            onEditBudget={() => setBudgetOpen(true)}
          />
          <UpcomingCard
            items={upcoming}
            nextMonthName={monthName(nextMonth)}
            nextMonthCommitment={commitment}
            theme={theme}
          />
          <InsightsCard insights={insights} />
          <CategoryBreakdown
            totals={byCategory}
            theme={theme}
            selected={filter.category}
            onSelect={(category) => setFilter((f) => ({ ...f, category }))}
          />
        </aside>

        <div className="layout__main">
          <TrendsCard series={series} days={byDay} month={month} today={today} theme={theme} />
          <ExpenseList
            month={month}
            today={today}
            theme={theme}
            expenses={visible}
            monthCount={monthMovements.length}
            filter={filter}
            onFilterChange={setFilter}
            onEdit={(movement) => setForm({ mode: 'edit', movement })}
            onDelete={(movement) => setConfirm({ kind: 'delete', movement })}
            onAdd={openNew}
            onExport={exportCSV}
            enteringId={enteringId}
            leavingIds={leavingIds}
          />
        </div>
      </main>

      <footer className="footer">Proyecto conceptual — diseño y desarrollo: Mateo Alzari</footer>

      <div className="fab-bar">
        <button type="button" className="btn btn--primary btn--fab" onClick={openNew}>
          <Plus size={20} strokeWidth={2.4} aria-hidden="true" /> Agregar movimiento
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <Dialog
        open={form.mode !== 'closed'}
        title={form.mode === 'edit' ? (form.movement.installment ? 'Editar compra en cuotas' : 'Editar movimiento') : 'Nuevo movimiento'}
        onClose={() => setForm({ mode: 'closed' })}
      >
        {form.mode !== 'closed' && (
          <MovementForm
            key={form.mode === 'edit' ? form.movement.id : 'new'}
            initial={form.mode === 'edit' ? draftFor(form.movement, data.rules, data.movements) : undefined}
            today={today}
            theme={theme}
            showPesosHint={shown !== 'ARS'}
            onSubmit={saveMovement}
            onCancel={() => setForm({ mode: 'closed' })}
            onDelete={
              form.mode === 'edit'
                ? () => {
                    const movement = form.movement;
                    setForm({ mode: 'closed' });
                    setConfirm({ kind: 'delete', movement });
                  }
                : undefined
            }
          />
        )}
      </Dialog>

      <SettingsDialog
        open={settingsOpen}
        month={month}
        isSample={data.isSample}
        onClose={() => setSettingsOpen(false)}
        onEditBudget={() => {
          setSettingsOpen(false);
          setBudgetOpen(true);
        }}
        onExport={exportCSV}
        onReset={() => {
          setSettingsOpen(false);
          setConfirm({ kind: 'reset' });
        }}
        onLoadSample={() => {
          setSettingsOpen(false);
          setConfirm({ kind: 'sample' });
        }}
      />

      <BudgetDialog
        open={budgetOpen}
        budget={data.budget}
        onClose={() => setBudgetOpen(false)}
        onSave={(budget) => {
          setData((d) => ({ ...d, budget }));
          setBudgetOpen(false);
          setAnnouncement('Presupuesto actualizado.');
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.label}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
