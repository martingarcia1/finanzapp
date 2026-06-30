import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '@/theme'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Debts from '@/pages/Debts'
import Savings from '@/pages/Savings'
import Calendar from '@/pages/Calendar'
import Statistics from '@/pages/Statistics'
import FixedExpenses from '@/pages/FixedExpenses'
import Wallets from '@/pages/Wallets'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
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
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  )
}
