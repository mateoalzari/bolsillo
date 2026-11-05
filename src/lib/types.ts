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
/** Categoría de gasto. */
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const INCOME_CATEGORY_IDS = ['sueldo', 'freelance', 'otros_ingresos'] as const;
export type IncomeCategoryId = (typeof INCOME_CATEGORY_IDS)[number];

export type AnyCategoryId = CategoryId | IncomeCategoryId;

export type MovementType = 'expense' | 'income';

export const PAYMENT_METHODS = ['efectivo', 'debito', 'credito', 'transferencia'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
};

export const MAX_INSTALLMENTS = 24;

/** Datos de una cuota: la compra original se reparte en una fila por mes. */
export interface InstallmentInfo {
  /** Identifica la compra: todas sus cuotas comparten este id. */
  purchaseId: string;
  /** Número de cuota (1 a count). */
  number: number;
  count: number;
  /** Monto total de la compra. */
  totalAmount: number;
}

/** Un gasto o un ingreso. */
export interface Movement {
  id: string;
  type: MovementType;
  /** Monto en pesos, entero. En una cuota, el monto de esa cuota. */
  amount: number;
  category: AnyCategoryId;
  /** Fecha local en formato YYYY-MM-DD. */
  date: string;
  description: string;
  method: PaymentMethod;
  /** Marca de tiempo de creación, para desempatar el orden dentro de un mismo día. */
  createdAt: number;
  /** Si lo generó un gasto o ingreso fijo mensual. */
  recurringId?: string;
  installment?: InstallmentInfo;
}

/** Gasto o ingreso fijo mensual: se genera solo cada mes en el día indicado. */
export interface RecurringRule {
  id: string;
  type: MovementType;
  amount: number;
  category: AnyCategoryId;
  description: string;
  method: PaymentMethod;
  /** Día del mes (si el mes es más corto, se usa el último día). */
  day: number;
  /** Primer mes en que corre. */
  startMonth: MonthKey;
  /** Último mes en que corre (inclusive). Sin valor: sigue indefinidamente. */
  endMonth?: MonthKey;
  /** Meses en los que se borró a mano: no se vuelven a generar. */
  skipped: MonthKey[];
}

/** Mes en formato YYYY-MM. */
export type MonthKey = string;
