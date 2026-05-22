import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers'
import { useAuth } from '@/features/auth/useAuth'
import { initialAppState } from '@/shared/data/seed'
import { hashPassword, verifyPassword } from '@/shared/utils/hash'

vi.mock('@/features/sync/serverClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/sync/serverClient')>()
  return {
    ...actual,
    getServerReachable: vi.fn(async () => true),
    loginServerUser: vi.fn(async (input) => {
      const user = initialAppState.users.find((u) => u.email === input.email)
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new Error('Invalid email or password.')
      }
      return user
    }),
    registerServerUser: vi.fn(async (input) => {
      return {
        id: 'user_new',
        username: input.username,
        email: input.email,
        passwordHash: hashPassword(input.password),
        avatarUrl: `https://i.pravatar.cc/96?u=${input.email}`,
        createdAt: new Date().toISOString(),
        role: 'user' as const,
        permissions: ['listing:create', 'listing:update', 'listing:delete', 'review:create', 'review:update', 'review:delete', 'favourite:toggle', 'chat:send'],
      }
    }),
  }
})

const wrapper = ({ children }: { children: ReactNode }) => {
  return <AppProviders>{children}</AppProviders>
}

describe('useAuth', () => {
  it('logs in with seeded user credentials and logs out', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    let loginResult: Awaited<ReturnType<typeof result.current.login>>

    await act(async () => {
      loginResult = await result.current.login({
        email: 'alex@musiccore.local',
        password: 'RiffMaster123!',
      })
    })

    expect(loginResult!.ok).toBe(true)
    expect(result.current.currentUser?.email).toBe('alex@musiccore.local')

    act(() => {
      result.current.logout()
    })

    expect(result.current.currentUser).toBeUndefined()
  })

  it('rejects invalid credentials', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    const loginResult = await result.current.login({
      email: 'alex@musiccore.local',
      password: 'WrongPass!123',
    })

    expect(loginResult.ok).toBe(false)
    expect(result.current.currentUser).toBeUndefined()
  })

  it('registers a user and authenticates them', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    let registerResult: Awaited<ReturnType<typeof result.current.register>>

    await act(async () => {
      registerResult = await result.current.register({
        username: 'new_riffer',
        email: 'new@musiccore.local',
        password: 'StrongPass123!',
      })
    })

    expect(registerResult!.ok).toBe(true)
    expect(result.current.currentUser?.email).toBe('new@musiccore.local')
  })
})
