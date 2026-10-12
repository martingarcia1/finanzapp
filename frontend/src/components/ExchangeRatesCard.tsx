import { Card, CardContent, Typography, Avatar, IconButton, Tooltip, Skeleton, Alert } from '@mui/material'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import RefreshIcon from '@mui/icons-material/Refresh'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useExchangeRates } from '@/context/ExchangeRateContext'
import { DOLLAR_RATE_LABELS } from '@/services/exchangeRates'
import { formatRate } from '@/lib/money'

export default function ExchangeRatesCard() {
  const { rates, loading, error, stale, rateType, setRateType, refresh } = useExchangeRates()

  const lastUpdate = rates.length
    ? new Date(Math.max(...rates.map((r) => new Date(r.updatedAt).getTime())))
    : null

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar sx={{ bgcolor: '#e0f2f1', width: 32, height: 32 }}>
              <CurrencyExchangeIcon sx={{ fontSize: 16, color: '#00796b' }} />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Dólar hoy</Typography>
          </div>
          <Tooltip title="Actualizar">
            <IconButton size="small" onClick={refresh}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>

        {error && !rates.length && <Alert severity="warning" sx={{ py: 0 }}>{error}</Alert>}
        {stale && (
          <Alert severity="info" sx={{ py: 0, mb: 1 }}>
            La fuente no responde: se muestra la última cotización conocida.
          </Alert>
        )}

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={28} />)}
          </div>
        ) : rates.length > 0 && (
          <>
            <div className="flex px-2 mb-1">
              <span className="flex-1" />
              <Typography variant="caption" color="text.secondary" sx={{ width: 84, textAlign: 'right' }}>Compra</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ width: 84, textAlign: 'right' }}>Venta</Typography>
            </div>
            {rates.map((r) => {
              const active = r.code === rateType
              return (
                <Tooltip key={r.code} title={active ? 'Cotización usada para convertir' : 'Usar esta cotización'} placement="left">
                  <button
                    type="button"
                    onClick={() => setRateType(r.code)}
                    className={`flex w-full items-center px-2 py-1 rounded-lg cursor-pointer transition-colors
                      ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <Typography
                      variant="body2"
                      sx={{ flex: 1, textAlign: 'left', fontWeight: active ? 800 : 500, color: active ? 'primary.main' : 'text.primary' }}
                    >
                      {DOLLAR_RATE_LABELS[r.code] ?? r.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: 84, textAlign: 'right' }}>
                      {r.buy ? formatRate(r.buy) : '—'}
                    </Typography>
                    <Typography variant="body2" sx={{ width: 84, textAlign: 'right', fontWeight: 700 }}>
                      {formatRate(r.sell)}
                    </Typography>
                  </button>
                </Tooltip>
              )
            })}
            {lastUpdate && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Actualizado {formatDistanceToNow(lastUpdate, { locale: es, addSuffix: true })} · Fuente: dolarapi.com
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
