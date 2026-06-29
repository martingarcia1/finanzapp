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
  Switch,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import RepeatIcon from '@mui/icons-material/Repeat'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import { recurringService } from '@/services/storage'
import type { RecurringTransaction, RecurringTransactionFormData, TransactionType } from '@/types'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const EMPTY_FORM: RecurringTransactionFormData = {
  type: 'expense',
  amount: 0,
  category: '',
  description: '',
  paymentMethod: 'cash',
  pattern: 'monthly',
  dayOfMonth: 1,
  daysOfWeek: [1],
  startDate: new Date().toISOString().split('T')[0],
  isActive: true,
}

interface RecurringDialogProps {
  open: boolean
  onClose: () => void
  onSave: () => void
}

function RecurringDialog({ open, onClose, onSave }: RecurringDialogProps) {
  const [form, setForm] = useState<RecurringTransactionFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof RecurringTransactionFormData, string>>>({})

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, startDate: new Date().toISOString().split('T')[0] })
      setErrors({})
    }
  }, [open])

  const set = <K extends keyof RecurringTransactionFormData>(key: K, value: RecurringTransactionFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const errs: Partial<Record<keyof RecurringTransactionFormData, string>> = {}
    if (!form.amount || form.amount <= 0) errs.amount = 'Ingresá un monto válido'
    if (!form.category) errs.category = 'Seleccioná una categoría'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    recurringService.create(form)
    onSave()
    onClose()
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nueva transacción recurrente</DialogTitle>
      <DialogContent className="space-y-4 pt-2">
        <div className="flex justify-center mt-1">
          <ToggleButtonGroup
            value={form.type}
            exclusive
            onChange={(_, v) => v && set('type', v as TransactionType)}
            size="small"
          >
            <ToggleButton value="income" sx={{ px: 3, color: 'success.main', '&.Mui-selected': { bgcolor: '#e8f5e9', color: 'success.main' } }}>
              <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} /> Ingreso
            </ToggleButton>
            <ToggleButton value="expense" sx={{ px: 3, color: 'error.main', '&.Mui-selected': { bgcolor: '#fce4ec', color: 'error.main' } }}>
              <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} /> Egreso
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

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
          select
          label="Categoría"
          fullWidth
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          error={!!errors.category}
          helperText={errors.category}
        >
          {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>

        <TextField
          label="Descripción"
          fullWidth
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Ej: Netflix, Alquiler, Sueldo"
        />

        <TextField
          select
          label="Método de pago"
          fullWidth
          value={form.paymentMethod}
          onChange={(e) => set('paymentMethod', e.target.value as RecurringTransactionFormData['paymentMethod'])}
        >
          {PAYMENT_METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
        </TextField>

        <TextField
          select
          label="Frecuencia"
          fullWidth
          value={form.pattern}
          onChange={(e) => set('pattern', e.target.value as 'weekly' | 'monthly')}
        >
          <MenuItem value="monthly">Mensual</MenuItem>
          <MenuItem value="weekly">Semanal</MenuItem>
        </TextField>

        {form.pattern === 'monthly' && (
          <TextField
            label="Día del mes"
            type="number"
            fullWidth
            value={form.dayOfMonth || ''}
            onChange={(e) => set('dayOfMonth', parseInt(e.target.value) || 1)}
            helperText="Entre 1 y 31"
            slotProps={{ htmlInput: { min: 1, max: 31 } }}
          />
        )}

        {form.pattern === 'weekly' && (
          <div>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Días de la semana
            </Typography>
            <div className="flex gap-1 flex-wrap">
              {DAYS_OF_WEEK.map((day, i) => {
                const selected = (form.daysOfWeek ?? []).includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const curr = form.daysOfWeek ?? []
                      const next = curr.includes(i) ? curr.filter((d) => d !== i) : [...curr, i]
                      set('daysOfWeek', next)
                    }}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold transition-colors cursor-pointer select-none
                      ${selected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                  >
                    {day.slice(0, 3).toUpperCase()}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <TextField
          label="Fecha de inicio"
          type="date"
          fullWidth
          value={form.startDate}
          onChange={(e) => set('startDate', e.target.value)}
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

export default function Recurring() {
  const [items, setItems] = useState<RecurringTransaction[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(() => setItems(recurringService.getAll()), [])

  useEffect(() => { load() }, [load])

  const totalMonthlyIncome = items.filter((r) => r.isActive && r.type === 'income' && r.pattern === 'monthly').reduce((s, r) => s + r.amount, 0)
  const totalMonthlyExpense = items.filter((r) => r.isActive && r.type === 'expense' && r.pattern === 'monthly').reduce((s, r) => s + r.amount, 0)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Recurrentes</Typography>
          <Typography variant="body2" color="text.secondary">{items.filter(r => r.isActive).length} activas</Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nueva recurrente
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card sx={{ borderLeft: '4px solid #4caf50' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Ingresos mensuales</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2e7d32' }}>{formatCurrency(totalMonthlyIncome)}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderLeft: '4px solid #f44336' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Egresos mensuales</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>{formatCurrency(totalMonthlyExpense)}</Typography>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <RepeatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No tenés transacciones recurrentes.</Typography>
            </div>
          ) : (
            items.map((item, i) => {
              const isIncome = item.type === 'income'
              const effectiveDows = item.daysOfWeek ?? (item.dayOfWeek !== undefined ? [item.dayOfWeek] : [])
              const patternLabel = item.pattern === 'monthly'
                ? `Mensual (día ${item.dayOfMonth})`
                : `Semanal (${effectiveDows.sort((a, b) => a - b).map((d) => DAYS_OF_WEEK[d].slice(0, 3)).join(', ')})`
              return (
                <div key={item.id}>
                  {i > 0 && <div className="border-t border-gray-100" />}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <Avatar sx={{ bgcolor: isIncome ? '#e8f5e9' : '#fce4ec', color: isIncome ? '#2e7d32' : '#c62828', flexShrink: 0 }}>
                      {isIncome ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.description || item.category}</Typography>
                        <Chip label={item.category} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                        <Chip label={patternLabel} size="small" icon={<RepeatIcon sx={{ fontSize: '12px !important' }} />} sx={{ fontSize: 10, height: 18 }} />
                      </div>
                      <Typography variant="caption" color="text.secondary">
                        {PAYMENT_METHODS.find(m => m.value === item.paymentMethod)?.label}
                      </Typography>
                    </div>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: isIncome ? '#2e7d32' : '#c62828' }} className="shrink-0">
                      {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                    </Typography>
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip title={item.isActive ? 'Pausar' : 'Activar'}>
                        <Switch
                          size="small"
                          checked={item.isActive}
                          onChange={() => { recurringService.toggleActive(item.id); load() }}
                          color={isIncome ? 'success' : 'error'}
                        />
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => { recurringService.delete(item.id); load() }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <RecurringDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={load} />
    </div>
  )
}
