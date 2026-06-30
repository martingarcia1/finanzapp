import { useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Avatar,
  Chip,
} from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import SavingsIcon from '@mui/icons-material/Savings'
import HomeIcon from '@mui/icons-material/Home'
import WalletIcon from '@mui/icons-material/Wallet'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import RepeatIcon from '@mui/icons-material/Repeat'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  getDay,
  isToday,
  differenceInDays,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  transactionService,
  savingsService,
  debtService,
  walletService,
  recurringService,
  fixedExpenseService,
} from '@/services/storage'
import type { Transaction, Wallet, RecurringTransaction } from '@/types'
import { WALLET_TYPES } from '@/types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

function greet(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  iconBg: string
  valueColor?: string
  sub?: string
}

function StatCard({ title, value, icon, iconBg, valueColor, sub }: StatCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: valueColor ?? 'text.primary' }} className="truncate">
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary">{sub}</Typography>
          )}
        </div>
        <Avatar sx={{ bgcolor: iconBg, width: 44, height: 44, flexShrink: 0 }}>
          {icon}
        </Avatar>
      </CardContent>
    </Card>
  )
}

// ─── Fila de transacción ──────────────────────────────────────────────────────

function TxRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.type === 'income'
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar
        sx={{
          width: 34, height: 34,
          bgcolor: isIncome ? '#e8f5e9' : '#fce4ec',
          color: isIncome ? '#2e7d32' : '#c62828',
          flexShrink: 0,
        }}
      >
        {isIncome ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : <TrendingDownIcon sx={{ fontSize: 16 }} />}
      </Avatar>
      <div className="flex-1 min-w-0">
        <Typography variant="body2" sx={{ fontWeight: 600 }} className="truncate">
          {tx.description || tx.category}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {tx.category} · {format(new Date(tx.date), 'd MMM', { locale: es })}
        </Typography>
      </div>
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, color: isIncome ? '#2e7d32' : '#c62828', flexShrink: 0 }}
      >
        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
      </Typography>
    </div>
  )
}

// ─── Recurrentes esta semana ──────────────────────────────────────────────────

interface WeekEvent {
  date: Date
  items: { label: string; amount: number; type: 'income' | 'expense' }[]
}

function getWeekEvents(recurring: RecurringTransaction[]): WeekEvent[] {
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 }) // lunes
  const end = endOfWeek(now, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end })

  return days
    .map((day) => {
      const dow = getDay(day)
      const dayNum = day.getDate()
      const items = recurring
        .filter((r) => r.isActive)
        .filter((r) => {
          if (day < new Date(r.startDate)) return false
          if (r.endDate && day > new Date(r.endDate)) return false
          const dows = r.daysOfWeek ?? (r.dayOfWeek !== undefined ? [r.dayOfWeek] : [])
          return (
            (r.pattern === 'weekly' && dows.includes(dow)) ||
            (r.pattern === 'monthly' && r.dayOfMonth === dayNum)
          )
        })
        .map((r) => ({ label: r.description || r.category, amount: r.amount, type: r.type }))
      return { date: day, items }
    })
    .filter((e) => e.items.length > 0)
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const data = useMemo(() => {
    const monthTxs = transactionService.getByMonth(year, month)
    const monthIncome = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const monthExpenses = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    const recentTxs = transactionService.getAll().slice(0, 5)

    const allDebts = debtService.getAll().filter((d) => !d.isPaid)
    const upcomingDebts = allDebts
      .filter((d) => d.dueDate)
      .map((d) => ({ ...d, daysLeft: differenceInDays(new Date(d.dueDate!), now) }))
      .filter((d) => d.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4)

    const savings = savingsService.getAll().filter((s) => !s.isCompleted).slice(0, 4)
    const wallets = walletService.getAll()
    const walletsTotal = wallets.reduce((s, w) => s + w.balance, 0)
    const fixedTotal = fixedExpenseService.getTotalMonthly()
    const recurring = recurringService.getAll()
    const weekEvents = getWeekEvents(recurring)

    return {
      monthIncome, monthExpenses,
      monthBalance: monthIncome - monthExpenses,
      recentTxs, upcomingDebts, savings,
      wallets, walletsTotal, fixedTotal, weekEvents,
    }
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  const { monthIncome, monthExpenses, monthBalance, recentTxs, upcomingDebts,
    savings, wallets, walletsTotal, fixedTotal, weekEvents } = data

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {greet()} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary" className="capitalize mt-0.5">
          {format(now, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </Typography>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          title="Ingresos del mes"
          value={formatCurrency(monthIncome)}
          icon={<TrendingUpIcon />}
          iconBg="#e8f5e9"
          valueColor="#2e7d32"
          sub="Mes actual"
        />
        <StatCard
          title="Egresos del mes"
          value={formatCurrency(monthExpenses)}
          icon={<TrendingDownIcon />}
          iconBg="#fce4ec"
          valueColor="#c62828"
          sub="Mes actual"
        />
        <StatCard
          title="Balance del mes"
          value={formatCurrency(monthBalance)}
          icon={<AccountBalanceWalletIcon />}
          iconBg={monthBalance >= 0 ? '#e3f2fd' : '#fce4ec'}
          valueColor={monthBalance >= 0 ? '#1565c0' : '#c62828'}
          sub={monthBalance >= 0 ? 'Superávit' : 'Déficit'}
        />
        <StatCard
          title="Saldo en billeteras"
          value={formatCurrency(walletsTotal)}
          icon={<WalletIcon />}
          iconBg="#f3e5f5"
          valueColor="#6a1b9a"
          sub={`${wallets.length} billetera${wallets.length !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Columna izquierda (2/3) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Últimas transacciones */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Últimas transacciones</Typography>
                <Chip label={recentTxs.length} size="small" variant="outlined" />
              </div>
              {recentTxs.length === 0 ? (
                <Typography color="text.secondary" variant="body2" className="py-6 text-center">
                  Sin transacciones aún. Agregá la primera en "Transacciones".
                </Typography>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentTxs.map((tx) => <TxRow key={tx.id} tx={tx} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recurrentes esta semana */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Avatar sx={{ bgcolor: '#e8eaf6', width: 32, height: 32 }}>
                  <RepeatIcon sx={{ fontSize: 16, color: '#3949ab' }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Recurrentes esta semana</Typography>
              </div>
              {weekEvents.length === 0 ? (
                <Typography color="text.secondary" variant="body2" className="py-4 text-center">
                  Sin transacciones recurrentes esta semana.
                </Typography>
              ) : (
                <div className="space-y-2">
                  {weekEvents.map((ev) => (
                    <div key={ev.date.toISOString()} className="flex items-start gap-3">
                      <div className={`text-center min-w-[48px] rounded-lg py-1 px-1 ${isToday(ev.date) ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.2, fontSize: 10, textTransform: 'uppercase' }}>
                          {format(ev.date, 'EEE', { locale: es })}
                        </Typography>
                        <Typography sx={{ fontWeight: 800, lineHeight: 1, fontSize: '1rem' }}>
                          {ev.date.getDate()}
                        </Typography>
                      </div>
                      <div className="flex-1 flex flex-wrap gap-1.5 pt-0.5">
                        {ev.items.map((item, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
                              ${item.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {item.type === 'income' ? '↑' : '↓'} {item.label} · {formatCurrency(item.amount)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha (1/3) */}
        <div className="space-y-4">

          {/* Billeteras */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Avatar sx={{ bgcolor: '#f3e5f5', width: 32, height: 32 }}>
                  <WalletIcon sx={{ fontSize: 16, color: '#7b1fa2' }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Billeteras</Typography>
              </div>
              {wallets.length === 0 ? (
                <Typography color="text.secondary" variant="body2" className="py-3 text-center">
                  Sin billeteras. Creá una en "Billeteras".
                </Typography>
              ) : (
                <div className="space-y-2">
                  {wallets.map((w: Wallet) => {
                    const typeInfo = WALLET_TYPES.find((t) => t.value === w.type)
                    return (
                      <div key={w.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: w.color }} />
                          <div className="min-w-0">
                            <Typography variant="body2" sx={{ fontWeight: 600 }} className="truncate">
                              {w.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{typeInfo?.label}</Typography>
                          </div>
                        </div>
                        <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
                          {formatCurrency(w.balance)}
                        </Typography>
                      </div>
                    )
                  })}
                  <div className="border-t border-gray-100 pt-2 flex justify-between">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Total</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#6a1b9a' }}>
                      {formatCurrency(walletsTotal)}
                    </Typography>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gastos fijos */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar sx={{ bgcolor: '#fce4ec', width: 32, height: 32 }}>
                    <HomeIcon sx={{ fontSize: 16, color: '#c62828' }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Gastos fijos</Typography>
                </div>
              </div>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#c62828', mb: 0.5 }}>
                {formatCurrency(fixedTotal)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total mensual activo
              </Typography>
              {monthExpenses > 0 && fixedTotal > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between mb-0.5">
                    <Typography variant="caption" color="text.secondary">% de egresos del mes</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {Math.min((fixedTotal / monthExpenses) * 100, 100).toFixed(0)}%
                    </Typography>
                  </div>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((fixedTotal / monthExpenses) * 100, 100)}
                    color="error"
                    sx={{ height: 5, borderRadius: 3 }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deudas próximas */}
          {upcomingDebts.length > 0 && (
            <Card sx={{ border: '1px solid #ffcdd2' }}>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Avatar sx={{ bgcolor: '#fff3e0', width: 32, height: 32 }}>
                    <WarningAmberIcon sx={{ fontSize: 16, color: '#e65100' }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Deudas próximas</Typography>
                </div>
                <div className="space-y-2">
                  {upcomingDebts.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Typography variant="body2" sx={{ fontWeight: 600 }} className="truncate">
                          {d.personName}
                        </Typography>
                        <Typography variant="caption" color={d.daysLeft <= 7 ? 'error' : 'text.secondary'}>
                          {d.daysLeft === 0
                            ? 'Vence hoy'
                            : d.daysLeft < 0
                              ? `Venció hace ${Math.abs(d.daysLeft)} días`
                              : `Vence en ${d.daysLeft} día${d.daysLeft !== 1 ? 's' : ''}`}
                        </Typography>
                      </div>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#c62828', flexShrink: 0 }}>
                        {formatCurrency(d.amount)}
                      </Typography>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metas de ahorro */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Avatar sx={{ bgcolor: '#e3f2fd', width: 32, height: 32 }}>
                  <SavingsIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Metas de ahorro</Typography>
              </div>
              {savings.length === 0 ? (
                <Typography color="text.secondary" variant="body2" className="py-3 text-center">
                  Sin metas activas.
                </Typography>
              ) : (
                <div className="space-y-3">
                  {savings.map((goal) => {
                    const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between items-center mb-0.5">
                          <Typography variant="body2" sx={{ fontWeight: 600 }} className="truncate max-w-[60%]">
                            {goal.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {pct.toFixed(0)}%
                          </Typography>
                        </div>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                        </Typography>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
