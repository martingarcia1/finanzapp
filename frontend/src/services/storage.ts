import type {
  Transaction,
  RecurringTransaction,
  Debt,
  SavingsGoal,
  FixedExpense,
  TransactionFormData,
  RecurringTransactionFormData,
  DebtFormData,
  SavingsGoalFormData,
  FixedExpenseFormData,
} from '@/types'

const KEYS = {
  transactions: 'fa_transactions',
  recurring: 'fa_recurring',
  debts: 'fa_debts',
  savings: 'fa_savings',
  fixedExpenses: 'fa_fixed_expenses',
} as const

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getAll<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function saveAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactionService = {
  getAll(): Transaction[] {
    return getAll<Transaction>(KEYS.transactions)
  },

  getById(id: string): Transaction | undefined {
    return this.getAll().find((t) => t.id === id)
  },

  create(data: TransactionFormData): Transaction {
    const item: Transaction = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    const all = this.getAll()
    saveAll(KEYS.transactions, [item, ...all])
    return item
  },

  update(id: string, data: Partial<TransactionFormData>): Transaction | null {
    const all = this.getAll()
    const idx = all.findIndex((t) => t.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...data }
    saveAll(KEYS.transactions, all)
    return all[idx]
  },

  delete(id: string): void {
    saveAll(KEYS.transactions, this.getAll().filter((t) => t.id !== id))
  },

  getByMonth(year: number, month: number): Transaction[] {
    return this.getAll().filter((t) => {
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
  },
}

// ─── Recurring Transactions ───────────────────────────────────────────────────

export const recurringService = {
  getAll(): RecurringTransaction[] {
    return getAll<RecurringTransaction>(KEYS.recurring)
  },

  create(data: RecurringTransactionFormData): RecurringTransaction {
    const item: RecurringTransaction = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    const all = this.getAll()
    saveAll(KEYS.recurring, [item, ...all])
    return item
  },

  update(id: string, data: Partial<RecurringTransactionFormData>): RecurringTransaction | null {
    const all = this.getAll()
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...data }
    saveAll(KEYS.recurring, all)
    return all[idx]
  },

  delete(id: string): void {
    saveAll(KEYS.recurring, this.getAll().filter((r) => r.id !== id))
  },

  toggleActive(id: string): void {
    const all = this.getAll()
    const idx = all.findIndex((r) => r.id === id)
    if (idx !== -1) {
      all[idx].isActive = !all[idx].isActive
      saveAll(KEYS.recurring, all)
    }
  },
}

// ─── Debts ────────────────────────────────────────────────────────────────────

export const debtService = {
  getAll(): Debt[] {
    return getAll<Debt>(KEYS.debts)
  },

  create(data: DebtFormData): Debt {
    const item: Debt = {
      ...data,
      id: generateId(),
      originalAmount: data.amount,
      isPaid: false,
      createdAt: new Date().toISOString(),
    }
    const all = this.getAll()
    saveAll(KEYS.debts, [item, ...all])
    return item
  },

  update(id: string, data: Partial<DebtFormData>): Debt | null {
    const all = this.getAll()
    const idx = all.findIndex((d) => d.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...data }
    saveAll(KEYS.debts, all)
    return all[idx]
  },

  markPaid(id: string): void {
    const all = this.getAll()
    const idx = all.findIndex((d) => d.id === id)
    if (idx !== -1) {
      all[idx].isPaid = true
      all[idx].paidAt = new Date().toISOString()
      all[idx].amount = 0
      saveAll(KEYS.debts, all)
    }
  },

  partialPayment(id: string, amount: number): void {
    const all = this.getAll()
    const idx = all.findIndex((d) => d.id === id)
    if (idx !== -1) {
      all[idx].amount = Math.max(0, all[idx].amount - amount)
      if (all[idx].amount === 0) {
        all[idx].isPaid = true
        all[idx].paidAt = new Date().toISOString()
      }
      saveAll(KEYS.debts, all)
    }
  },

  delete(id: string): void {
    saveAll(KEYS.debts, this.getAll().filter((d) => d.id !== id))
  },
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export const savingsService = {
  getAll(): SavingsGoal[] {
    return getAll<SavingsGoal>(KEYS.savings)
  },

  create(data: SavingsGoalFormData): SavingsGoal {
    const item: SavingsGoal = {
      ...data,
      id: generateId(),
      isCompleted: false,
      createdAt: new Date().toISOString(),
    }
    const all = this.getAll()
    saveAll(KEYS.savings, [item, ...all])
    return item
  },

  update(id: string, data: Partial<SavingsGoalFormData>): SavingsGoal | null {
    const all = this.getAll()
    const idx = all.findIndex((s) => s.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...data }
    if (all[idx].currentAmount >= all[idx].targetAmount && !all[idx].isCompleted) {
      all[idx].isCompleted = true
      all[idx].completedAt = new Date().toISOString()
    }
    saveAll(KEYS.savings, all)
    return all[idx]
  },

  addFunds(id: string, amount: number): void {
    const all = this.getAll()
    const idx = all.findIndex((s) => s.id === id)
    if (idx !== -1) {
      all[idx].currentAmount = Math.min(all[idx].currentAmount + amount, all[idx].targetAmount)
      if (all[idx].currentAmount >= all[idx].targetAmount) {
        all[idx].isCompleted = true
        all[idx].completedAt = new Date().toISOString()
      }
      saveAll(KEYS.savings, all)
    }
  },

  delete(id: string): void {
    saveAll(KEYS.savings, this.getAll().filter((s) => s.id !== id))
  },
}

// ─── Fixed Expenses ───────────────────────────────────────────────────────────

export const fixedExpenseService = {
  getAll(): FixedExpense[] {
    return getAll<FixedExpense>(KEYS.fixedExpenses)
  },

  create(data: FixedExpenseFormData): FixedExpense {
    const item: FixedExpense = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    const all = this.getAll()
    saveAll(KEYS.fixedExpenses, [item, ...all])
    return item
  },

  update(id: string, data: Partial<FixedExpenseFormData>): FixedExpense | null {
    const all = this.getAll()
    const idx = all.findIndex((f) => f.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...data }
    saveAll(KEYS.fixedExpenses, all)
    return all[idx]
  },

  delete(id: string): void {
    saveAll(KEYS.fixedExpenses, this.getAll().filter((f) => f.id !== id))
  },

  getTotalMonthly(): number {
    return this.getAll()
      .filter((f) => f.isActive)
      .reduce((sum, f) => sum + f.amount, 0)
  },
}
