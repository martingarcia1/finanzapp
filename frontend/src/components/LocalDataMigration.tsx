import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { legacyLocalData } from '@/services/storage'
import { dataService } from '@/services/finance'
import { getApiErrorMessage } from '@/services/api'
import { useRefresh } from '@/hooks/useFinanceData'

const LABELS: Record<string, string> = {
  transactions: 'transacciones',
  recurring: 'recurrentes',
  debts: 'deudas',
  savings: 'metas de ahorro',
  fixedExpenses: 'gastos fijos',
  wallets: 'billeteras',
}

/**
 * Las versiones anteriores guardaban todo en localStorage. Si quedan datos en este
 * navegador, se ofrece subirlos a la cuenta una sola vez.
 */
export default function LocalDataMigration() {
  const [local, setLocal] = useState(() => legacyLocalData.read())
  const [step, setStep] = useState<'ask' | 'confirmDiscard'>('ask')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const refresh = useRefresh()

  if (!local) return null

  const breakdown = Object.entries(local.bundle)
    .filter(([, items]) => items.length > 0)
    .map(([k, items]) => `${items.length} ${LABELS[k]}`)
    .join(', ')

  const handleUpload = async () => {
    setUploading(true)
    setError('')
    try {
      await dataService.import(local.bundle)
      legacyLocalData.clear()
      await refresh()
      setLocal(null)
    } catch (e) {
      setError(getApiErrorMessage(e, 'No se pudieron subir los datos'))
    } finally {
      setUploading(false)
    }
  }

  const handleDiscard = () => {
    legacyLocalData.clear()
    setLocal(null)
  }

  return (
    <Dialog open fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudUploadIcon color="primary" /> Pasá tus datos a la nube
      </DialogTitle>
      <DialogContent className="space-y-3">
        {step === 'ask' ? (
          <>
            <Typography variant="body2">
              Encontramos <strong>{local.count} registros</strong> guardados solo en este navegador ({breakdown}).
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ahora FinanzApp guarda todo en tu cuenta, así lo ves desde cualquier dispositivo y no se pierde
              si borrás el navegador. ¿Querés subirlos a tu cuenta?
            </Typography>
          </>
        ) : (
          <Alert severity="warning">
            Los datos de este navegador no se van a subir a tu cuenta. Se guarda una copia de respaldo local,
            pero no vas a verlos en la app.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === 'ask' ? (
          <>
            <Button color="inherit" onClick={() => setStep('confirmDiscard')} disabled={uploading}>
              No subir
            </Button>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
            >
              {uploading ? 'Subiendo…' : 'Subir a mi cuenta'}
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" onClick={() => setStep('ask')}>Volver</Button>
            <Button color="error" variant="contained" onClick={handleDiscard}>Descartar</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
