import { useState, useEffect, useRef } from 'react'
import {
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import PersonIcon from '@mui/icons-material/Person'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import FingerprintIcon from '@mui/icons-material/Fingerprint'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  transactionService,
  recurringService,
  debtService,
  savingsService,
  fixedExpenseService,
  walletService,
  settingsService,
} from '@/services/storage'
import api from '@/services/api'
import { registerBiometric, isWebAuthnSupported } from '@/services/webauthn'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAllData() {
  return {
    transactions: transactionService.getAll(),
    recurring: recurringService.getAll(),
    debts: debtService.getAll(),
    savings: savingsService.getAll(),
    fixedExpenses: fixedExpenseService.getAll(),
    wallets: walletService.getAll(),
    settings: settingsService.get(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }
}

type BackupData = ReturnType<typeof getAllData>

function isValidBackup(obj: unknown): obj is BackupData {
  if (typeof obj !== 'object' || obj === null) return false
  const b = obj as Record<string, unknown>
  return (
    Array.isArray(b.transactions) &&
    Array.isArray(b.recurring) &&
    Array.isArray(b.debts) &&
    Array.isArray(b.savings) &&
    Array.isArray(b.fixedExpenses) &&
    Array.isArray(b.wallets)
  )
}

function storageUsageKB(): number {
  let total = 0
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('fa_')) {
      total += (localStorage.getItem(key) ?? '').length
    }
  }
  return Math.round(total / 102.4) / 10
}

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
  const stats = [
    { label: 'Transacciones',  count: transactionService.getAll().length,   color: '#1976d2' },
    { label: 'Recurrentes',    count: recurringService.getAll().length,      color: '#7b1fa2' },
    { label: 'Deudas',         count: debtService.getAll().length,           color: '#e65100' },
    { label: 'Metas',          count: savingsService.getAll().length,        color: '#2e7d32' },
    { label: 'Gastos fijos',   count: fixedExpenseService.getAll().length,   color: '#c62828' },
    { label: 'Billeteras',     count: walletService.getAll().length,         color: '#6a1b9a' },
  ]

  // ── Guardar nombre ──────────────────────────────────────────────────────────
  const handleSaveName = () => {
    if (!userName.trim()) return
    settingsService.set({ userName: userName.trim() })
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2500)
  }

  // ── Exportar ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = getAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finanzapp-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Importar ────────────────────────────────────────────────────────────────
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (!isValidBackup(parsed)) throw new Error('Formato inválido')

        localStorage.setItem('fa_transactions', JSON.stringify(parsed.transactions))
        localStorage.setItem('fa_recurring', JSON.stringify(parsed.recurring))
        localStorage.setItem('fa_debts', JSON.stringify(parsed.debts))
        localStorage.setItem('fa_savings', JSON.stringify(parsed.savings))
        localStorage.setItem('fa_fixed_expenses', JSON.stringify(parsed.fixedExpenses))
        localStorage.setItem('fa_wallets', JSON.stringify(parsed.wallets))
        if (parsed.settings) localStorage.setItem('fa_settings', JSON.stringify(parsed.settings))

        setImportStatus('success')
        setImportMsg(`Datos importados correctamente. Exportado el ${new Date(parsed.exportedAt).toLocaleDateString('es-AR')}.`)
        if (parsed.settings?.userName) setUserName(parsed.settings.userName)
      } catch {
        setImportStatus('error')
        setImportMsg('El archivo no es un backup válido de FinanzApp.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Limpiar datos ────────────────────────────────────────────────────────────
  const handleClear = () => {
    if (clearConfirm !== 'BORRAR') return
    localStorage.removeItem('fa_transactions')
    localStorage.removeItem('fa_recurring')
    localStorage.removeItem('fa_debts')
    localStorage.removeItem('fa_savings')
    localStorage.removeItem('fa_fixed_expenses')
    localStorage.removeItem('fa_wallets')
    setClearOpen(false)
    setClearConfirm('')
    setImportStatus('success')
    setImportMsg('Todos los datos fueron eliminados.')
  }

  const usageKB = storageUsageKB()

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

      {/* ── Estadísticas ── */}
      <Section title="Estadísticas de uso" icon={<SettingsIcon sx={{ color: '#607d8b' }} />}>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center py-3 rounded-lg bg-gray-50">
              <Typography variant="h5" sx={{ fontWeight: 800, color: s.color }}>
                {s.count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </div>
          ))}
        </div>
        <Divider sx={{ mb: 2 }} />
        <div className="flex items-center justify-between">
          <Typography variant="body2" color="text.secondary">Espacio usado en localStorage</Typography>
          <Chip label={`${usageKB} KB`} size="small" variant="outlined" />
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
          v1.0 · Datos almacenados en localStorage del navegador
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
            disabled={clearConfirm !== 'BORRAR'}
            onClick={handleClear}
            startIcon={<DeleteForeverIcon />}
          >
            Eliminar todo
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
