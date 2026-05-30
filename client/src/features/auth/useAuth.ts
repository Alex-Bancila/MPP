import { useMemo, useEffect, useRef } from 'react'
import { useAppStore } from '@/app/store/useAppStore'
import { getCurrentUser } from '@/app/store/selectors'
import type { LoginFormValues, RegisterFormValues } from '@/features/auth/authSchema'
import {
  getAuthToken,
  getServerReachable,
  loginServerUser,
  registerServerUser,
  restoreServerSession,
  setAuthToken,
  setRefreshToken,
  refreshServerSession,
  logoutServerSession,
  requestMagicLink,
  verifyMagicLink,
} from '@/features/sync/serverClient'
import { initialAppState } from '@/shared/data/seed'
import { hashPassword, verifyPassword } from '@/shared/utils/hash'

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export const useAuth = () => {
  const { state, dispatch } = useAppStore()
  const currentUser = useMemo(() => getCurrentUser(state), [state])
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logout = () => {
    void logoutServerSession()
    setAuthToken(null)
    setRefreshToken(null)
    dispatch({ type: 'auth/logout' })
  }

  // FIX: Restore session on page reload.
  // On mount, if there is a token in localStorage but no user in the store yet,
  // call /auth/me to get the user back (with the correct role/permissions from the DB).
  useEffect(() => {
    if (currentUser) return        // already logged in (e.g. during HMR)
    if (!getAuthToken()) return    // no token stored, nothing to restore

    void (async () => {
      const user = await restoreServerSession()
      if (user) {
        dispatch({ type: 'auth/login', payload: { userId: user.id, user } })
        return
      }
      const ok = await refreshServerSession()
      if (!ok) return
      const restored = await restoreServerSession()
      if (restored) {
        dispatch({ type: 'auth/login', payload: { userId: restored.id, user: restored } })
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs once on mount

  // Inactivity logout
  useEffect(() => {
    if (!currentUser) return

    const resetTimer = () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current)
      }
      inactivityTimer.current = setTimeout(() => {
        logout()
      }, INACTIVITY_TIMEOUT_MS)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, resetTimer))
    resetTimer()

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer))
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current)
      }
    }
  }, [currentUser])

  const loginLocal = (values: LoginFormValues): { ok: boolean; message?: string } => {
    const email = values.email.trim().toLowerCase()
    const user = state.users.find((u) => u.email === email) ??
      initialAppState.users.find((u) => u.email === email)
    if (!user || !verifyPassword(values.password, user.passwordHash)) {
      return { ok: false, message: 'Invalid email or password.' }
    }
    dispatch({ type: 'auth/login', payload: { userId: user.id, user } })
    return { ok: true }
  }

  const registerLocal = (values: RegisterFormValues): { ok: boolean; message?: string } => {
    const email = values.email.trim().toLowerCase()
    const username = values.username.trim()
    const existingEmail = state.users.find((u) => u.email === email) ??
      initialAppState.users.find((u) => u.email === email)
    if (existingEmail) {
      return { ok: false, message: 'An account with this email already exists.' }
    }
    const existingUsername = state.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    )
    if (existingUsername) {
      return { ok: false, message: 'This username is already taken.' }
    }
    const newUser = {
      id: `user_${Date.now()}`,
      username,
      email,
      passwordHash: hashPassword(values.password),
      avatarUrl: `https://i.pravatar.cc/96?u=${email}`,
      createdAt: new Date().toISOString(),
      role: 'user' as const,
      permissions: [
        'listing:create', 'listing:update', 'listing:delete',
        'review:create', 'review:update', 'review:delete',
        'favourite:toggle', 'chat:send',
      ],
    }
    dispatch({ type: 'auth/register', payload: newUser })
    return { ok: true }
  }

  const register = async (values: RegisterFormValues): Promise<{ ok: boolean; message?: string }> => {
    const serverReachable = await getServerReachable()
    if (!serverReachable) {
      return registerLocal(values)
    }
    try {
      const user = await registerServerUser(values)
      dispatch({ type: 'auth/register', payload: user })
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.'
      return { ok: false, message }
    }
  }

  const login = async (values: LoginFormValues): Promise<{ ok: boolean; message?: string }> => {
    const serverReachable = await getServerReachable()
    if (!serverReachable) {
      return loginLocal(values)
    }
    try {
      const user = await loginServerUser(values)
      dispatch({ type: 'auth/login', payload: { userId: user.id, user } })
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid email or password.'
      return { ok: false, message }
    }
  }

  const loginWithMagic = async (token: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      const user = await verifyMagicLink({ token })
      dispatch({ type: 'auth/login', payload: { userId: user.id, user } })
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Magic link failed.'
      return { ok: false, message }
    }
  }

  const requestMagic = async (email: string): Promise<{ ok: boolean; message?: string }> => {
    const ok = await requestMagicLink({ email })
    return ok ? { ok: true } : { ok: false, message: 'Unable to request magic link.' }
  }

  const hasPermission = (perm: string): boolean =>
    currentUser?.permissions?.includes(perm) ?? false

  const isAdmin = currentUser?.role === 'admin'

  return { currentUser, register, login, logout, loginWithMagic, requestMagic, hasPermission, isAdmin }
}
