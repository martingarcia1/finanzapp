import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  transactionService,
  recurringService,
  debtService,
  savingsService,
  fixedExpenseService,
  walletService,
  dataService,
} from '@/services/finance'

export const queryKeys = {
  transactions: ['transactions'],
  recurring: ['recurring'],
  debts: ['debts'],
  savings: ['savings'],
  fixedExpenses: ['fixed-expenses'],
  wallets: ['wallets'],
  dataSummary: ['data-summary'],
} as const

export type FinanceKey = keyof typeof queryKeys

export const useTransactions = () =>
  useQuery({ queryKey: queryKeys.transactions, queryFn: transactionService.getAll })

export const useRecurring = () =>
  useQuery({ queryKey: queryKeys.recurring, queryFn: recurringService.getAll })

export const useDebts = () =>
  useQuery({ queryKey: queryKeys.debts, queryFn: debtService.getAll })

export const useSavings = () =>
  useQuery({ queryKey: queryKeys.savings, queryFn: savingsService.getAll })

export const useFixedExpenses = () =>
  useQuery({ queryKey: queryKeys.fixedExpenses, queryFn: fixedExpenseService.getAll })

export const useWallets = () =>
  useQuery({ queryKey: queryKeys.wallets, queryFn: walletService.getAll })

export const useDataSummary = () =>
  useQuery({ queryKey: queryKeys.dataSummary, queryFn: dataService.summary })

/**
 * Devuelve una función que vuelve a pedir al servidor los datos indicados
 * (y el resumen de la cuenta). Sin argumentos refresca todo.
 */
export function useRefresh() {
  const qc = useQueryClient()
  return useCallback(
    (...keys: FinanceKey[]) => {
      const targets = keys.length ? [...keys, 'dataSummary' as const] : (Object.keys(queryKeys) as FinanceKey[])
      return Promise.all(targets.map((k) => qc.invalidateQueries({ queryKey: queryKeys[k] })))
    },
    [qc],
  )
}
