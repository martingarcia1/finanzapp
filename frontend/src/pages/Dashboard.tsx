import { useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Avatar,
} from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import SavingsIcon from '@mui/icons-material/Savings'
import { transactionService, savingsService, debtService } from '@/services/storage'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Transaction } from '@/types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

interface StatCardProps {
  title: string
  amount: number
  icon: React.ReactNode
  color: string
  bgColor: string
  subtitle?: string
}

function StatCard({ title, amount, icon, color, bgColor, subtitle }: StatCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Typography variant="body2" color="text.secondary" className="mb-1">
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color }} className="truncate">
            {formatCurrency(amount)}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </div>
        <Avatar sx={{ bgcolor: bgColor, width: 48, height: 48 }}>{icon}</Avatar>
      </CardContent>
    </Card>
  )
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.type === 'income'
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: isIncome ? '#e8f5e9' : '#fce4ec',
            color: isIncome ? '#2e7d32' : '#c62828',
          }}
        >
          {isIncome ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
        </Avatar>
        <div className="min-w-0">
          <Typography variant="body2" sx={{ fontWeight: 600 }} className="truncate">
            {tx.description || tx.category}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {tx.category} · {format(new Date(tx.date), 'd MMM', { locale: es })}
          </Typography>
        </div>
      </div>
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, color: isIncome ? '#2e7d32' : '#c62828' }}
        className="shrink-0 ml-2"
      >
        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
      </Typography>
    </div>
  )
}

export default function Dashboard() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const { monthIncome, monthExpenses, totalDebt, recentTxs, savings } = useMemo(() => {
    const monthTxs = transactionService.getByMonth(year, month)
    const monthIncome = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const monthExpenses = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    const allTxs = transactionService.getAll()
    const recentTxs = allTxs.slice(0, 5)

    const debts = debtService.getAll().filter((d) => !d.isPaid)
    const totalDebt = debts.reduce((s, d) => s + d.amount, 0)

    const savings = savingsService.getAll().filter((s) => !s.isCompleted)

    return { monthIncome, monthExpenses, totalDebt, recentTxs, savings }
  }, [year, month])

  const monthBalance = monthIncome - monthExpenses

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" className="mt-1">
          {format(now, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </Typography>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Ingresos del mes"
          amount={monthIncome}
          icon={<TrendingUpIcon />}
          color="#2e7d32"
          bgColor="#e8f5e9"
          subtitle="Mes actual"
        />
        <StatCard
          title="Egresos del mes"
          amount={monthExpenses}
          icon={<TrendingDownIcon />}
          color="#c62828"
          bgColor="#fce4ec"
          subtitle="Mes actual"
        />
        <StatCard
          title="Balance del mes"
          amount={monthBalance}
          icon={<AccountBalanceWalletIcon />}
          color={monthBalance >= 0 ? '#2e7d32' : '#c62828'}
          bgColor={monthBalance >= 0 ? '#e3f2fd' : '#fce4ec'}
          subtitle={monthBalance >= 0 ? 'Superávit' : 'Déficit'}
        />
        <StatCard
          title="Deuda pendiente"
          amount={totalDebt}
          icon={<AccountBalanceWalletIcon />}
          color="#e65100"
          bgColor="#fff8e1"
          subtitle="Total activo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Últimas transacciones</Typography>
              <Chip label={`${recentTxs.length} registros`} size="small" />
            </div>
            {recentTxs.length === 0 ? (
              <div className="text-center py-8">
                <Typography color="text.secondary" variant="body2">
                  No hay transacciones aún.
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  Agregá tu primera transacción en la sección "Transacciones".
                </Typography>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTxs.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Metas de ahorro</Typography>
              <Avatar sx={{ bgcolor: '#e3f2fd', width: 32, height: 32 }}>
                <SavingsIcon fontSize="small" color="primary" />
              </Avatar>
            </div>
            {savings.length === 0 ? (
              <div className="text-center py-8">
                <Typography color="text.secondary" variant="body2">
                  No tenés metas de ahorro activas.
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  Creá una en la sección "Metas de Ahorro".
                </Typography>
              </div>
            ) : (
              <div className="space-y-4">
                {savings.slice(0, 4).map((goal) => {
                  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between items-center mb-1">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {goal.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                        </Typography>
                      </div>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 8, borderRadius: 4 }}
                        color={progress >= 100 ? 'success' : 'primary'}
                      />
                      <Typography variant="caption" color="text.secondary" className="mt-0.5 block">
                        {progress.toFixed(0)}% completado
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
  )
}
