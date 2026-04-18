import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '../types'
import { authApi } from '../api'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('bs_user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bs_token'))
  const [isLoading] = useState(false)

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('bs_token', newToken)
    localStorage.setItem('bs_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('bs_token')
    localStorage.removeItem('bs_user')
    setToken(null)
    setUser(null)
  }, [])

  const refetchUser = useCallback(async () => {
    if (!localStorage.getItem('bs_token')) return
    try {
      const res = await authApi.me()
      const freshUser = res.data.data || res.data.user || res.data
      setUser(freshUser)
      localStorage.setItem('bs_user', JSON.stringify(freshUser))
    } catch {
      // 401 handled by interceptor
    }
  }, [])

  useEffect(() => {
    if (token && !user) refetchUser()
  }, [token, user, refetchUser])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
