import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
  Avatar,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import SavingsIcon from '@mui/icons-material/Savings'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import BarChartIcon from '@mui/icons-material/BarChart'
import MenuIcon from '@mui/icons-material/Menu'
import HomeIcon from '@mui/icons-material/Home'
import WalletIcon from '@mui/icons-material/Wallet'
import SettingsIcon from '@mui/icons-material/Settings'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import LogoutIcon from '@mui/icons-material/Logout'
import Tooltip from '@mui/material/Tooltip'

const DRAWER_WIDTH = 240

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Billeteras',    path: '/wallets',      icon: <WalletIcon /> },
  { label: 'Transacciones', path: '/transactions', icon: <ReceiptLongIcon /> },
  { label: 'Deudas',        path: '/debts',        icon: <AccountBalanceWalletIcon /> },
  { label: 'Metas de Ahorro', path: '/savings', icon: <SavingsIcon /> },
  { label: 'Gastos Fijos', path: '/fixed-expenses', icon: <HomeIcon /> },
  { label: 'Calendario', path: '/calendar', icon: <CalendarMonthIcon /> },
  { label: 'Estadísticas', path: '/statistics', icon: <BarChartIcon /> },
  { label: 'Ajustes',      path: '/settings',   icon: <SettingsIcon /> },
]

interface Props {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user, logout } = useAuth()

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          <AttachMoneyIcon fontSize="small" />
        </Avatar>
        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>
          FinanzApp
        </Typography>
      </Box>
      <Divider />

      <List sx={{ flex: 1, pt: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path
          return (
            <ListItem key={item.path} disablePadding sx={{ px: 1, mb: 0.5 }}>
              <ListItemButton
                selected={active}
                onClick={() => {
                  navigate(item.path)
                  if (isMobile) setMobileOpen(false)
                }}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' },
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { sx: { fontWeight: active ? 600 : 400 } } }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32, fontSize: 14 }}>
          {user?.userName?.[0]?.toUpperCase() ?? '?'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.userName ?? 'Usuario'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {user?.email}
          </Typography>
        </Box>
        <Tooltip title="Cerrar sesión">
          <IconButton size="small" onClick={logout} sx={{ color: 'text.secondary' }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile && (
        <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              FinanzApp
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none', boxShadow: '2px 0 8px rgba(0,0,0,0.06)' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: isMobile ? 8 : 0,
          bgcolor: 'background.default',
          minHeight: '100vh',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
