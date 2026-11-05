import { Moon, Plus, Settings, Sun } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { DailyChart } from './components/DailyChart';
import { ConfirmDialog, Dialog } from './components/Dialog';
import { ExpenseForm, type ExpenseDraft } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { Logo } from './components/icons';
import { MonthPicker } from './components/MonthPicker';
import { BudgetDialog, SettingsDialog } from './components/SettingsDialog';
import { SummaryCard } from './components/SummaryCard';
import { useTheme } from './hooks/useTheme';
import { CATEGORIES } from './lib/categories';
import { expensesToCSV } from './lib/csv';
import { monthKeyOf, todayISO } from './lib/dates';
import { formatARS } from './lib/money';
import {
  compareWithPreviousMonth,
  expensesInMonth,
  filterExpenses,
  sortByDateDesc,
  sumAmounts,
  totalsByCategory,
  totalsByDay,
  type ExpenseFilter,
} from './lib/stats';
import { loadData, sampleData, saveData, type AppData } from './lib/storage';
import type { Expense } from './lib/types';

type FormState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; expense: Expense };
type Confirm = { kind: 'delete'; expense: Expense } | { kind: 'reset' } | { kind: 'sample' } | null;

const ANIM_MS = 180;
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function App() {
  const today = useMemo(() => todayISO(), []);
  const currentMonth = monthKeyOf(today);
  const { theme, toggle } = useTheme();

  const [data, setData] = useState<AppData>(loadData);
  const [month, setMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<ExpenseFilter>({ category: 'todas', query: '' });
  const [form, setForm] = useState<FormState>({ mode: 'closed' });
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const timer = useRef<number>();

  useEffect(() => saveData(data), [data]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const monthExpenses = useMemo(() => expensesInMonth(data.expenses, month), [data.expenses, month]);
  const total = sumAmounts(monthExpenses);
  const comparison = useMemo(
    () => compareWithPreviousMonth(data.expenses, month, today),
    [data.expenses, month, today],
  );
  const byCategory = useMemo(() => totalsByCategory(monthExpenses), [monthExpenses]);
  const byDay = useMemo(() => totalsByDay(monthExpenses, month), [monthExpenses, month]);
  const visible = useMemo(() => sortByDateDesc(filterExpenses(monthExpenses, filter)), [monthExpenses, filter]);

  function flash(id: string) {
    setEnteringId(id);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setEnteringId(null), 600);
  }

  function saveExpense(draft: ExpenseDraft) {
    if (form.mode === 'edit') {
      const id = form.expense.id;
      setData((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, ...draft } : e)) }));
      setAnnouncement('Gasto actualizado.');
      flash(id);
    } else {
      const expense: Expense = { ...draft, id: newId(), createdAt: Date.now() };
      setData((d) => ({ ...d, expenses: [...d.expenses, expense] }));
      setAnnouncement(`Gasto de ${formatARS(draft.amount)} agregado.`);
      flash(expense.id);
    }
    // Si el gasto quedó en otro mes, vamos a ese mes para que se vea.
    setMonth(monthKeyOf(draft.date));
    setForm({ mode: 'closed' });
  }

  function deleteExpense(expense: Expense) {
    setConfirm(null);
    setLeavingId(expense.id);
    window.setTimeout(() => {
      setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== expense.id) }));
      setLeavingId(null);
      setAnnouncement('Gasto borrado.');
    }, ANIM_MS);
  }

  function exportCSV() {
    const rows = sortByDateDesc(monthExpenses).reverse();
    const blob = new Blob(['﻿' + expensesToCSV(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `bolsillo-gastos-${month}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleConfirm() {
    if (!confirm) return;
    if (confirm.kind === 'delete') return deleteExpense(confirm.expense);
    if (confirm.kind === 'reset') {
      setData((d) => ({ ...d, expenses: [], isSample: false }));
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
  const confirmCopy =
    confirm?.kind === 'delete'
      ? {
          title: '¿Borrar este gasto?',
          description: (
            <>
              <strong>{confirm.expense.description || CATEGORIES[confirm.expense.category].label}</strong> por{' '}
              <strong>{formatARS(confirm.expense.amount)}</strong>. No se puede deshacer.
            </>
          ),
          label: 'Borrar',
        }
      : confirm?.kind === 'reset'
        ? {
            title: data.isSample ? '¿Empezar de cero?' : '¿Borrar todos los gastos?',
            description: data.isSample
              ? 'Se borran los gastos de ejemplo y la app queda vacía para que cargues los tuyos. Tu presupuesto se mantiene.'
              : `Se borran los ${data.expenses.length} gastos guardados en este navegador. No se puede deshacer.`,
            label: data.isSample ? 'Borrar y empezar' : 'Borrar todo',
          }
        : {
            title: '¿Cargar los datos de ejemplo?',
            description: 'Tus gastos actuales se reemplazan por los de ejemplo. No se puede deshacer.',
            label: 'Reemplazar',
          };

  return (
    <div className="app">
      <a href="#list-title" className="skip-link">
        Ir a la lista de gastos
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <Logo />
          <div className="topbar__month">
            <MonthPicker month={month} maxMonth={currentMonth} onChange={setMonth} />
          </div>
          <div className="topbar__actions">
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
              <Plus size={18} aria-hidden="true" /> Agregar gasto
            </button>
          </div>
        </div>
      </header>

      <main className="layout">
        <div className="mobile-month">
          <MonthPicker month={month} maxMonth={currentMonth} onChange={setMonth} />
        </div>

        {data.isSample && (
          <div className="sample-note">
            <p>
              Estás viendo <strong>datos de ejemplo</strong>.
            </p>
            <button type="button" className="link-btn" onClick={() => setConfirm({ kind: 'reset' })}>
              Empezar de cero
            </button>
          </div>
        )}

        <aside className="layout__side" aria-label="Resumen del mes">
          <SummaryCard
            month={month}
            total={total}
            budget={data.budget}
            comparison={comparison}
            onEditBudget={() => setBudgetOpen(true)}
          />
          <CategoryBreakdown
            totals={byCategory}
            theme={theme}
            selected={filter.category}
            onSelect={(category) => setFilter((f) => ({ ...f, category }))}
          />
          <DailyChart days={byDay} month={month} theme={theme} />
        </aside>

        <div className="layout__main">
          <ExpenseList
            month={month}
            today={today}
            theme={theme}
            expenses={visible}
            monthCount={monthExpenses.length}
            filter={filter}
            onFilterChange={setFilter}
            onEdit={(expense) => setForm({ mode: 'edit', expense })}
            onDelete={(expense) => setConfirm({ kind: 'delete', expense })}
            onAdd={openNew}
            onExport={exportCSV}
            enteringId={enteringId}
            leavingId={leavingId}
          />
        </div>
      </main>

      <footer className="footer">Proyecto conceptual — diseño y desarrollo: Mateo Alzari</footer>

      <div className="fab-bar">
        <button type="button" className="btn btn--primary btn--fab" onClick={openNew}>
          <Plus size={20} strokeWidth={2.4} aria-hidden="true" /> Agregar gasto
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <Dialog
        open={form.mode !== 'closed'}
        title={form.mode === 'edit' ? 'Editar gasto' : 'Nuevo gasto'}
        onClose={() => setForm({ mode: 'closed' })}
      >
        {form.mode !== 'closed' && (
          <ExpenseForm
            key={form.mode === 'edit' ? form.expense.id : 'new'}
            initial={form.mode === 'edit' ? form.expense : undefined}
            today={today}
            theme={theme}
            onSubmit={saveExpense}
            onCancel={() => setForm({ mode: 'closed' })}
            onDelete={
              form.mode === 'edit'
                ? () => {
                    const expense = form.expense;
                    setForm({ mode: 'closed' });
                    setConfirm({ kind: 'delete', expense });
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
