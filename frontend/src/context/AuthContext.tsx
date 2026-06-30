import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import api from '@/services/api'
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
    const payload = JSON.parse(atob(token.split('.')[1]))
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
  const token = localStorage.getItem('fa_token')
  if (!token) return null
  return parseToken(token)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)

  const storeAuth = useCallback((token: string) => {
    localStorage.setItem('fa_token', token)
    setUser(parseToken(token))
  }, [])

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
    localStorage.removeItem('fa_token')
    setUser(null)
  }, [])

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
