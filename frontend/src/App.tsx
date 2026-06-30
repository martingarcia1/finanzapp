import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '@/theme'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Debts from '@/pages/Debts'
import Savings from '@/pages/Savings'
import Calendar from '@/pages/Calendar'
import Statistics from '@/pages/Statistics'
import FixedExpenses from '@/pages/FixedExpenses'
import Wallets from '@/pages/Wallets'
import Settings from '@/pages/Settings'

function PrivateRoutes() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/debts" element={<Debts />} />
        <Route path="/savings" element={<Savings />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/fixed-expenses" element={<FixedExpenses />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/*" element={<PrivateRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}
