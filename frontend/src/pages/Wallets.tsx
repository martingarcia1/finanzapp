import { useState, useEffect, useCallback } from 'react'
import {
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import MoneyIcon from '@mui/icons-material/Money'
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin'
import WalletIcon from '@mui/icons-material/Wallet'
import { walletService } from '@/services/storage'
import type { Wallet, WalletFormData, WalletType } from '@/types'
import { WALLET_TYPES, WALLET_COLORS } from '@/types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

const WALLET_ICON: Record<WalletType, React.ReactNode> = {
  cash:         <MoneyIcon />,
  bank:         <AccountBalanceIcon />,
  mercado_pago: <ShoppingCartIcon />,
  personal_pay: <PhoneAndroidIcon />,
  crypto:       <CurrencyBitcoinIcon />,
  other:        <WalletIcon />,
}

// ─── Diálogo crear / editar ────────────────────────────────────────────────

const EMPTY_FORM: WalletFormData = {
  name: '',
  type: 'cash',
  balance: 0,
  color: WALLET_COLORS[0],
  description: '',
}

interface WalletDialogProps {
  open: boolean
  initial: WalletFormData | null
  onClose: () => void
  onSave: (data: WalletFormData) => void
}

function WalletDialog({ open, initial, onClose, onSave }: WalletDialogProps) {
  const [form, setForm] = useState<WalletFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof WalletFormData, string>>>({})

  useEffect(() => {
    if (open) { setForm(initial ?? EMPTY_FORM); setErrors({}) }
  }, [open, initial])

  const set = <K extends keyof WalletFormData>(k: K, v: WalletFormData[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const validate = () => {
    const errs: Partial<Record<keyof WalletFormData, string>> = {}
    if (!form.name.trim()) errs.name = 'Ingresá un nombre'
    if (form.balance < 0) errs.balance = 'El saldo no puede ser negativo'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave(form)
  }

  const defaultColor = WALLET_TYPES.find((t) => t.value === form.type)?.color

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Editar billetera' : 'Nueva billetera'}</DialogTitle>
      <DialogContent className="space-y-4 pt-2">
        <TextField
          label="Nombre"
          fullWidth
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
          placeholder="Ej: Santander, Efectivo casa, Inversiones"
        />

        <TextField
          select
          label="Tipo"
          fullWidth
          value={form.type}
          onChange={(e) => {
            const t = e.target.value as WalletType
            const col = WALLET_TYPES.find((x) => x.value === t)?.color ?? WALLET_COLORS[0]
            setForm((f) => ({ ...f, type: t, color: col }))
          }}
        >
          {WALLET_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
              </div>
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Saldo inicial"
          type="number"
          fullWidth
          value={form.balance || ''}
          onChange={(e) => set('balance', parseFloat(e.target.value) || 0)}
          error={!!errors.balance}
          helperText={errors.balance}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
        />

        <div>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Color de la tarjeta
          </Typography>
          <div className="flex gap-2 flex-wrap">
            {WALLET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                style={{ backgroundColor: c }}
                className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-transform hover:scale-110
                  ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
              />
            ))}
            {defaultColor && !WALLET_COLORS.includes(defaultColor) && (
              <button
                type="button"
                onClick={() => set('color', defaultColor)}
                style={{ backgroundColor: defaultColor }}
                className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-transform hover:scale-110
                  ${form.color === defaultColor ? 'border-gray-800 scale-110' : 'border-transparent'}`}
              />
            )}
          </div>
        </div>

        <TextField
          label="Descripción (opcional)"
          fullWidth
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Ej: Cuenta sueldo, Ahorros en dólares"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">
          {initial ? 'Guardar cambios' : 'Crear billetera'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Diálogo ajustar saldo ─────────────────────────────────────────────────

interface AdjustDialogProps {
  wallet: Wallet | null
  onClose: () => void
  onSave: () => void
}

function AdjustDialog({ wallet, onClose, onSave }: AdjustDialogProps) {
  const [op, setOp] = useState<'add' | 'subtract'>('add')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (wallet) { setOp('add'); setAmount(''); setError('') }
  }, [wallet])

  const handleSubmit = () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) { setError('Ingresá un monto válido'); return }
    if (op === 'subtract' && wallet && val > wallet.balance) {
      setError('No podés retirar más de lo disponible')
      return
    }
    walletService.adjustBalance(wallet!.id, op === 'add' ? val : -val)
    onSave()
    onClose()
  }

  return (
    <Dialog open={!!wallet} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Ajustar saldo — {wallet?.name}</DialogTitle>
      <DialogContent className="space-y-3 pt-2">
        <ToggleButtonGroup
          value={op}
          exclusive
          onChange={(_, v) => v && setOp(v)}
          fullWidth
          size="small"
        >
          <ToggleButton value="add" sx={{ '&.Mui-selected': { bgcolor: '#e8f5e9', color: 'success.main' } }}>
            <AddCircleOutlineIcon fontSize="small" sx={{ mr: 0.5 }} /> Ingresar fondos
          </ToggleButton>
          <ToggleButton value="subtract" sx={{ '&.Mui-selected': { bgcolor: '#fce4ec', color: 'error.main' } }}>
            <RemoveCircleOutlineIcon fontSize="small" sx={{ mr: 0.5 }} /> Retirar fondos
          </ToggleButton>
        </ToggleButtonGroup>

        {wallet && (
          <Typography variant="caption" color="text.secondary">
            Saldo actual: <strong>{formatCurrency(wallet.balance)}</strong>
          </Typography>
        )}

        <TextField
          label="Monto"
          type="number"
          fullWidth
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError('') }}
          error={!!error}
          helperText={error}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" color={op === 'add' ? 'success' : 'error'}>
          {op === 'add' ? 'Ingresar' : 'Retirar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Diálogo transferir ────────────────────────────────────────────────────

interface TransferDialogProps {
  open: boolean
  wallets: Wallet[]
  onClose: () => void
  onSave: () => void
}

function TransferDialog({ open, wallets, onClose, onSave }: TransferDialogProps) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setFromId(wallets[0]?.id ?? '')
      setToId(wallets[1]?.id ?? '')
      setAmount('')
      setErrors({})
    }
  }, [open, wallets])

  const fromWallet = wallets.find((w) => w.id === fromId)

  const validate = () => {
    const errs: Record<string, string> = {}
    const val = parseFloat(amount)
    if (!val || val <= 0) errs.amount = 'Ingresá un monto válido'
    if (fromId === toId) errs.to = 'Elegí una billetera distinta'
    if (fromWallet && val > fromWallet.balance) errs.amount = 'Saldo insuficiente'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const success = walletService.transfer(fromId, toId, parseFloat(amount))
    if (success) { onSave(); onClose() }
    else setErrors({ amount: 'Error al transferir. Verificá el saldo.' })
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Transferir entre billeteras</DialogTitle>
      <DialogContent className="space-y-4 pt-2">
        <TextField
          select
          label="Desde"
          fullWidth
          value={fromId}
          onChange={(e) => setFromId(e.target.value)}
        >
          {wallets.map((w) => (
            <MenuItem key={w.id} value={w.id}>
              {w.name} — {formatCurrency(w.balance)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Hacia"
          fullWidth
          value={toId}
          onChange={(e) => setToId(e.target.value)}
          error={!!errors.to}
          helperText={errors.to}
        >
          {wallets.filter((w) => w.id !== fromId).map((w) => (
            <MenuItem key={w.id} value={w.id}>
              {w.name} — {formatCurrency(w.balance)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Monto"
          type="number"
          fullWidth
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setErrors({}) }}
          error={!!errors.amount}
          helperText={errors.amount ?? (fromWallet ? `Disponible: ${formatCurrency(fromWallet.balance)}` : '')}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" startIcon={<SwapHorizIcon />}>
          Transferir
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────

export default function Wallets() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Wallet | null>(null)
  const [adjusting, setAdjusting] = useState<Wallet | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)

  const load = useCallback(() => setWallets(walletService.getAll()), [])
  useEffect(() => { load() }, [load])

  const total = wallets.reduce((s, w) => s + w.balance, 0)

  const handleSave = (data: WalletFormData) => {
    if (editing) walletService.update(editing.id, data)
    else walletService.create(data)
    setDialogOpen(false)
    setEditing(null)
    load()
  }

  const handleEdit = (w: Wallet) => {
    setEditing(w)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    walletService.delete(id)
    load()
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Billeteras</Typography>
          <Typography variant="body2" color="text.secondary">
            {wallets.length} billetera{wallets.length !== 1 ? 's' : ''} · Total {formatCurrency(total)}
          </Typography>
        </div>
        <div className="flex gap-2">
          {wallets.length >= 2 && (
            <Button
              variant="outlined"
              startIcon={<SwapHorizIcon />}
              onClick={() => setTransferOpen(true)}
            >
              Transferir
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setDialogOpen(true) }}
          >
            Nueva billetera
          </Button>
        </div>
      </div>

      {/* Tarjeta total */}
      {wallets.length > 0 && (
        <div
          className="rounded-2xl p-5 mb-6 text-white"
          style={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' }}
        >
          <Typography variant="body2" sx={{ opacity: 0.85, mb: 0.5 }}>
            Saldo total
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: -1 }}>
            {formatCurrency(total)}
          </Typography>
          <div className="flex gap-4 mt-3 flex-wrap">
            {wallets.map((w) => (
              <div key={w.id} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color }} />
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {w.name}: {formatCurrency(w.balance)}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid de billeteras */}
      {wallets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Avatar sx={{ bgcolor: '#e3f2fd', width: 56, height: 56, mx: 'auto', mb: 2 }}>
            <WalletIcon sx={{ color: '#1976d2', fontSize: 28 }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            Sin billeteras
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
            Creá tu primera billetera para empezar a rastrear tus saldos.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setDialogOpen(true) }}
          >
            Nueva billetera
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wallets.map((wallet) => {
            const typeInfo = WALLET_TYPES.find((t) => t.value === wallet.type)
            return (
              <div
                key={wallet.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Barra de color superior */}
                <div className="h-2" style={{ backgroundColor: wallet.color }} />

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar sx={{ bgcolor: `${wallet.color}22`, color: wallet.color, width: 44, height: 44 }}>
                        {WALLET_ICON[wallet.type]}
                      </Avatar>
                      <div>
                        <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {wallet.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {typeInfo?.label}
                        </Typography>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleEdit(wallet)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(wallet.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>

                  {wallet.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                      {wallet.description}
                    </Typography>
                  )}

                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 800, color: wallet.balance > 0 ? '#1a1a1a' : '#9e9e9e', mb: 2 }}
                  >
                    {formatCurrency(wallet.balance)}
                  </Typography>

                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => setAdjusting(wallet)}
                    sx={{ borderColor: wallet.color, color: wallet.color, '&:hover': { borderColor: wallet.color, bgcolor: `${wallet.color}11` } }}
                  >
                    Ajustar saldo
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <WalletDialog
        open={dialogOpen}
        initial={editing ? (({ id, createdAt, ...d }) => (void id, void createdAt, d))(editing) : null}
        onClose={handleCloseDialog}
        onSave={handleSave}
      />
      <AdjustDialog wallet={adjusting} onClose={() => setAdjusting(null)} onSave={load} />
      <TransferDialog open={transferOpen} wallets={wallets} onClose={() => setTransferOpen(false)} onSave={load} />
    </div>
  )
}
