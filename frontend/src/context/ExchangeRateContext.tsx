import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { fetchExchangeRates, type DollarRate, type DollarRateCode } from '@/services/exchangeRates'
import { settingsService } from '@/services/storage'
import { toARS as convertToARS } from '@/lib/money'
import type { Currency } from '@/types'

const REFRESH_MS = 5 * 60 * 1000

interface ExchangeRateContextType {
  rates: DollarRate[]
  loading: boolean
  error: string | null
  /** true si el backend devolvió la última cotización conocida porque la fuente falló */
  stale: boolean
  fetchedAt: Date | null
  /** Tipo de dólar elegido para convertir (Ajustes) */
  rateType: DollarRateCode
  setRateType: (code: DollarRateCode) => void
  /** Cotización activa (precio de venta del tipo elegido), ARS por USD */
  rate: DollarRate | null
  toARS: (amount: number, currency?: Currency) => number
  refresh: () => Promise<void>
}

const ExchangeRateContext = createContext<ExchangeRateContextType | null>(null)

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<DollarRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [rateType, setRateTypeState] = useState<DollarRateCode>(() => settingsService.get().dollarRateType)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchExchangeRates()
      setRates(data.rates)
      setStale(data.stale)
      setFetchedAt(new Date(data.fetchedAt))
      setError(null)
    } catch {
      setError('No se pudieron cargar las cotizaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  const setRateType = useCallback((code: DollarRateCode) => {
    settingsService.set({ dollarRateType: code })
    setRateTypeState(code)
  }, [])

  const rate = useMemo(
    () => rates.find((r) => r.code === rateType) ?? rates.find((r) => r.code === 'oficial') ?? null,
    [rates, rateType],
  )

  const toARS = useCallback(
    (amount: number, currency?: Currency) => convertToARS(amount, currency, rate?.sell ?? null),
    [rate],
  )

  return (
    <ExchangeRateContext.Provider
      value={{ rates, loading, error, stale, fetchedAt, rateType, setRateType, rate, toARS, refresh }}
    >
      {children}
    </ExchangeRateContext.Provider>
  )
}

export function useExchangeRates() {
  const ctx = useContext(ExchangeRateContext)
  if (!ctx) throw new Error('useExchangeRates must be used inside ExchangeRateProvider')
  return ctx
}
