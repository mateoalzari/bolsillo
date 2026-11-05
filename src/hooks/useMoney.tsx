import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatMoney, parseRates, RATES_URL, type Currency, type Rates } from '../lib/currency';

type RatesStatus = 'loading' | 'ok' | 'error';

interface MoneyContextValue {
  /** Moneda elegida por la persona (puede ser dólar aunque no haya cotización). */
  currency: Currency;
  /** Moneda en la que efectivamente se muestran los montos. */
  shown: Currency;
  setCurrency: (c: Currency) => void;
  rates: Rates | null;
  status: RatesStatus;
  format: (amountARS: number) => string;
}

const MoneyContext = createContext<MoneyContextValue | null>(null);
const KEY = 'bolsillo:currency';

function readCurrency(): Currency {
  try {
    const c = localStorage.getItem(KEY);
    return c === 'oficial' || c === 'blue' ? c : 'ARS';
  } catch {
    return 'ARS';
  }
}

/** Cotización del día desde dolarapi.com. Si falla, todo sigue funcionando en pesos. */
export function MoneyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(readCurrency);
  const [rates, setRates] = useState<Rates | null>(null);
  const [status, setStatus] = useState<RatesStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    // Si la API tarda más de 8 s, se corta y seguimos en pesos.
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    fetch(RATES_URL, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        if (cancelled) return;
        const parsed = parseRates(json);
        setRates(parsed);
        setStatus(parsed ? 'ok' : 'error');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const value = useMemo<MoneyContextValue>(() => {
    const shown: Currency = rates ? currency : 'ARS';
    return { currency, shown, setCurrency, rates, status, format: (n) => formatMoney(n, shown, rates) };
  }, [currency, rates, status, setCurrency]);

  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

export function useMoney(): MoneyContextValue {
  const ctx = useContext(MoneyContext);
  if (!ctx) throw new Error('useMoney necesita <MoneyProvider>');
  return ctx;
}
