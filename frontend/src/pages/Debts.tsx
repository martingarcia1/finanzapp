import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  LinearProgress,
  InputAdornment,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonIcon from '@mui/icons-material/Person'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { debtService } from '@/services/storage'
import type { Debt, DebtFormData } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

const EMPTY_FORM: DebtFormData = {
  direction: 'i_owe',
  personName: '',
  amount: 0,
  description: '',
  dueDate: '',
}

interface DebtDialogProps {
  open: boolean
  onClose: () => void
  onSave: () => void
}

function DebtDialog({ open, onClose, onSave }: DebtDialogProps) {
  const [form, setForm] = useState<DebtFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof DebtFormData, string>>>({})

  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setErrors({}) }
  }, [open])

  const set = <K extends keyof DebtFormData>(key: K, value: DebtFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const errs: Partial<Record<keyof DebtFormData, string>> = {}
    if (!form.personName.trim()) errs.personName = 'Ingresá el nombre'
    if (!form.amount || form.amount <= 0) errs.amount = 'Ingresá un monto válido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    debtService.create(form)
    onSave()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nueva deuda</DialogTitle>
      <DialogContent className="space-y-4 pt-2">
        <TextField
          select
          label="Tipo de deuda"
          fullWidth
          value={form.direction}
          onChange={(e) => set('direction', e.target.value as DebtFormData['direction'])}
        >
          <MenuItem value="i_owe">Yo le debo a alguien</MenuItem>
          <MenuItem value="owed_to_me">Alguien me debe a mí</MenuItem>
        </TextField>
        <TextField
          label="Nombre de la persona"
          fullWidth
          value={form.personName}
          onChange={(e) => set('personName', e.target.value)}
          error={!!errors.personName}
          helperText={errors.personName}
        />
        <TextField
          label="Monto"
          type="number"
          fullWidth
          value={form.amount || ''}
          onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
          error={!!errors.amount}
          helperText={errors.amount}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
        />
        <TextField
          label="Descripción (opcional)"
          fullWidth
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <TextField
          label="Fecha de vencimiento (opcional)"
          type="date"
          fullWidth
          value={form.dueDate || ''}
          onChange={(e) => set('dueDate', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">Agregar</Button>
      </DialogActions>
    </Dialog>
  )
}

interface PartialPaymentDialogProps {
  debt: Debt | null
  onClose: () => void
  onSave: () => void
}

function PartialPaymentDialog({ debt, onClose, onSave }: PartialPaymentDialogProps) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { if (debt) { setAmount(''); setError('') } }, [debt])

  const handleSubmit = () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) { setError('Ingresá un monto válido'); return }
    if (val > (debt?.amount ?? 0)) { setError('El monto supera la deuda actual'); return }
    debtService.partialPayment(debt!.id, val)
    onSave()
    onClose()
  }

  return (
    <Dialog open={!!debt} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Registrar pago parcial</DialogTitle>
      <DialogContent>
        {debt && (
          <div className="space-y-3 pt-2">
            <Typography variant="body2" color="text.secondary">
              Deuda con <strong>{debt.personName}</strong>: {formatCurrency(debt.amount)} pendiente
            </Typography>
            <TextField
              label="Monto a pagar"
              type="number"
              fullWidth
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError('') }}
              error={!!error}
              helperText={error}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">Registrar pago</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [showPaid, setShowPaid] = useState(false)

  const load = useCallback(() => setDebts(debtService.getAll()), [])

  useEffect(() => { load() }, [load])

  const active = debts.filter((d) => !d.isPaid)
  const paid = debts.filter((d) => d.isPaid)
  const totalIOwe = active.filter((d) => d.direction === 'i_owe').reduce((s, d) => s + d.amount, 0)
  const totalOwedToMe = active.filter((d) => d.direction === 'owed_to_me').reduce((s, d) => s + d.amount, 0)

  const displayed = showPaid ? debts : active

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Deudas</Typography>
          <Typography variant="body2" color="text.secondary">{active.length} deudas activas</Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nueva deuda
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card sx={{ borderLeft: '4px solid #f44336' }}>
          <CardContent className="flex items-center gap-3">
            <Avatar sx={{ bgcolor: '#fce4ec' }}>
              <ArrowUpwardIcon color="error" />
            </Avatar>
            <div>
              <Typography variant="body2" color="text.secondary">Yo debo</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>{formatCurrency(totalIOwe)}</Typography>
            </div>
          </CardContent>
        </Card>
        <Card sx={{ borderLeft: '4px solid #4caf50' }}>
          <CardContent className="flex items-center gap-3">
            <Avatar sx={{ bgcolor: '#e8f5e9' }}>
              <ArrowDownwardIcon color="success" />
            </Avatar>
            <div>
              <Typography variant="body2" color="text.secondary">Me deben</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2e7d32' }}>{formatCurrency(totalOwedToMe)}</Typography>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mb-3">
        <Button size="small" onClick={() => setShowPaid(!showPaid)} color="inherit">
          {showPaid ? 'Ocultar pagadas' : `Ver también pagadas (${paid.length})`}
        </Button>
      </div>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {displayed.length === 0 ? (
            <div className="text-center py-12">
              <Typography color="text.secondary">
                {active.length === 0 ? 'No tenés deudas activas. ¡Bien!' : 'No hay resultados.'}
              </Typography>
            </div>
          ) : (
            displayed.map((debt, i) => {
              const iOwe = debt.direction === 'i_owe'
              const progress = 100 - (debt.amount / debt.originalAmount) * 100
              return (
                <div key={debt.id}>
                  {i > 0 && <div className="border-t border-gray-100" />}
                  <div className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
                    <Avatar sx={{ bgcolor: iOwe ? '#fce4ec' : '#e8f5e9', color: iOwe ? '#c62828' : '#2e7d32', flexShrink: 0 }}>
                      <PersonIcon />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{debt.personName}</Typography>
                        <Chip size="small" label={iOwe ? 'Yo debo' : 'Me deben'} color={iOwe ? 'error' : 'success'} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                        {debt.isPaid && <Chip size="small" label="Pagada" sx={{ fontSize: 10, height: 20 }} />}
                      </div>
                      {debt.description && (
                        <Typography variant="caption" color="text.secondary">{debt.description}</Typography>
                      )}
                      {debt.dueDate && (
                        <Typography variant="caption" color="text.secondary" className="block">
                          Vence: {format(new Date(debt.dueDate), 'd MMM yyyy', { locale: es })}
                        </Typography>
                      )}
                      {!debt.isPaid && debt.originalAmount !== debt.amount && (
                        <div className="mt-1">
                          <LinearProgress variant="determinate" value={progress} sx={{ height: 4, borderRadius: 2 }} color="success" />
                          <Typography variant="caption" color="text.secondary">
                            Pagado {formatCurrency(debt.originalAmount - debt.amount)} de {formatCurrency(debt.originalAmount)}
                          </Typography>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Typography variant="body1" sx={{ fontWeight: 700, color: iOwe ? '#c62828' : '#2e7d32' }}>
                        {formatCurrency(debt.amount)}
                      </Typography>
                      {!debt.isPaid && (
                        <div className="flex gap-1">
                          <Button size="small" variant="outlined" onClick={() => setPayingDebt(debt)} sx={{ fontSize: 11, py: 0.2 }}>
                            Pagar parcial
                          </Button>
                          <Tooltip title="Marcar como pagada">
                            <IconButton size="small" color="success" onClick={() => { debtService.markPaid(debt.id); load() }}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={() => { debtService.delete(debt.id); load() }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <DebtDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={load} />
      <PartialPaymentDialog debt={payingDebt} onClose={() => setPayingDebt(null)} onSave={load} />
    </div>
  )
}
