import { Download, RotateCcw, Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { monthName } from '../lib/dates';
import { formatAmountInput, parseAmount } from '../lib/money';
import type { MonthKey } from '../lib/types';
import { Dialog } from './Dialog';

interface BudgetDialogProps {
  open: boolean;
  budget: number;
  onSave: (budget: number) => void;
  onClose: () => void;
}

export function BudgetDialog({ open, budget, onSave, onClose }: BudgetDialogProps) {
  return (
    <Dialog open={open} title="Presupuesto mensual" onClose={onClose}>
      {open && <BudgetForm budget={budget} onSave={onSave} onCancel={onClose} />}
    </Dialog>
  );
}

function BudgetForm({ budget, onSave, onCancel }: { budget: number; onSave: (b: number) => void; onCancel: () => void }) {
  const [value, setValue] = useState(budget > 0 ? formatAmountInput(String(budget)) : '');
  const [error, setError] = useState('');
  const id = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (value.trim() === '') return onSave(0);
    const n = parseAmount(value);
    if (n === null) return setError('Ingresá un monto válido, o dejalo vacío para no usar presupuesto.');
    onSave(n);
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor={id} className="field__label">
          ¿Cuánto querés gastar como máximo por mes?
        </label>
        <div className={`amount-input ${error ? 'is-invalid' : ''}`}>
          <span aria-hidden="true">$</span>
          <input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(formatAmountInput(e.target.value))}
            aria-invalid={!!error}
            aria-describedby={`${id}-hint`}
            autoFocus
          />
        </div>
        <p id={`${id}-hint`} className={error ? 'field__error' : 'field__hint'}>
          {error || 'Te avisamos cuando pases el 80% y el 100%.'}
        </p>
      </div>
      <div className="dialog__actions dialog__actions--form">
        <span className="spacer" />
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary">
          Guardar
        </button>
      </div>
    </form>
  );
}

interface SettingsDialogProps {
  open: boolean;
  month: MonthKey;
  isSample: boolean;
  onClose: () => void;
  onEditBudget: () => void;
  onExport: () => void;
  onReset: () => void;
  onLoadSample: () => void;
}

export function SettingsDialog(p: SettingsDialogProps) {
  return (
    <Dialog open={p.open} title="Configuración" onClose={p.onClose}>
      <ul className="settings-list">
        <li>
          <div>
            <strong>Presupuesto mensual</strong>
            <p className="muted small">El tope que querés no pasar cada mes.</p>
          </div>
          <button type="button" className="btn btn--secondary" onClick={p.onEditBudget}>
            Editar
          </button>
        </li>
        <li>
          <div>
            <strong>Exportar {monthName(p.month)}</strong>
            <p className="muted small">Descargá los gastos del mes en CSV, para Excel o Sheets.</p>
          </div>
          <button type="button" className="btn btn--secondary" onClick={p.onExport}>
            <Download size={16} aria-hidden="true" /> CSV
          </button>
        </li>
        <li className="settings-list__danger">
          <div>
            <strong>{p.isSample ? 'Empezar de cero' : 'Borrar todos los gastos'}</strong>
            <p className="muted small">
              {p.isSample
                ? 'Borra los datos de ejemplo para cargar los tuyos.'
                : 'Borra todos los gastos guardados en este navegador.'}
            </p>
          </div>
          <button type="button" className="btn btn--danger-outline" onClick={p.onReset}>
            <Trash2 size={16} aria-hidden="true" />
            {p.isSample ? 'Borrar datos de ejemplo y empezar de cero' : 'Borrar todo'}
          </button>
        </li>
        {!p.isSample && (
          <li>
            <div>
              <strong>Datos de ejemplo</strong>
              <p className="muted small">Reemplaza tus gastos por los de ejemplo, para ver la app en acción.</p>
            </div>
            <button type="button" className="btn btn--secondary" onClick={p.onLoadSample}>
              <RotateCcw size={16} aria-hidden="true" /> Cargar
            </button>
          </li>
        )}
      </ul>
      <p className="muted small settings-note">Tus datos se guardan solo en este navegador. No se envían a ningún servidor.</p>
    </Dialog>
  );
}
