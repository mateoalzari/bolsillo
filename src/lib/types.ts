export const CATEGORY_IDS = [
  'comida',
  'super',
  'transporte',
  'servicios',
  'salud',
  'ocio',
  'ropa',
  'otros',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const PAYMENT_METHODS = ['efectivo', 'debito', 'credito', 'transferencia'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
};

export interface Expense {
  id: string;
  /** Monto en pesos, entero. */
  amount: number;
  category: CategoryId;
  /** Fecha local en formato YYYY-MM-DD. */
  date: string;
  description: string;
  method: PaymentMethod;
  /** Marca de tiempo de creación, para desempatar el orden dentro de un mismo día. */
  createdAt: number;
}

/** Mes en formato YYYY-MM. */
export type MonthKey = string;
