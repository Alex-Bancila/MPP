import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../../app'
import { TWO_FACTOR_TTL_MS } from '../../app'
import { initialAppState } from '../../shared'
import { parseJson } from '../../test/testUtils'

describe('admin requests, 2FA, and banning', () => {
  let built: Awaited<ReturnType<typeof buildApp>>

  const resetStore = () => {
    built.store.state = structuredClone(initialAppState)
    built.store.logs = []
    built.store.suspiciousUsers = []
    built.store.adminRequests = []
  }

  const adminToken = (): string => {
    const admin = built.store.state.users.find((u) => u.role === 'admin')!
    return built.app.jwt.sign({
      sub: admin.id,
      username: admin.username,
      role: 'admin',
      permissions: ['admin:read', 'audit:read', 'user:ban'],
    })
  }

  beforeEach(async () => {
    built = await buildApp()
    resetStore()
  })

  afterEach(async () => {
    await built.app.close()
  })

  it('issues a 2FA challenge for admin login instead of a token', async () => {
    const response = await built.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'alex@musiccore.local', password: 'RiffMaster123!' },
    })

    expect(response.statusCode).toBe(200)
    const body = parseJson<{ twoFactorRequired?: boolean; challengeId?: string; token?: string }>(response.payload)
    expect(body.twoFactorRequired).toBe(true)
    expect(body.challengeId).toBeTruthy()
    expect(body.token).toBeUndefined()
  })

  it('completes admin login after verifying the emailed pass key', async () => {
    const admin = built.store.state.users.find((u) => u.role === 'admin')!
    const { challengeId, code } = built.tokens.createTwoFactorChallenge(admin.id, TWO_FACTOR_TTL_MS)

    const response = await built.app.inject({
      method: 'POST',
      url: '/auth/login/verify-2fa',
      payload: { challengeId, code },
    })

    expect(response.statusCode).toBe(200)
    const body = parseJson<{ token?: string; role?: string }>(response.payload)
    expect(body.token).toBeTruthy()
    expect(body.role).toBe('admin')
  })

  it('rejects an incorrect 2FA pass key', async () => {
    const admin = built.store.state.users.find((u) => u.role === 'admin')!
    const { challengeId } = built.tokens.createTwoFactorChallenge(admin.id, TWO_FACTOR_TTL_MS)

    const response = await built.app.inject({
      method: 'POST',
      url: '/auth/login/verify-2fa',
      payload: { challengeId, code: '000000_wrong' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('creates a pending admin request on register and approves it', async () => {
    // Register persists to the test DB, so use a unique email to avoid collisions across runs.
    const email = `wannabe_${Date.now()}@musiccore.local`
    const register = await built.app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `wannabe_${Date.now()}`,
        email,
        password: 'StrongPass123!',
        requestAdmin: true,
      },
    })

    expect(register.statusCode).toBe(200)
    const registerBody = parseJson<{ adminRequestPending?: boolean; role?: string }>(register.payload)
    expect(registerBody.adminRequestPending).toBe(true)
    expect(registerBody.role).toBe('user')
    expect(built.store.adminRequests).toHaveLength(1)

    const list = await built.app.inject({
      method: 'GET',
      url: '/admin/requests',
      headers: { authorization: `Bearer ${adminToken()}` },
    })
    expect(list.statusCode).toBe(200)
    const requestId = parseJson<{ requests: Array<{ id: string; status: string }> }>(list.payload).requests[0].id

    const approve = await built.app.inject({
      method: 'POST',
      url: `/admin/requests/${requestId}/approve`,
      headers: { authorization: `Bearer ${adminToken()}` },
    })
    expect(approve.statusCode).toBe(200)
    expect(parseJson<{ request: { status: string } }>(approve.payload).request.status).toBe('approved')

    const promoted = built.store.state.users.find((u) => u.email === email)
    expect(promoted?.role).toBe('admin')
  })

  it('blocks a banned user from logging in with the ban reason', async () => {
    const ban = await built.app.inject({
      method: 'POST',
      url: '/admin/users/ban',
      headers: { authorization: `Bearer ${adminToken()}` },
      payload: { email: 'maya@musiccore.local', reason: 'Rapid listing creation — possible spam' },
    })
    expect(ban.statusCode).toBe(200)
    expect(parseJson<{ banned: boolean }>(ban.payload).banned).toBe(true)

    const login = await built.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'maya@musiccore.local', password: 'BlastBeat123!' },
    })
    expect(login.statusCode).toBe(401)
    expect(parseJson<{ message: string }>(login.payload).message).toContain('banned')
    expect(parseJson<{ message: string }>(login.payload).message).toContain('possible spam')

    const unban = await built.app.inject({
      method: 'POST',
      url: '/admin/users/unban',
      headers: { authorization: `Bearer ${adminToken()}` },
      payload: { email: 'maya@musiccore.local' },
    })
    expect(unban.statusCode).toBe(200)

    const loginAgain = await built.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'maya@musiccore.local', password: 'BlastBeat123!' },
    })
    expect(loginAgain.statusCode).toBe(200)
    expect(parseJson<{ token?: string }>(loginAgain.payload).token).toBeTruthy()
  })

  it('forbids non-admins from listing admin requests', async () => {
    const userToken = built.app.jwt.sign({
      sub: 'user_2',
      username: 'maya',
      role: 'user',
      permissions: ['listing:create'],
    })

    const response = await built.app.inject({
      method: 'GET',
      url: '/admin/requests',
      headers: { authorization: `Bearer ${userToken}` },
    })
    expect(response.statusCode).toBe(403)
  })
})
