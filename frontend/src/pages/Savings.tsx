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
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  LinearProgress,
  InputAdornment,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SavingsIcon from '@mui/icons-material/Savings'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { savingsService } from '@/services/storage'
import type { SavingsGoal, SavingsGoalFormData } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

const EMPTY_FORM: SavingsGoalFormData = {
  name: '',
  targetAmount: 0,
  currentAmount: 0,
  deadline: '',
  description: '',
}

interface GoalDialogProps {
  open: boolean
  onClose: () => void
  onSave: () => void
}

function GoalDialog({ open, onClose, onSave }: GoalDialogProps) {
  const [form, setForm] = useState<SavingsGoalFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof SavingsGoalFormData, string>>>({})

  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setErrors({}) }
  }, [open])

  const set = <K extends keyof SavingsGoalFormData>(key: K, value: SavingsGoalFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const errs: Partial<Record<keyof SavingsGoalFormData, string>> = {}
    if (!form.name.trim()) errs.name = 'Ingresá un nombre'
    if (!form.targetAmount || form.targetAmount <= 0) errs.targetAmount = 'Ingresá un monto objetivo válido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    savingsService.create(form)
    onSave()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nueva meta de ahorro</DialogTitle>
      <DialogContent className="space-y-4 pt-2">
        <TextField
          label="Nombre de la meta"
          fullWidth
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
          placeholder="Ej: Viaje a Europa, Auto, Fondo de emergencia"
        />
        <TextField
          label="Monto objetivo"
          type="number"
          fullWidth
          value={form.targetAmount || ''}
          onChange={(e) => set('targetAmount', parseFloat(e.target.value) || 0)}
          error={!!errors.targetAmount}
          helperText={errors.targetAmount}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
        />
        <TextField
          label="Ahorro inicial (opcional)"
          type="number"
          fullWidth
          value={form.currentAmount || ''}
          onChange={(e) => set('currentAmount', parseFloat(e.target.value) || 0)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
        />
        <TextField
          label="Fecha límite (opcional)"
          type="date"
          fullWidth
          value={form.deadline || ''}
          onChange={(e) => set('deadline', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Descripción (opcional)"
          fullWidth
          multiline
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">Crear meta</Button>
      </DialogActions>
    </Dialog>
  )
}

interface AddFundsDialogProps {
  goal: SavingsGoal | null
  onClose: () => void
  onSave: () => void
}

function AddFundsDialog({ goal, onClose, onSave }: AddFundsDialogProps) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { if (goal) { setAmount(''); setError('') } }, [goal])

  const remaining = goal ? goal.targetAmount - goal.currentAmount : 0

  const handleSubmit = () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) { setError('Ingresá un monto válido'); return }
    savingsService.addFunds(goal!.id, val)
    onSave()
    onClose()
  }

  return (
    <Dialog open={!!goal} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Agregar fondos</DialogTitle>
      <DialogContent>
        {goal && (
          <div className="space-y-3 pt-2">
            <Typography variant="body2" color="text.secondary">
              Meta: <strong>{goal.name}</strong> · Falta {formatCurrency(remaining)}
            </Typography>
            <TextField
              label="Monto a agregar"
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
        <Button onClick={handleSubmit} variant="contained">Agregar</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Savings() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fundingGoal, setFundingGoal] = useState<SavingsGoal | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const load = useCallback(() => setGoals(savingsService.getAll()), [])

  useEffect(() => { load() }, [load])

  const active = goals.filter((g) => !g.isCompleted)
  const completed = goals.filter((g) => g.isCompleted)
  const displayed = showCompleted ? goals : active

  const totalSaved = active.reduce((s, g) => s + g.currentAmount, 0)
  const totalTarget = active.reduce((s, g) => s + g.targetAmount, 0)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Metas de Ahorro</Typography>
          <Typography variant="body2" color="text.secondary">{active.length} metas activas</Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nueva meta
        </Button>
      </div>

      {active.length > 0 && (
        <Card className="mb-6">
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <Avatar sx={{ bgcolor: '#e3f2fd' }}>
                <SavingsIcon color="primary" />
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between">
                  <Typography variant="body2" color="text.secondary">Progreso total</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(totalSaved)} / {formatCurrency(totalTarget)}
                  </Typography>
                </div>
                <LinearProgress
                  variant="determinate"
                  value={totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0}
                  sx={{ height: 10, borderRadius: 5, mt: 0.5 }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {completed.length > 0 && (
        <div className="flex justify-end mb-3">
          <Button size="small" onClick={() => setShowCompleted(!showCompleted)} color="inherit">
            {showCompleted ? 'Ocultar completadas' : `Ver completadas (${completed.length})`}
          </Button>
        </div>
      )}

      {displayed.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <SavingsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {active.length === 0 ? 'No tenés metas de ahorro. ¡Creá una!' : 'No hay resultados.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayed.map((goal) => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
            const remaining = goal.targetAmount - goal.currentAmount
            return (
              <Card key={goal.id} sx={{ opacity: goal.isCompleted ? 0.8 : 1 }}>
                <CardContent>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Avatar sx={{ bgcolor: goal.isCompleted ? '#e8f5e9' : '#e3f2fd', width: 36, height: 36 }}>
                        {goal.isCompleted
                          ? <EmojiEventsIcon fontSize="small" color="success" />
                          : <SavingsIcon fontSize="small" color="primary" />}
                      </Avatar>
                      <div>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>{goal.name}</Typography>
                        {goal.deadline && (
                          <Typography variant="caption" color="text.secondary">
                            Límite: {format(new Date(goal.deadline), 'd MMM yyyy', { locale: es })}
                          </Typography>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {goal.isCompleted && <Chip label="Completada" color="success" size="small" />}
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => { savingsService.delete(goal.id); load() }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>

                  {goal.description && (
                    <Typography variant="caption" color="text.secondary" className="mb-2 block">
                      {goal.description}
                    </Typography>
                  )}

                  <div className="mb-1 flex justify-between">
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                      {formatCurrency(goal.currentAmount)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      de {formatCurrency(goal.targetAmount)}
                    </Typography>
                  </div>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                    color={goal.isCompleted ? 'success' : 'primary'}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <Typography variant="caption" color="text.secondary">
                      {progress.toFixed(0)}% · {goal.isCompleted ? '¡Completada!' : `Falta ${formatCurrency(remaining)}`}
                    </Typography>
                    {!goal.isCompleted && (
                      <Button
                        size="small"
                        startIcon={<AddCircleIcon />}
                        onClick={() => setFundingGoal(goal)}
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                      >
                        Agregar fondos
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <GoalDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={load} />
      <AddFundsDialog goal={fundingGoal} onClose={() => setFundingGoal(null)} onSave={load} />
    </div>
  )
}
