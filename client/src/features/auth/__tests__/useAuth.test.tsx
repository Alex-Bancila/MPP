import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers'
import { useAuth } from '@/features/auth/useAuth'
import * as serverClient from '@/features/sync/serverClient'
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
      return { kind: 'success' as const, user }
    }),
    verifyTwoFactor: vi.fn(async () => {
      const user = initialAppState.users.find((u) => u.role === 'admin') ?? initialAppState.users[0]
      return user
    }),
    registerServerUser: vi.fn(async (input) => {
      return {
        user: {
          id: 'user_new',
          username: input.username,
          email: input.email,
          passwordHash: hashPassword(input.password),
          avatarUrl: `https://i.pravatar.cc/96?u=${input.email}`,
          createdAt: new Date().toISOString(),
          role: 'user' as const,
          permissions: ['listing:create', 'listing:update', 'listing:delete', 'review:create', 'review:update', 'review:delete', 'favourite:toggle', 'chat:send'],
        },
        adminRequestPending: Boolean(input.requestAdmin),
      }
    }),
    restoreServerSession: vi.fn(async () => null),
    refreshServerSession: vi.fn(async () => false),
    requestMagicLink: vi.fn(async () => true),
    verifyMagicLink: vi.fn(async () => ({
      id: 'user_magic',
      username: 'magic',
      email: 'magic@musiccore.local',
      passwordHash: '',
      avatarUrl: 'https://i.pravatar.cc/96?u=magic',
      createdAt: new Date().toISOString(),
      role: 'user' as const,
      permissions: [],
    })),
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

  it('flags a pending admin request on register', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    let registerResult: Awaited<ReturnType<typeof result.current.register>>
    await act(async () => {
      registerResult = await result.current.register({
        username: 'wannabe_admin',
        email: 'wannabe@musiccore.local',
        password: 'StrongPass123!',
        requestAdmin: true,
      })
    })

    expect(registerResult!.ok).toBe(true)
    expect(registerResult!.adminRequestPending).toBe(true)
  })

  it('requires a second factor for admin login then completes via verifyTwoFactor', async () => {
    vi.mocked(serverClient.loginServerUser).mockResolvedValueOnce({
      kind: '2fa',
      challengeId: 'challenge_123',
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    let loginResult: Awaited<ReturnType<typeof result.current.login>>
    await act(async () => {
      loginResult = await result.current.login({
        email: 'admin@musiccore.local',
        password: 'AdminPass123!',
      })
    })

    expect(loginResult!.ok).toBe(true)
    expect(loginResult!.twoFactorRequired).toBe(true)
    expect(loginResult!.challengeId).toBe('challenge_123')
    // Not logged in until the pass key is verified
    expect(result.current.currentUser).toBeUndefined()

    await act(async () => {
      await result.current.verifyTwoFactor('challenge_123', '000000')
    })

    expect(result.current.currentUser).toBeDefined()
  })
})
