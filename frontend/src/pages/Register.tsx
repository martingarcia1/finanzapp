import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Avatar,
  CircularProgress,
} from '@mui/material'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import { useAuth } from '@/context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ userName: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError('')
    setLoading(true)
    try {
      await register(form.email, form.password, form.userName)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear la cuenta. El email puede estar en uso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mb: 1.5 }}>
              <AttachMoneyIcon fontSize="large" />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>FinanzApp</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Creá tu cuenta gratis</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Tu nombre"
              fullWidth
              value={form.userName}
              onChange={set('userName')}
              sx={{ mb: 2 }}
              autoFocus
              placeholder="Ej: Martín"
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={form.email}
              onChange={set('email')}
              sx={{ mb: 2 }}
              autoComplete="email"
            />
            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              value={form.password}
              onChange={set('password')}
              sx={{ mb: 2 }}
              autoComplete="new-password"
            />
            <TextField
              label="Confirmar contraseña"
              type="password"
              fullWidth
              value={form.confirm}
              onChange={set('confirm')}
              sx={{ mb: 3 }}
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !form.userName || !form.email || !form.password || !form.confirm}
              sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Crear cuenta'}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>
              Iniciá sesión
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
