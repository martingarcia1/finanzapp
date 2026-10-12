import type { DataBundle } from './finance'
import type { DollarRateCode } from './exchangeRates'

// localStorage solo guarda preferencias del navegador. Los datos financieros viven en el API
// (ver services/finance.ts); lo de abajo existe para migrar lo que quedó de versiones anteriores.

const SETTINGS_KEY = 'fa_settings'

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  userName: string
  // Cotización usada para convertir USD → ARS en totales y formularios
  dollarRateType: DollarRateCode
}

const DEFAULT_SETTINGS: AppSettings = { userName: 'Usuario', dollarRateType: 'blue' }

export const settingsService = {
  get(): AppSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  },
  set(data: Partial<AppSettings>): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...this.get(), ...data }))
  },
}

// ─── Datos locales de versiones anteriores ────────────────────────────────────

const LEGACY_KEYS: Record<keyof DataBundle, string> = {
  transactions: 'fa_transactions',
  recurring: 'fa_recurring',
  debts: 'fa_debts',
  savings: 'fa_savings',
  fixedExpenses: 'fa_fixed_expenses',
  wallets: 'fa_wallets',
}

const LEGACY_BACKUP_KEY = 'fa_local_backup'

function readArray(key: string): unknown[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const legacyLocalData = {
  /** Datos guardados en este navegador por la versión anterior, o null si no hay nada. */
  read(): { bundle: DataBundle; count: number } | null {
    const bundle = Object.fromEntries(
      Object.entries(LEGACY_KEYS).map(([k, key]) => [k, readArray(key)]),
    ) as unknown as DataBundle
    const count = Object.values(bundle).reduce((n, arr) => n + arr.length, 0)
    return count > 0 ? { bundle, count } : null
  },

  /** Borra los datos locales dejando una copia de respaldo por si algo sale mal. */
  clear(keepBackup = true): void {
    const current = this.read()
    if (keepBackup && current) {
      localStorage.setItem(LEGACY_BACKUP_KEY, JSON.stringify({ ...current.bundle, savedAt: new Date().toISOString() }))
    }
    Object.values(LEGACY_KEYS).forEach((key) => localStorage.removeItem(key))
  },
}
