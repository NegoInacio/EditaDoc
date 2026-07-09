import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

type AuthUser = {
  id: string
  email: string
  plan: string
}

type AuthState = {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthState | null>(null)

function parseStoredUser(): { token: string; user: AuthUser } | null {
  try {
    const token = localStorage.getItem('token')
    const raw = localStorage.getItem('user')
    if (!token || !raw) return null
    return { token, user: JSON.parse(raw) as AuthUser }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = parseStoredUser()
  const [token, setToken] = useState<string | null>(stored?.token ?? null)
  const [user, setUser] = useState<AuthUser | null>(stored?.user ?? null)

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora de AuthProvider')
  return ctx
}
