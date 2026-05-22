import { useMemo } from 'react'

import { useAppStore } from '@/app/store/useAppStore'
import { getCurrentUser } from '@/app/store/selectors'
import type { LoginFormValues, RegisterFormValues } from '@/features/auth/authSchema'
import {
  getServerReachable,
  loginServerUser,
  registerServerUser,
} from '@/features/sync/serverClient'
import { initialAppState } from '@/shared/data/seed'
import { hashPassword, verifyPassword } from '@/shared/utils/hash'

export const useAuth = () => {
  const { state, dispatch } = useAppStore()

  const currentUser = useMemo(() => getCurrentUser(state), [state])

  const loginLocal = (values: LoginFormValues): { ok: boolean; message?: string } => {
    const email = values.email.trim().toLowerCase()
    const user = state.users.find((u) => u.email === email) ??
      initialAppState.users.find((u) => u.email === email)
    if (!user || !verifyPassword(values.password, user.passwordHash)) {
      return { ok: false, message: 'Invalid email or password.' }
    }
    dispatch({
      type: 'auth/login',
      payload: { userId: user.id, user },
    })
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
        'listing:create',
        'listing:update',
        'listing:delete',
        'review:create',
        'review:update',
        'review:delete',
        'favourite:toggle',
        'chat:send',
      ],
    }
    dispatch({
      type: 'auth/register',
      payload: newUser,
    })
    return { ok: true }
  }

  const register = async (values: RegisterFormValues): Promise<{ ok: boolean; message?: string }> => {
    const serverReachable = await getServerReachable()
    if (!serverReachable) {
      return registerLocal(values)
    }

    try {
      const user = await registerServerUser(values)
      dispatch({
        type: 'auth/register',
        payload: user,
      })
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
      dispatch({
        type: 'auth/login',
        payload: { userId: user.id, user },
      })
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid email or password.'
      return { ok: false, message }
    }
  }

  const logout = () => {
    dispatch({ type: 'auth/logout' })
  }

  return {
    currentUser,
    register,
    login,
    logout,
  }
}
