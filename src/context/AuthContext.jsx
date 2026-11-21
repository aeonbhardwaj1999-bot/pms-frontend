import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, clearToken, getToken, setToken, setUnauthorizedHandler } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken()
      setUser(null)
    })
    if (!getToken()) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(() => {
    const role = user?.role
    return {
      user,
      loading,
      login,
      logout,
      isAdmin: role === 'ADMIN',
      isManager: role === 'ADMIN' || role === 'STAFF',
      isEngineer: role === 'ENGINEER',
      isHospital: role === 'HOSPITAL',
      isInternal: role === 'ADMIN' || role === 'STAFF' || role === 'ENGINEER',
    }
  }, [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
