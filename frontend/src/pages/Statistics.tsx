import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  MenuItem,
  TextField,
  LinearProgress,
  Chip,
  Avatar,
} from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import BarChartIcon from '@mui/icons-material/BarChart'
import { transactionService } from '@/services/storage'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

const MONTHS_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i)
  return {
    value: `${d.getFullYear()}-${d.getMonth()}`,
    label: format(d, 'MMMM yyyy', { locale: es }),
    year: d.getFullYear(),
    month: d.getMonth(),
  }
})

interface CategoryBar {
  category: string
  amount: number
  percentage: number
  count: number
}

export default function Statistics() {
  const [selected, setSelected] = useState(MONTHS_OPTIONS[0].value)

  const option = MONTHS_OPTIONS.find((o) => o.value === selected)!

  const { income, expenses, balance, topExpenseCategories, topIncomeCategories, last6Months } = useMemo(() => {
    const txs = transactionService.getByMonth(option.year, option.month)
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const balance = income - expenses

    const expenseMap: Record<string, { amount: number; count: number }> = {}
    const incomeMap: Record<string, { amount: number; count: number }> = {}

    txs.forEach((t) => {
      const map = t.type === 'expense' ? expenseMap : incomeMap
      if (!map[t.category]) map[t.category] = { amount: 0, count: 0 }
      map[t.category].amount += t.amount
      map[t.category].count++
    })

    const toBar = (map: Record<string, { amount: number; count: number }>, total: number): CategoryBar[] =>
      Object.entries(map)
        .map(([category, { amount, count }]) => ({
          category, amount, count,
          percentage: total > 0 ? (amount / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)

    const topExpenseCategories = toBar(expenseMap, expenses)
    const topIncomeCategories = toBar(incomeMap, income)

    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i)
      const monthTxs = transactionService.getByMonth(d.getFullYear(), d.getMonth())
      return {
        label: format(d, 'MMM', { locale: es }),
        income: monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      }
    })

    return { income, expenses, balance, topExpenseCategories, topIncomeCategories, last6Months }
  }, [option])

  const maxBar = Math.max(...last6Months.map((m) => Math.max(m.income, m.expense)), 1)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Estadísticas</Typography>
          <Typography variant="body2" color="text.secondary">Análisis de tus finanzas</Typography>
        </div>
        <TextField
          select
          size="small"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {MONTHS_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value} sx={{ textTransform: 'capitalize' }}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3">
            <Avatar sx={{ bgcolor: '#e8f5e9' }}><TrendingUpIcon color="success" /></Avatar>
            <div>
              <Typography variant="caption" color="text.secondary">Ingresos</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2e7d32' }}>{formatCurrency(income)}</Typography>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Avatar sx={{ bgcolor: '#fce4ec' }}><TrendingDownIcon color="error" /></Avatar>
            <div>
              <Typography variant="caption" color="text.secondary">Egresos</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>{formatCurrency(expenses)}</Typography>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Avatar sx={{ bgcolor: balance >= 0 ? '#e3f2fd' : '#fce4ec' }}>
              <BarChartIcon color={balance >= 0 ? 'primary' : 'error'} />
            </Avatar>
            <div>
              <Typography variant="caption" color="text.secondary">Balance</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: balance >= 0 ? '#1976d2' : '#c62828' }}>
                {formatCurrency(balance)}
              </Typography>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }} className="mb-4">Egresos por categoría</Typography>
            {topExpenseCategories.length === 0 ? (
              <Typography color="text.secondary" variant="body2" className="text-center py-4">Sin datos este mes.</Typography>
            ) : (
              <div className="space-y-3">
                {topExpenseCategories.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-2">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{cat.category}</Typography>
                        <Chip label={cat.count} size="small" variant="outlined" sx={{ fontSize: 10, height: 16 }} />
                      </div>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#c62828' }}>
                        {formatCurrency(cat.amount)} ({cat.percentage.toFixed(0)}%)
                      </Typography>
                    </div>
                    <LinearProgress variant="determinate" value={cat.percentage} color="error" sx={{ height: 6, borderRadius: 3 }} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }} className="mb-4">Ingresos por categoría</Typography>
            {topIncomeCategories.length === 0 ? (
              <Typography color="text.secondary" variant="body2" className="text-center py-4">Sin datos este mes.</Typography>
            ) : (
              <div className="space-y-3">
                {topIncomeCategories.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-2">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{cat.category}</Typography>
                        <Chip label={cat.count} size="small" variant="outlined" sx={{ fontSize: 10, height: 16 }} />
                      </div>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                        {formatCurrency(cat.amount)} ({cat.percentage.toFixed(0)}%)
                      </Typography>
                    </div>
                    <LinearProgress variant="determinate" value={cat.percentage} color="success" sx={{ height: 6, borderRadius: 3 }} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700 }} className="mb-4">Tendencia últimos 6 meses</Typography>
          <div className="flex items-end gap-2 h-40">
            {last6Months.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end" style={{ height: '120px' }}>
                  <div
                    className="flex-1 bg-green-400 rounded-t transition-all"
                    style={{ height: `${maxBar > 0 ? (m.income / maxBar) * 100 : 0}%` }}
                    title={`Ingresos: ${formatCurrency(m.income)}`}
                  />
                  <div
                    className="flex-1 bg-red-400 rounded-t transition-all"
                    style={{ height: `${maxBar > 0 ? (m.expense / maxBar) * 100 : 0}%` }}
                    title={`Egresos: ${formatCurrency(m.expense)}`}
                  />
                </div>
                <Typography variant="caption" color="text.secondary" className="capitalize">{m.label}</Typography>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-400 rounded" />
              <Typography variant="caption" color="text.secondary">Ingresos</Typography>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-400 rounded" />
              <Typography variant="caption" color="text.secondary">Egresos</Typography>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
