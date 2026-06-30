// ─── Enums ───────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense'
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'transfer' | 'personal_pay' | 'mercado_pago'
export type RecurrencePattern = 'weekly' | 'monthly'
export type DebtDirection = 'owed_to_me' | 'i_owe'
export type WalletType = 'cash' | 'bank' | 'mercado_pago' | 'personal_pay' | 'crypto' | 'other'

// ─── Entities ────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string
  date: string           // ISO date string
  paymentMethod: PaymentMethod
  createdAt: string
}

export interface RecurringTransaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string
  paymentMethod: PaymentMethod
  pattern: RecurrencePattern
  dayOfWeek?: number     // legacy – 0-6 si es weekly (single day)
  daysOfWeek?: number[]  // 0-6, múltiples días para weekly
  dayOfMonth?: number    // 1-31 si es monthly
  startDate: string
  endDate?: string
  isActive: boolean
  createdAt: string
}

export interface Debt {
  id: string
  direction: DebtDirection
  personName: string
  amount: number
  originalAmount: number
  description: string
  dueDate?: string
  isPaid: boolean
  paidAt?: string
  createdAt: string
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  description: string
  isCompleted: boolean
  completedAt?: string
  createdAt: string
}

export interface Wallet {
  id: string
  name: string
  type: WalletType
  balance: number
  color: string
  description: string
  createdAt: string
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  category: string
  dayOfMonth: number
  description: string
  isActive: boolean
  createdAt: string
}

// ─── DTOs / Forms ─────────────────────────────────────────────────────────────

export type TransactionFormData = Omit<Transaction, 'id' | 'createdAt'>
export type RecurringTransactionFormData = Omit<RecurringTransaction, 'id' | 'createdAt'>
export type DebtFormData = Omit<Debt, 'id' | 'createdAt' | 'isPaid' | 'paidAt' | 'originalAmount'>
export type SavingsGoalFormData = Omit<SavingsGoal, 'id' | 'createdAt' | 'isCompleted' | 'completedAt'>
export type WalletFormData = Omit<Wallet, 'id' | 'createdAt'>
export type FixedExpenseFormData = Omit<FixedExpense, 'id' | 'createdAt'>

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  monthIncome: number
  monthExpenses: number
  monthBalance: number
  totalDebtOwed: number       // me deben
  totalDebtIOwe: number       // debo
  totalSavings: number
  savingsGoalProgress: { name: string; progress: number }[]
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const INCOME_CATEGORIES = [
  'Desarrollador de Software',
  'Profesor Particular',
  'Reparto de Sodería',
  'Reparacion de Celulares',
  'Venta de accesorios de celular',
  'Otro ingreso',
] as const

export const EXPENSE_CATEGORIES = [
  'Alimentación',
  'Transporte',
  'Servicios',
  'Salud',
  'Entretenimiento',
  'Ropa',
  'Educación',
  'Hogar',
  'Tecnología',
  'Deporte',
  'Viajes',
  'Otro gasto',
] as const

export const WALLET_TYPES: { value: WalletType; label: string; color: string }[] = [
  { value: 'cash',         label: 'Efectivo',      color: '#4caf50' },
  { value: 'bank',         label: 'Banco',         color: '#1976d2' },
  { value: 'mercado_pago', label: 'Mercado Pago',  color: '#00b1ea' },
  { value: 'personal_pay', label: 'Personal Pay',  color: '#7b1fa2' },
  { value: 'crypto',       label: 'Crypto',        color: '#f57c00' },
  { value: 'other',        label: 'Otra',          color: '#607d8b' },
]

export const WALLET_COLORS = [
  '#1976d2', '#4caf50', '#f57c00', '#7b1fa2',
  '#c62828', '#00796b', '#607d8b', '#00b1ea',
]

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'personal_pay', label: 'Personal Pay' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
]
