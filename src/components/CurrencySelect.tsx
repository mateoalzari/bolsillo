import { CloudOff } from 'lucide-react';
import { useMoney } from '../hooks/useMoney';
import { CURRENCY_LABELS, type Currency } from '../lib/currency';

/** Selector de moneda. Las opciones en dólares se deshabilitan si no hay cotización. */
export function CurrencySelect({ idSuffix }: { idSuffix: string }) {
  const { currency, setCurrency, status } = useMoney();
  const id = `currency-${idSuffix}`;
  const noRates = status === 'error';
  return (
    <span className="currency">
      <label htmlFor={id} className="sr-only">
        Ver montos en
      </label>
      <select
        id={id}
        className="select select--compact"
        value={noRates ? 'ARS' : currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
      >
        {(Object.keys(CURRENCY_LABELS) as Currency[]).map((c) => (
          <option key={c} value={c} disabled={c !== 'ARS' && noRates}>
            {c === 'ARS' ? 'Pesos' : `US$ ${c}`}
            {c !== 'ARS' && status === 'loading' ? ' (cargando…)' : ''}
            {c !== 'ARS' && noRates ? ' (sin cotización)' : ''}
          </option>
        ))}
      </select>
    </span>
  );
}

const time = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return ` · actualizada ${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Línea con la cotización en uso, o el aviso de que no hay cotización. */
export function CurrencyNote() {
  const { currency, rates, status } = useMoney();
  if (status === 'error' && currency !== 'ARS') {
    return (
      <p className="currency-note currency-note--warn" role="status">
        <CloudOff size={15} aria-hidden="true" /> No pudimos traer la cotización del dólar. Te mostramos todo en pesos.
      </p>
    );
  }
  if (!rates || currency === 'ARS') return null;
  return (
    <p className="currency-note">
      {CURRENCY_LABELS[currency]}: <strong className="num">$ {rates[currency].toLocaleString('es-AR')}</strong> (venta)
      {time(rates.updatedAt)} · fuente dolarapi.com. Montos convertidos a la cotización de hoy.
    </p>
  );
}
