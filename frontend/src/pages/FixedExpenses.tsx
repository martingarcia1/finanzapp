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
  InputAdornment,
  LinearProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import HomeIcon from '@mui/icons-material/Home'
import { fixedExpenseService } from '@/services/storage'
import type { FixedExpense, FixedExpenseFormData } from '@/types'
import { EXPENSE_CATEGORIES } from '@/types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

const EMPTY_FORM: FixedExpenseFormData = {
  name: '',
  amount: 0,
  category: '',
  dayOfMonth: 1,
  description: '',
  isActive: true,
}

interface ExpenseDialogProps {
  open: boolean
  initial: FixedExpenseFormData | null
  onClose: () => void
  onSave: (data: FixedExpenseFormData) => void
}

function ExpenseDialog({ open, initial, onClose, onSave }: ExpenseDialogProps) {
  const [form, setForm] = useState<FixedExpenseFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FixedExpenseFormData, string>>>({})

  useEffect(() => {
    if (open) {
      setForm(initial ?? EMPTY_FORM)
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof FixedExpenseFormData>(key: K, value: FixedExpenseFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const errs: Partial<Record<keyof FixedExpenseFormData, string>> = {}
    if (!form.name.trim()) errs.name = 'Ingresá un nombre'
    if (!form.amount || form.amount <= 0) errs.amount = 'Ingresá un monto válido'
    if (!form.category) errs.category = 'Seleccioná una categoría'
    if (!form.dayOfMonth || form.dayOfMonth < 1 || form.dayOfMonth > 31)
      errs.dayOfMonth = 'Entre 1 y 31'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave(form)
  }

  const isEditing = !!initial

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</DialogTitle>
      <DialogContent className="space-y-4 pt-2">
        <TextField
          label="Nombre"
          fullWidth
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
          placeholder="Ej: Alquiler, Netflix, Gimnasio"
        />
        <div className="grid grid-cols-2 gap-3">
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
            label="Día del mes"
            type="number"
            fullWidth
            value={form.dayOfMonth || ''}
            onChange={(e) => set('dayOfMonth', parseInt(e.target.value) || 1)}
            error={!!errors.dayOfMonth}
            helperText={errors.dayOfMonth || 'Día en que se cobra'}
            slotProps={{ htmlInput: { min: 1, max: 31 } }}
          />
        </div>
        <TextField
          select
          label="Categoría"
          fullWidth
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          error={!!errors.category}
          helperText={errors.category}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Descripción (opcional)"
          fullWidth
          multiline
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Notas adicionales"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">
          {isEditing ? 'Guardar cambios' : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function FixedExpenses() {
  const [items, setItems] = useState<FixedExpense[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FixedExpense | null>(null)

  const load = useCallback(() => setItems(fixedExpenseService.getAll()), [])
  useEffect(() => { load() }, [load])

  const active = items.filter((i) => i.isActive)
  const inactive = items.filter((i) => !i.isActive)
  const totalMonthly = active.reduce((s, i) => s + i.amount, 0)
  const maxAmount = Math.max(...items.map((i) => i.amount), 1)

  const handleSave = (data: FixedExpenseFormData) => {
    if (editing) {
      fixedExpenseService.update(editing.id, data)
    } else {
      fixedExpenseService.create(data)
    }
    setDialogOpen(false)
    setEditing(null)
    load()
  }

  const handleEdit = (item: FixedExpense) => {
    setEditing(item)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    fixedExpenseService.delete(id)
    load()
  }

  const handleToggle = (id: string, isActive: boolean) => {
    fixedExpenseService.update(id, { isActive })
    load()
  }

  const handleClose = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  // Ordena por día del mes
  const sorted = [...items].sort((a, b) => a.dayOfMonth - b.dayOfMonth)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Gastos Fijos</Typography>
          <Typography variant="body2" color="text.secondary">
            {active.length} activos · Total mensual {formatCurrency(totalMonthly)}
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditing(null); setDialogOpen(true) }}
        >
          Nuevo gasto fijo
        </Button>
      </div>

      {/* Resumen */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card sx={{ borderLeft: '4px solid #f44336' }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Typography variant="caption" color="text.secondary">Total mensual activos</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>
                {formatCurrency(totalMonthly)}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderLeft: '4px solid #1976d2' }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Typography variant="caption" color="text.secondary">Gastos activos</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1565c0' }}>
                {active.length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderLeft: '4px solid #9e9e9e' }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Typography variant="caption" color="text.secondary">Pausados</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#757575' }}>
                {inactive.length}
              </Typography>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista */}
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <HomeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              No tenés gastos fijos registrados. ¡Agregá uno!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {sorted.map((item, i) => {
              const barPct = Math.min((item.amount / maxAmount) * 100, 100)
              return (
                <div key={item.id}>
                  {i > 0 && <div className="border-t border-gray-100" />}
                  <div className={`px-4 py-3 transition-colors ${!item.isActive ? 'opacity-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <Avatar
                        sx={{
                          bgcolor: item.isActive ? '#fce4ec' : '#f5f5f5',
                          color: item.isActive ? '#c62828' : '#9e9e9e',
                          flexShrink: 0,
                          width: 40,
                          height: 40,
                        }}
                      >
                        <HomeIcon fontSize="small" />
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.name}
                          </Typography>
                          <Chip
                            label={`día ${item.dayOfMonth}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10, height: 18 }}
                          />
                          <Chip
                            label={item.category}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10, height: 18 }}
                          />
                          {!item.isActive && (
                            <Chip label="Pausado" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#f5f5f5' }} />
                          )}
                        </div>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary">
                            {item.description}
                          </Typography>
                        )}
                        <div className="mt-1">
                          <LinearProgress
                            variant="determinate"
                            value={barPct}
                            color="error"
                            sx={{ height: 4, borderRadius: 2, bgcolor: '#fce4ec' }}
                          />
                        </div>
                      </div>

                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 700, color: item.isActive ? '#c62828' : '#9e9e9e', flexShrink: 0 }}
                      >
                        {formatCurrency(item.amount)}
                      </Typography>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Tooltip title={item.isActive ? 'Pausar' : 'Activar'}>
                          <Switch
                            size="small"
                            checked={item.isActive}
                            onChange={() => handleToggle(item.id, !item.isActive)}
                            color="error"
                          />
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => handleEdit(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <ExpenseDialog
        open={dialogOpen}
        initial={editing ? (() => { const { id, createdAt, ...d } = editing; void id; void createdAt; return d })() : null}
        onClose={handleClose}
        onSave={handleSave}
      />
    </div>
  )
}
