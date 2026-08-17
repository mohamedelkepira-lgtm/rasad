import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

const AUTH_DOMAIN = 'rasad.school'

export function authEmailFromUsername(username) {
  const u = String(username || '').trim()
  if (!u) return ''
  return u.includes('@') ? u.toLowerCase() : `${u.toLowerCase()}@${AUTH_DOMAIN}`
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) return null
    const { data } = await supabase.from('profiles').select('id, name, role').eq('id', userId).maybeSingle()
    if (data) setProfile(data)
    return data
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) loadProfile(s.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const login = useCallback(async (username, password) => {
    const email = authEmailFromUsername(username)
    if (!email) throw new Error('missing_username')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(() => ({
    session,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    login,
    logout,
    isSupabaseConfigured
  }), [session, profile, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
