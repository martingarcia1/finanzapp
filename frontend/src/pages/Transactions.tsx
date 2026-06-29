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
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  InputAdornment,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import SearchIcon from '@mui/icons-material/Search'
import { transactionService } from '@/services/storage'
import type { Transaction, TransactionType, TransactionFormData } from '@/types'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

const EMPTY_FORM: TransactionFormData = {
  type: 'expense',
  amount: 0,
  category: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  paymentMethod: 'cash',
}

interface TransactionDialogProps {
  open: boolean
  initial?: Transaction | null
  onClose: () => void
  onSave: () => void
}

function TransactionDialog({ open, initial, onClose, onSave }: TransactionDialogProps) {
  const [form, setForm] = useState<TransactionFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormData, string>>>({})

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? { type: initial.type, amount: initial.amount, category: initial.category, description: initial.description, date: initial.date, paymentMethod: initial.paymentMethod }
          : { ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] }
      )
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof TransactionFormData>(key: K, value: TransactionFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof TransactionFormData, string>> = {}
    if (!form.amount || form.amount <= 0) errs.amount = 'Ingresá un monto válido'
    if (!form.category) errs.category = 'Seleccioná una categoría'
    if (!form.date) errs.date = 'Seleccioná una fecha'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    if (initial) {
      transactionService.update(initial.id, form)
    } else {
      transactionService.create(form)
    }
    onSave()
    onClose()
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Editar transacción' : 'Nueva transacción'}</DialogTitle>
      <DialogContent className="space-y-4 pt-2">
        <div className="flex justify-center mt-2">
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
          label="Descripción (opcional)"
          fullWidth
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Ej: Supermercado Día"
        />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Fecha"
            type="date"
            fullWidth
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            error={!!errors.date}
            helperText={errors.date}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            label="Método de pago"
            fullWidth
            value={form.paymentMethod}
            onChange={(e) => set('paymentMethod', e.target.value as TransactionFormData['paymentMethod'])}
          >
            {PAYMENT_METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </TextField>
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">
          {initial ? 'Guardar cambios' : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all')

  const load = useCallback(() => setTransactions(transactionService.getAll()), [])

  useEffect(() => { load() }, [load])

  const handleDelete = (id: string) => {
    transactionService.delete(id)
    load()
  }

  const filtered = transactions.filter((t) => {
    const matchType = filterType === 'all' || t.type === filterType
    const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Transacciones</Typography>
          <Typography variant="body2" color="text.secondary">{transactions.length} registros en total</Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditing(null); setDialogOpen(true) }}
        >
          Nueva transacción
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Chip icon={<TrendingUpIcon />} label={`Ingresos: ${formatCurrency(totalIncome)}`} color="success" variant="outlined" />
        <Chip icon={<TrendingDownIcon />} label={`Egresos: ${formatCurrency(totalExpense)}`} color="error" variant="outlined" />
        <Chip label={`Balance: ${formatCurrency(totalIncome - totalExpense)}`} color={totalIncome - totalExpense >= 0 ? 'primary' : 'error'} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <TextField
          placeholder="Buscar por descripción o categoría..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          className="flex-1"
        />
        <ToggleButtonGroup value={filterType} exclusive onChange={(_, v) => v && setFilterType(v)} size="small">
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="income">Ingresos</ToggleButton>
          <ToggleButton value="expense">Egresos</ToggleButton>
        </ToggleButtonGroup>
      </div>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Typography color="text.secondary">
                {transactions.length === 0 ? 'Todavía no tenés transacciones.' : 'No hay resultados para tu búsqueda.'}
              </Typography>
            </div>
          ) : (
            <div>
              {filtered.map((tx, i) => {
                const isIncome = tx.type === 'income'
                return (
                  <div key={tx.id}>
                    {i > 0 && <div className="border-t border-gray-100" />}
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <Avatar sx={{ width: 40, height: 40, bgcolor: isIncome ? '#e8f5e9' : '#fce4ec', color: isIncome ? '#2e7d32' : '#c62828', flexShrink: 0 }}>
                        {isIncome ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Typography variant="body2" sx={{ fontWeight: 600 }} className="truncate">
                            {tx.description || tx.category}
                          </Typography>
                          <Chip label={tx.category} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                        </div>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(tx.date), "d 'de' MMMM yyyy", { locale: es })} · {PAYMENT_METHODS.find(m => m.value === tx.paymentMethod)?.label}
                        </Typography>
                      </div>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: isIncome ? '#2e7d32' : '#c62828' }} className="shrink-0">
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </Typography>
                      <div className="flex shrink-0">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => { setEditing(tx); setDialogOpen(true) }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => handleDelete(tx.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={load} />
    </div>
  )
}
