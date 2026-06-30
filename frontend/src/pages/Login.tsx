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
  Divider,
  Avatar,
  CircularProgress,
} from '@mui/material'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import FingerprintIcon from '@mui/icons-material/Fingerprint'
import { useAuth } from '@/context/AuthContext'
import { isWebAuthnSupported } from '@/services/webauthn'

export default function Login() {
  const { login, loginBiometric } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  const handleBiometric = async () => {
    if (!email) { setError('Ingresá tu email para usar biométrica'); return }
    setError('')
    setBioLoading(true)
    try {
      await loginBiometric(email)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message
      setError(msg ?? 'No se pudo autenticar con biométrica')
    } finally {
      setBioLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mb: 1.5 }}>
              <AttachMoneyIcon fontSize="large" />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>FinanzApp</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Iniciá sesión en tu cuenta</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="email"
              autoFocus
            />
            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !email || !password}
              sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Iniciar sesión'}
            </Button>
          </form>

          {isWebAuthnSupported() && (
            <>
              <Divider sx={{ my: 2.5 }}>
                <Typography variant="caption" color="text.secondary">o</Typography>
              </Divider>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={bioLoading ? <CircularProgress size={18} /> : <FingerprintIcon />}
                onClick={handleBiometric}
                disabled={bioLoading}
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                Iniciar con huella / Face ID
              </Button>
            </>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            ¿No tenés cuenta?{' '}
            <Link to="/register" style={{ color: 'inherit', fontWeight: 600 }}>
              Registrate
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
