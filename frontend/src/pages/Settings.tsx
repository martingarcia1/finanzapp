import { useState, useEffect, useRef } from 'react'
import {
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  MenuItem,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import PersonIcon from '@mui/icons-material/Person'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import FingerprintIcon from '@mui/icons-material/Fingerprint'
import DeleteIcon from '@mui/icons-material/Delete'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import { settingsService } from '@/services/storage'
import { dataService, isDataBundle } from '@/services/finance'
import { useDataSummary, useRefresh } from '@/hooks/useFinanceData'
import api, { getApiErrorMessage } from '@/services/api'
import { useExchangeRates } from '@/context/ExchangeRateContext'
import { DOLLAR_RATE_LABELS, type DollarRateCode } from '@/services/exchangeRates'
import { formatRate } from '@/lib/money'
import { registerBiometric, isWebAuthnSupported } from '@/services/webauthn'

// ─── Sección contenedor ───────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <Avatar sx={{ bgcolor: '#f5f5f5', width: 36, height: 36 }}>{icon}</Avatar>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function Settings() {
  const { rates, rateType, setRateType } = useExchangeRates()
  const [userName, setUserName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [importMsg, setImportMsg] = useState('')
  const [clearOpen, setClearOpen] = useState(false)
  const [clearConfirm, setClearConfirm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Biométrica ──────────────────────────────────────────────────────────────
  interface FidoCred { id: string; deviceName: string | null; createdAt: string; lastUsedAt: string | null }
  const [credentials, setCredentials] = useState<FidoCred[]>([])
  const [bioDeviceName, setBioDeviceName] = useState('')
  const [bioLoading, setBioLoading] = useState(false)
  const [bioError, setBioError] = useState('')
  const [bioSuccess, setBioSuccess] = useState('')

  const loadCredentials = async () => {
    try {
      const { data } = await api.get('/auth/credentials')
      setCredentials(data)
    } catch { /* not logged in or no backend */ }
  }

  useEffect(() => { loadCredentials() }, [])

  const handleRegisterBiometric = async () => {
    setBioError(''); setBioSuccess('')
    setBioLoading(true)
    try {
      await registerBiometric(bioDeviceName || 'Mi dispositivo')
      setBioSuccess('Biométrica registrada correctamente')
      setBioDeviceName('')
      loadCredentials()
    } catch (e: unknown) {
      setBioError((e as { message?: string })?.message ?? 'Error al registrar')
    } finally {
      setBioLoading(false)
    }
  }

  const handleDeleteCredential = async (id: string) => {
    try {
      await api.delete(`/auth/credentials/${id}`)
      setCredentials((c) => c.filter((x) => x.id !== id))
    } catch { /* ignore */ }
  }

  useEffect(() => {
    setUserName(settingsService.get().userName)
  }, [])

  // Estadísticas
  const { data: summary } = useDataSummary()
  const refresh = useRefresh()
  const [busy, setBusy] = useState(false)
  const stats = [
    { label: 'Transacciones',  count: summary?.transactions,  color: '#1976d2' },
    { label: 'Recurrentes',    count: summary?.recurring,     color: '#7b1fa2' },
    { label: 'Deudas',         count: summary?.debts,         color: '#e65100' },
    { label: 'Metas',          count: summary?.savings,       color: '#2e7d32' },
    { label: 'Gastos fijos',   count: summary?.fixedExpenses, color: '#c62828' },
    { label: 'Billeteras',     count: summary?.wallets,       color: '#6a1b9a' },
  ]

  // ── Guardar nombre ──────────────────────────────────────────────────────────
  const handleSaveName = () => {
    if (!userName.trim()) return
    settingsService.set({ userName: userName.trim() })
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2500)
  }

  // ── Exportar ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setBusy(true)
    try {
      const data = { ...(await dataService.export()), settings: settingsService.get(), version: '2.0' }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finanzapp-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setImportStatus('error')
      setImportMsg(getApiErrorMessage(e, 'No se pudo exportar'))
    } finally {
      setBusy(false)
    }
  }

  // ── Importar (reemplaza los datos actuales) ─────────────────────────────────
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
      if (!isDataBundle(parsed)) throw new Error('Formato inválido')
    } catch {
      setImportStatus('error')
      setImportMsg('El archivo no es un backup válido de FinanzApp.')
      return
    }

    setBusy(true)
    try {
      const result = await dataService.import(parsed, true)
      const backup = parsed as { settings?: { userName?: string } }
      if (backup.settings?.userName) {
        settingsService.set({ userName: backup.settings.userName })
        setUserName(backup.settings.userName)
      }
      await refresh()
      setImportStatus('success')
      setImportMsg(`Backup restaurado: ${result.transactions} transacciones, ${result.wallets} billeteras y más.`)
    } catch (err) {
      setImportStatus('error')
      setImportMsg(getApiErrorMessage(err, 'No se pudo importar el backup'))
    } finally {
      setBusy(false)
    }
  }

  // ── Limpiar datos ────────────────────────────────────────────────────────────
  const handleClear = async () => {
    if (clearConfirm !== 'BORRAR') return
    setBusy(true)
    try {
      await dataService.deleteAll()
      await refresh()
      setImportStatus('success')
      setImportMsg('Todos los datos fueron eliminados.')
    } catch (err) {
      setImportStatus('error')
      setImportMsg(getApiErrorMessage(err, 'No se pudieron eliminar los datos'))
    } finally {
      setBusy(false)
      setClearOpen(false)
      setClearConfirm('')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="mb-6">
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Ajustes</Typography>
        <Typography variant="body2" color="text.secondary">
          Configuración y gestión de datos
        </Typography>
      </div>

      {importStatus !== 'idle' && (
        <Alert
          severity={importStatus}
          onClose={() => setImportStatus('idle')}
        >
          {importMsg}
        </Alert>
      )}

      {/* ── Perfil ── */}
      <Section title="Perfil" icon={<PersonIcon sx={{ color: '#1976d2' }} />}>
        <div className="flex gap-3 items-start">
          <TextField
            label="Tu nombre"
            fullWidth
            value={userName}
            onChange={(e) => { setUserName(e.target.value); setNameSaved(false) }}
            placeholder="Ej: Martín"
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSaveName}
            disabled={!userName.trim()}
            startIcon={nameSaved ? <CheckCircleIcon /> : undefined}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {nameSaved ? 'Guardado' : 'Guardar'}
          </Button>
        </div>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Se muestra en el saludo del Dashboard.
        </Typography>
      </Section>

      {/* ── Moneda ── */}
      <Section title="Dólar de referencia" icon={<CurrencyExchangeIcon sx={{ color: '#00796b' }} />}>
        <TextField
          select
          label="Cotización para convertir USD a pesos"
          fullWidth
          size="small"
          value={rateType}
          onChange={(e) => setRateType(e.target.value as DollarRateCode)}
        >
          {(Object.keys(DOLLAR_RATE_LABELS) as DollarRateCode[]).map((code) => {
            const r = rates.find((x) => x.code === code)
            return (
              <MenuItem key={code} value={code}>
                Dólar {DOLLAR_RATE_LABELS[code]}{r ? ` — venta ${formatRate(r.sell)}` : ''}
              </MenuItem>
            )
          })}
        </TextField>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Se usa para valuar billeteras, metas y deudas en dólares y para proponer la cotización
          al cargar una transacción en USD. Las transacciones guardan la cotización del día en que se cargaron.
        </Typography>
      </Section>

      {/* ── Estadísticas ── */}
      <Section title="Estadísticas de uso" icon={<SettingsIcon sx={{ color: '#607d8b' }} />}>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center py-3 rounded-lg bg-gray-50">
              <Typography variant="h5" sx={{ fontWeight: 800, color: s.color }}>
                {s.count ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Exportar / Importar ── */}
      <Section title="Copia de seguridad" icon={<DownloadIcon sx={{ color: '#2e7d32' }} />}>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Exportar datos</Typography>
              <Typography variant="caption" color="text.secondary">
                Descargá un archivo JSON con todos tus datos: transacciones, billeteras, deudas, ahorros y más.
              </Typography>
            </div>
            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={busy}
              sx={{ flexShrink: 0 }}
            >
              Exportar
            </Button>
          </div>

          <Divider />

          <div className="flex items-start justify-between gap-4">
            <div>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Importar datos</Typography>
              <Typography variant="caption" color="text.secondary">
                Restaurá un backup previo. <strong>Reemplaza todos los datos actuales.</strong>
              </Typography>
            </div>
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                sx={{ flexShrink: 0 }}
              >
                Importar
              </Button>
            </>
          </div>
        </div>
      </Section>

      {/* ── Limpiar datos ── */}
      <Section title="Zona peligrosa" icon={<DeleteForeverIcon sx={{ color: '#c62828' }} />}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Eliminar todos los datos
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Borra permanentemente todas las transacciones, billeteras, deudas, ahorros y gastos fijos.
              Esta acción no se puede deshacer.
            </Typography>
          </div>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => { setClearOpen(true); setClearConfirm('') }}
            sx={{ flexShrink: 0 }}
          >
            Limpiar todo
          </Button>
        </div>
      </Section>

      {/* ── Biométrica ── */}
      {isWebAuthnSupported() && (
        <Section title="Acceso biométrico" icon={<FingerprintIcon sx={{ color: '#1565c0' }} />}>
          {bioError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBioError('')}>{bioError}</Alert>}
          {bioSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setBioSuccess('')}>{bioSuccess}</Alert>}

          {credentials.length > 0 && (
            <>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Dispositivos registrados</Typography>
              <List dense disablePadding sx={{ mb: 2 }}>
                {credentials.map((c) => (
                  <ListItem key={c.id} disablePadding sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={c.deviceName ?? 'Dispositivo'}
                      secondary={`Registrado ${new Date(c.createdAt).toLocaleDateString('es-AR')}${c.lastUsedAt ? ` · Último uso ${new Date(c.lastUsedAt).toLocaleDateString('es-AR')}` : ''}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton size="small" color="error" onClick={() => handleDeleteCredential(c.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ mb: 2 }} />
            </>
          )}

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Agregar dispositivo</Typography>
          <div className="flex gap-3 items-start">
            <TextField
              label="Nombre del dispositivo"
              size="small"
              fullWidth
              value={bioDeviceName}
              onChange={(e) => setBioDeviceName(e.target.value)}
              placeholder="Ej: Mi celular, Laptop"
            />
            <Button
              variant="contained"
              startIcon={bioLoading ? <CircularProgress size={16} color="inherit" /> : <FingerprintIcon />}
              onClick={handleRegisterBiometric}
              disabled={bioLoading}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Registrar
            </Button>
          </div>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Se usará huella dactilar, Face ID o Windows Hello según tu dispositivo.
          </Typography>
        </Section>
      )}

      {/* ── Acerca de ── */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 text-center">
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1976d2' }}>FinanzApp</Typography>
        <Typography variant="caption" color="text.secondary">
          v2.0 · Tus datos se guardan en tu cuenta
        </Typography>
      </div>

      {/* ── Dialog confirmar borrado ── */}
      <Dialog open={clearOpen} onClose={() => setClearOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#c62828', fontWeight: 700 }}>
          ¿Eliminar todos los datos?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Esta acción eliminará <strong>todos</strong> tus datos permanentemente.
            No hay forma de recuperarlos salvo que tengas un backup exportado previamente.
          </Typography>
          <TextField
            label='Escribí BORRAR para confirmar'
            fullWidth
            value={clearConfirm}
            onChange={(e) => setClearConfirm(e.target.value.toUpperCase())}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setClearOpen(false)} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleClear}
            disabled={busy || clearConfirm !== 'BORRAR'}
            startIcon={<DeleteForeverIcon />}
          >
            Eliminar todo
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
