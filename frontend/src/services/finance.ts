import api from './api'
import type {
  Transaction,
  RecurringTransaction,
  Debt,
  SavingsGoal,
  FixedExpense,
  Wallet,
  TransactionFormData,
  RecurringTransactionFormData,
  DebtFormData,
  SavingsGoalFormData,
  FixedExpenseFormData,
  WalletFormData,
} from '@/types'

// Los formularios usan '' para "sin fecha"; el API espera null (DateOnly?).
const optionalDate = (d?: string | null) => (d ? d : null)

function crud<T, F>(path: string, toBody: (data: F) => unknown = (d) => d) {
  return {
    async getAll(): Promise<T[]> {
      const { data } = await api.get<T[]>(path)
      return data
    },
    async create(form: F): Promise<T> {
      const { data } = await api.post<T>(path, toBody(form))
      return data
    },
    async update(id: string, form: F): Promise<T> {
      const { data } = await api.put<T>(`${path}/${id}`, toBody(form))
      return data
    },
    async delete(id: string): Promise<void> {
      await api.delete(`${path}/${id}`)
    },
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactionService = crud<Transaction, TransactionFormData>('/transactions')

// ─── Recurring ────────────────────────────────────────────────────────────────

export const recurringService = {
  ...crud<RecurringTransaction, RecurringTransactionFormData>('/recurring', (f) => ({
    ...f,
    daysOfWeek: f.daysOfWeek ?? (f.dayOfWeek !== undefined ? [f.dayOfWeek] : null),
    endDate: optionalDate(f.endDate),
  })),
  async toggleActive(id: string): Promise<RecurringTransaction> {
    const { data } = await api.patch<RecurringTransaction>(`/recurring/${id}/toggle-active`)
    return data
  },
}

// ─── Debts ────────────────────────────────────────────────────────────────────

/** El update del API recibe el estado completo (incluye originalAmount e isPaid). */
export type DebtUpdateData = DebtFormData & Pick<Debt, 'originalAmount' | 'isPaid'>

const debtBody = (f: DebtFormData) => ({ ...f, dueDate: optionalDate(f.dueDate) })

export const debtService = {
  ...crud<Debt, DebtFormData>('/debts', debtBody),
  async update(id: string, form: DebtUpdateData): Promise<Debt> {
    const { data } = await api.put<Debt>(`/debts/${id}`, debtBody(form))
    return data
  },
  async partialPayment(id: string, amount: number): Promise<Debt> {
    const { data } = await api.post<Debt>(`/debts/${id}/payment`, { amount })
    return data
  },
  async markPaid(id: string): Promise<Debt> {
    const { data } = await api.post<Debt>(`/debts/${id}/mark-paid`)
    return data
  },
}

// ─── Savings ──────────────────────────────────────────────────────────────────

export const savingsService = {
  ...crud<SavingsGoal, SavingsGoalFormData>('/savings', (f) => ({ ...f, deadline: optionalDate(f.deadline) })),
  async addFunds(id: string, amount: number): Promise<SavingsGoal> {
    const { data } = await api.post<SavingsGoal>(`/savings/${id}/add-funds`, { amount })
    return data
  },
}

// ─── Fixed expenses ───────────────────────────────────────────────────────────

export const fixedExpenseService = crud<FixedExpense, FixedExpenseFormData>('/fixed-expenses')

// ─── Wallets ──────────────────────────────────────────────────────────────────

export const walletService = {
  ...crud<Wallet, WalletFormData>('/wallets'),
  async adjustBalance(id: string, delta: number): Promise<Wallet> {
    const { data } = await api.post<Wallet>(`/wallets/${id}/adjust`, { delta })
    return data
  },
  /** `toAmount`: lo que se acredita en destino si las monedas difieren (compra/venta de USD). */
  async transfer(fromWalletId: string, toWalletId: string, amount: number, toAmount?: number): Promise<void> {
    await api.post('/wallets/transfer', { fromWalletId, toWalletId, amount, toAmount })
  },
}

// ─── Datos de la cuenta ───────────────────────────────────────────────────────

export interface DataSummary {
  transactions: number
  recurring: number
  debts: number
  savings: number
  fixedExpenses: number
  wallets: number
}

export interface DataBundle {
  transactions: Transaction[]
  recurring: RecurringTransaction[]
  debts: Debt[]
  savings: SavingsGoal[]
  fixedExpenses: FixedExpense[]
  wallets: Wallet[]
}

export function isDataBundle(obj: unknown): obj is DataBundle {
  if (typeof obj !== 'object' || obj === null) return false
  const b = obj as Record<string, unknown>
  return ['transactions', 'recurring', 'debts', 'savings', 'fixedExpenses', 'wallets']
    .every((k) => b[k] === undefined || Array.isArray(b[k]))
}

/** Normaliza datos viejos (localStorage o backups) al formato que acepta /data/import. */
function toImportPayload(b: Partial<DataBundle>) {
  return {
    transactions: b.transactions ?? [],
    recurring: (b.recurring ?? []).map((r) => ({ ...r, endDate: optionalDate(r.endDate) })),
    debts: (b.debts ?? []).map((d) => ({ ...d, dueDate: optionalDate(d.dueDate), paidAt: d.paidAt || null })),
    savings: (b.savings ?? []).map((s) => ({ ...s, deadline: optionalDate(s.deadline), completedAt: s.completedAt || null })),
    fixedExpenses: b.fixedExpenses ?? [],
    wallets: b.wallets ?? [],
  }
}

export const dataService = {
  async summary(): Promise<DataSummary> {
    const { data } = await api.get<DataSummary>('/data/summary')
    return data
  },
  async export(): Promise<DataBundle & { exportedAt: string }> {
    const { data } = await api.get('/data/export')
    return data
  },
  /** `replace`: borra los datos actuales antes de importar (restaurar backup), todo en una transacción. */
  async import(bundle: Partial<DataBundle>, replace = false): Promise<DataSummary> {
    const { data } = await api.post<DataSummary>('/data/import', toImportPayload(bundle), { params: { replace } })
    return data
  },
  async deleteAll(): Promise<void> {
    await api.delete('/data')
  },
}

// ─── Helpers de consulta ──────────────────────────────────────────────────────

/** Filtra por mes comparando el string YYYY-MM-DD (evita el corrimiento de zona horaria de `new Date('YYYY-MM-DD')`). */
export function transactionsInMonth(txs: Transaction[], year: number, month: number): Transaction[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  return txs.filter((t) => t.date.startsWith(prefix))
}
