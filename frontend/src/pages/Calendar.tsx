import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  TextField,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  getDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { recurringService } from '@/services/storage'
import type { RecurringTransaction, RecurringTransactionFormData, TransactionType } from '@/types'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const WEEK_HEADERS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const EMPTY_FORM: RecurringTransactionFormData = {
  type: 'income',
  amount: 0,
  category: '',
  description: '',
  paymentMethod: 'cash',
  pattern: 'weekly',
  daysOfWeek: [],
  dayOfMonth: 1,
  startDate: new Date().toISOString().split('T')[0],
  isActive: true,
}

interface DayChip {
  id: string
  label: string
  amount: number
  type: 'income' | 'expense'
}

function getChipsForDay(date: Date, recurring: RecurringTransaction[]): DayChip[] {
  const dayNum = date.getDate()
  const dow = getDay(date)
  const chips: DayChip[] = []

  recurring.filter((r) => r.isActive).forEach((r) => {
    const startDate = new Date(r.startDate)
    if (date < startDate) return
    if (r.endDate && date > new Date(r.endDate)) return

    const effectiveDows = r.daysOfWeek ?? (r.dayOfWeek !== undefined ? [r.dayOfWeek] : [])
    const matches =
      (r.pattern === 'monthly' && r.dayOfMonth === dayNum) ||
      (r.pattern === 'weekly' && effectiveDows.includes(dow))

    if (matches) {
      chips.push({
        id: `${r.id}-${date.toISOString()}`,
        label: r.description || r.category,
        amount: r.amount,
        type: r.type,
      })
    }
  })

  return chips
}

export default function Calendar() {
  const [items, setItems] = useState<RecurringTransaction[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [form, setForm] = useState<RecurringTransactionFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const load = useCallback(() => setItems(recurringService.getAll()), [])
  useEffect(() => { load() }, [load])

  const set = <K extends keyof RecurringTransactionFormData>(key: K, value: RecurringTransactionFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.amount || form.amount <= 0) errs.amount = 'Ingresá un monto válido'
    if (!form.category) errs.category = 'Seleccioná una categoría'
    if (!form.description.trim()) errs.description = 'Campo requerido'
    if (form.pattern === 'weekly' && (!form.daysOfWeek || form.daysOfWeek.length === 0))
      errs.daysOfWeek = 'Seleccioná al menos un día'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAdd = () => {
    if (!validate()) return
    recurringService.create(form)
    setForm({ ...EMPTY_FORM, startDate: new Date().toISOString().split('T')[0] })
    setErrors({})
    load()
  }

  const toggleDow = (dow: number) => {
    const curr = form.daysOfWeek ?? []
    const next = curr.includes(dow) ? curr.filter((d) => d !== dow) : [...curr, dow]
    set('daysOfWeek', next)
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  // Calendar calculations
  const { days, monthlyIncome, monthlyExpense } = useMemo(() => {
    const ms = startOfMonth(currentDate)
    const me = endOfMonth(currentDate)
    const days = eachDayOfInterval({
      start: startOfWeek(ms, { weekStartsOn: 0 }),
      end: endOfWeek(me, { weekStartsOn: 0 }),
    })
    const daysInMonth = eachDayOfInterval({ start: ms, end: me })
    let monthlyIncome = 0
    let monthlyExpense = 0
    daysInMonth.forEach((d) => {
      getChipsForDay(d, items).forEach((c) => {
        if (c.type === 'income') monthlyIncome += c.amount
        else monthlyExpense += c.amount
      })
    })
    return { days, monthlyIncome, monthlyExpense }
  }, [items, currentDate])

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* ── Formulario ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Agregar Transacción Recurrente
        </Typography>

        <div className="flex justify-center mb-3">
          <ToggleButtonGroup
            value={form.type}
            exclusive
            onChange={(_, v) => v && set('type', v as TransactionType)}
            size="small"
            sx={{ width: '100%', maxWidth: 500 }}
          >
            <ToggleButton
              value="income"
              sx={{ flex: 1, '&.Mui-selected': { bgcolor: '#e3f2fd', color: 'primary.main', fontWeight: 700 } }}
            >
              INGRESO
            </ToggleButton>
            <ToggleButton
              value="expense"
              sx={{ flex: 1, '&.Mui-selected': { bgcolor: '#fce4ec', color: 'error.main', fontWeight: 700 } }}
            >
              EGRESO
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            label="Monto *"
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
            select
            label="Método de pago"
            fullWidth
            value={form.paymentMethod}
            onChange={(e) => set('paymentMethod', e.target.value as RecurringTransactionFormData['paymentMethod'])}
          >
            {PAYMENT_METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </TextField>

          <TextField
            label="Descripción *"
            fullWidth
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            error={!!errors.description}
            helperText={errors.description}
          />

          <TextField
            select
            label="Tipo de recurrencia"
            fullWidth
            value={form.pattern}
            onChange={(e) => {
              set('pattern', e.target.value as 'weekly' | 'monthly')
              set('daysOfWeek', [])
            }}
          >
            <MenuItem value="weekly">Semanal (días específicos)</MenuItem>
            <MenuItem value="monthly">Mensual (día del mes)</MenuItem>
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
        </div>

        {form.pattern === 'weekly' && (
          <div className="mt-3">
            <Typography variant="caption" color={errors.daysOfWeek ? 'error' : 'text.secondary'} sx={{ display: 'block', mb: 0.5 }}>
              Días de la semana{errors.daysOfWeek ? ` — ${errors.daysOfWeek}` : ''}
            </Typography>
            <div className="flex gap-1 flex-wrap">
              {DAYS_SHORT.map((day, i) => {
                const selected = (form.daysOfWeek ?? []).includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDow(i)}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold transition-colors cursor-pointer select-none
                      ${selected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                      }`}
                  >
                    {day.toUpperCase()}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleAdd}
          sx={{ mt: 3, py: 1.2, fontWeight: 700, letterSpacing: 1 }}
        >
          AGREGAR
        </Button>
      </div>

      {/* ── Lista de configuradas ───────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
            Transacciones Recurrentes Configuradas
          </Typography>
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const isIncome = item.type === 'income'
              const effectiveDows = item.daysOfWeek ?? (item.dayOfWeek !== undefined ? [item.dayOfWeek] : [])
              const daysLabel =
                item.pattern === 'weekly'
                  ? effectiveDows.sort((a, b) => a - b).map((d) => DAYS_SHORT[d]).join(', ')
                  : `Día ${item.dayOfMonth} de cada mes`
              const paymentLabel = PAYMENT_METHODS.find((m) => m.value === item.paymentMethod)?.label

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 py-3 transition-opacity ${!item.isActive ? 'opacity-45' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <Chip
                        label={isIncome ? 'Ingreso' : 'Egreso'}
                        size="small"
                        sx={{
                          bgcolor: item.isActive
                            ? (isIncome ? '#4caf50' : '#f44336')
                            : '#9e9e9e',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: 11,
                          height: 20,
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formatCurrency(item.amount)}
                      </Typography>
                      {!item.isActive && (
                        <Chip label="Pausada" size="small" sx={{ fontSize: 10, height: 18 }} />
                      )}
                    </div>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.description || item.category}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.category} • {paymentLabel}
                    </Typography>
                    <div className="mt-0.5">
                      <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 500 }}>
                        🗓 {daysLabel}
                      </Typography>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Tooltip title={item.isActive ? 'Pausar' : 'Activar'}>
                      <Switch
                        size="small"
                        checked={item.isActive}
                        onChange={() => { recurringService.toggleActive(item.id); load() }}
                        color={isIncome ? 'success' : 'error'}
                      />
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => { recurringService.delete(item.id); load() }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Calendario ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {/* Navegación mes */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <IconButton
            size="small"
            onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 200, textAlign: 'center' }} className="capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          >
            <ChevronRightIcon />
          </IconButton>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <Typography variant="caption" sx={{ color: '#555', fontWeight: 500, display: 'block', lineHeight: 1.2 }}>
              Ingresos Fijos del Mes
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#2e7d32', fontSize: '1.05rem', mt: 0.5 }}>
              {formatCurrency(monthlyIncome)}
            </Typography>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <Typography variant="caption" sx={{ color: '#555', fontWeight: 500, display: 'block', lineHeight: 1.2 }}>
              Egresos Fijos del Mes
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#c62828', fontSize: '1.05rem', mt: 0.5 }}>
              {formatCurrency(monthlyExpense)}
            </Typography>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <Typography variant="caption" sx={{ color: '#555', fontWeight: 500, display: 'block', lineHeight: 1.2 }}>
              Rendimiento
            </Typography>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '1.05rem',
                mt: 0.5,
                color: monthlyIncome - monthlyExpense >= 0 ? '#1976d2' : '#c62828',
              }}
            >
              {monthlyIncome - monthlyExpense >= 0 ? '+' : ''}{formatCurrency(monthlyIncome - monthlyExpense)}
            </Typography>
          </div>
        </div>

        {/* Encabezados días */}
        <div className="grid grid-cols-7 mb-1">
          {WEEK_HEADERS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Grilla */}
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const chips = getChipsForDay(day, items)
            const inCurMonth = isSameMonth(day, currentDate)
            const today = isToday(day)
            const hasIncome = chips.some((c) => c.type === 'income')
            const hasExpense = chips.some((c) => c.type === 'expense')

            let cellBg = ''
            if (inCurMonth) {
              if (hasIncome && hasExpense) cellBg = 'bg-amber-50'
              else if (hasIncome) cellBg = 'bg-green-50'
              else if (hasExpense) cellBg = 'bg-red-50'
              else cellBg = 'bg-white'
            } else {
              cellBg = 'bg-gray-50'
            }

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[56px] p-1 rounded border border-gray-100 transition-colors
                  ${cellBg}
                  ${!inCurMonth ? 'opacity-40' : ''}
                `}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold mb-0.5
                    ${today ? 'bg-blue-600 text-white' : 'text-gray-700'}
                  `}
                >
                  {day.getDate()}
                </div>
                {inCurMonth && (
                  <div className="flex flex-col gap-0.5">
                    {chips.map((chip) => (
                      <Tooltip
                        key={chip.id}
                        title={`${chip.label}: ${formatCurrency(chip.amount)}`}
                        arrow
                        placement="top"
                      >
                        <div
                          className={`text-[9px] font-semibold px-1 py-0.5 rounded cursor-default truncate
                            ${chip.type === 'income'
                              ? 'bg-green-200 text-green-900'
                              : 'bg-red-200 text-red-900'
                            }`}
                        >
                          {formatCurrency(chip.amount)}
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Leyenda */}
        <div className="flex gap-5 mt-3 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
            <Typography variant="caption" color="text.secondary">Ingresos fijos</Typography>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
            <Typography variant="caption" color="text.secondary">Egresos fijos</Typography>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-amber-100 border border-amber-200" />
            <Typography variant="caption" color="text.secondary">Ambos</Typography>
          </div>
        </div>
      </div>
    </div>
  )
}
