import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api, { TOKEN_KEY, UNAUTHORIZED_EVENT } from '@/services/api'
import { loginWithBiometric as webAuthnLogin } from '@/services/webauthn'

interface AuthUser {
  userId: string
  userName: string
  email: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginBiometric: (email: string) => Promise<void>
  register: (email: string, password: string, userName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function parseToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    // Token vencido: se trata como sesión cerrada
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null
    return {
      userId: payload.sub,
      email: payload.email,
      userName: payload.name ?? payload.email,
    }
  } catch {
    return null
  }
}

function loadStoredUser(): AuthUser | null {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  const user = parseToken(token)
  if (!user) localStorage.removeItem(TOKEN_KEY)
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)
  const queryClient = useQueryClient()

  const storeAuth = useCallback((token: string) => {
    // Nunca mostrar datos cacheados de otra sesión
    queryClient.clear()
    localStorage.setItem(TOKEN_KEY, token)
    setUser(parseToken(token))
  }, [queryClient])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    storeAuth(data.token)
  }, [storeAuth])

  const loginBiometric = useCallback(async (email: string) => {
    const token = await webAuthnLogin(email)
    storeAuth(token)
  }, [storeAuth])

  const register = useCallback(async (email: string, password: string, userName: string) => {
    const { data } = await api.post('/auth/register', { email, password, userName })
    storeAuth(data.token)
  }, [storeAuth])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  // El API respondió 401 (token vencido o inválido): volver al login
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout)
  }, [logout])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, loginBiometric, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
