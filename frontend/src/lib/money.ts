import type { Currency, Transaction } from '@/types'

const formatters: Record<Currency, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', currencyDisplay: 'code', maximumFractionDigits: 2 }),
}

/** Formatea un monto en su moneda. ARS: "$ 12.500" · USD: "USD 150,50" */
export function formatMoney(amount: number, currency: Currency = 'ARS'): string {
  return formatters[currency].format(amount)
}

/** Formatea una cotización con 2 decimales: "$ 1.234,50" */
export function formatRate(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(value)
}

/** Convierte un monto a ARS. `rate` es ARS por USD; sin cotización un monto en USD vale 0 para no inventar números. */
export function toARS(amount: number, currency: Currency | undefined, rate: number | null): number {
  if (!currency || currency === 'ARS') return amount
  return rate ? amount * rate : 0
}

/**
 * Valor en ARS de una transacción. Usa la cotización guardada al registrarla
 * (así las estadísticas históricas no cambian con el dólar de hoy) y si no tiene, la actual.
 */
export function transactionARS(tx: Transaction, currentRate: number | null): number {
  return toARS(tx.amount, tx.currency, tx.exchangeRate ?? currentRate)
}
