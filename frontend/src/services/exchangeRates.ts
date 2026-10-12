import api from './api'

/** oficial | blue | bolsa (MEP) | contadoconliqui | tarjeta | cripto | mayorista */
export type DollarRateCode =
  | 'oficial'
  | 'blue'
  | 'bolsa'
  | 'contadoconliqui'
  | 'tarjeta'
  | 'cripto'
  | 'mayorista'

export interface DollarRate {
  code: DollarRateCode
  name: string
  buy: number | null
  sell: number
  updatedAt: string
}

export interface ExchangeRatesResponse {
  rates: DollarRate[]
  fetchedAt: string
  stale: boolean
}

export const DOLLAR_RATE_LABELS: Record<DollarRateCode, string> = {
  oficial: 'Oficial',
  blue: 'Blue',
  bolsa: 'MEP',
  contadoconliqui: 'CCL',
  tarjeta: 'Tarjeta',
  cripto: 'Cripto',
  mayorista: 'Mayorista',
}

export async function fetchExchangeRates(): Promise<ExchangeRatesResponse> {
  const { data } = await api.get<ExchangeRatesResponse>('/exchange-rates')
  return data
}
