import type { FastifyInstance } from 'fastify'

import type { AuthService } from '../services/authService'
import type { MemoryStore } from '../storage/memoryStore'
import type { ServerHub } from '../transport/serverHub'
import type { AuditService } from '../services/auditService'
import type { TokenStore } from '../storage/tokenStore'
import { addUserToStore } from '../db/storeUpdates'
import { JWT_EXPIRY, REFRESH_TOKEN_TTL_MS, RESET_TOKEN_TTL_MS, MAGIC_TOKEN_TTL_MS } from '../app'
import { requireAuth } from '../lib/auth'

export interface RegisterAuthRoutesDeps {
  authService: AuthService
  hub: ServerHub
  store: MemoryStore
  auditService: AuditService
  tokens: TokenStore
}

export const registerAuthRoutes = (app: FastifyInstance, deps: RegisterAuthRoutesDeps): void => {
  const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:5173'
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
  const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL ?? `${APP_URL}/auth/callback`
  const issueTokens = (user: { id: string; username: string; role?: string; permissions?: string[] }, request: any) => {
    const accessToken = app.jwt.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions ?? [],
    })

    const refresh = deps.tokens.createRefreshToken({
      userId: user.id,
      ttlMs: REFRESH_TOKEN_TTL_MS,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    })

    return { accessToken, refreshToken: refresh.token, expiresIn: JWT_EXPIRY }
  }

  app.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string }

    if (!email || !password) {
      return reply.code(400).send({ message: 'Email and password are required.' })
    }

    try {
      const result = await deps.authService.login({ email, password })
      const user = {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        passwordHash: result.user.passwordHash,
        avatarUrl: result.user.avatarUrl,
        createdAt: result.user.createdAt,
        role: result.user.role,
        permissions: result.permissions,
      }

      addUserToStore(deps.store, user)
      deps.hub.broadcast({ users: [user], sync: deps.store.state.sync })

      const { accessToken, refreshToken, expiresIn } = issueTokens(user, request)

      await deps.auditService.recordAction({
        userId: user.id,
        role: user.role ?? 'user',
        action: 'auth/login',
        details: `User ${user.username} logged in`,
      })

      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        role: user.role,
        permissions: user.permissions,
        token: accessToken,
        refreshToken,
        expiresIn,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.'
      return reply.code(401).send({ message })
    }
  })

  app.post('/auth/register', async (request, reply) => {
    const { username, email, password } = request.body as {
      username?: string
      email?: string
      password?: string
    }

    if (!username || !email || !password) {
      return reply.code(400).send({ message: 'Username, email, and password are required.' })
    }

    try {
      const result = await deps.authService.register({ username, email, password })
      const user = {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        passwordHash: result.user.passwordHash,
        avatarUrl: result.user.avatarUrl,
        createdAt: result.user.createdAt,
        role: result.user.role,
        permissions: result.permissions,
      }

      addUserToStore(deps.store, user)
      deps.hub.broadcast({ users: [user], sync: deps.store.state.sync })

      const { accessToken, refreshToken, expiresIn } = issueTokens(user, request)

      await deps.auditService.recordAction({
        userId: user.id,
        role: user.role ?? 'user',
        action: 'auth/register',
        details: `User ${user.username} registered`,
      })

      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        role: user.role,
        permissions: user.permissions,
        token: accessToken,
        refreshToken,
        expiresIn,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.'
      return reply.code(400).send({ message })
    }
  })

  app.post('/auth/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string }
    if (refreshToken) {
      deps.tokens.revokeRefreshToken(refreshToken)
    }
    return reply.send({ ok: true })
  })

  app.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string }
    if (!refreshToken) {
      return reply.code(400).send({ message: 'Refresh token is required.' })
    }

    const record = deps.tokens.rotateRefreshToken(refreshToken, REFRESH_TOKEN_TTL_MS)
    if (!record) {
      return reply.code(401).send({ message: 'Invalid refresh token.' })
    }

    const user = deps.store.state.users.find((u) => u.id === record.userId)
    if (!user) {
      return reply.code(401).send({ message: 'User not found.' })
    }

    const token = app.jwt.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions ?? [],
    })

    return reply.send({ token, refreshToken: record.token, expiresIn: JWT_EXPIRY })
  })

  app.get('/auth/me', async (request, reply) => {
    try {
      const payload = await requireAuth(request, reply)
      if (!payload) return
      const user = deps.store.state.users.find((u) => u.id === payload.sub)
      if (!user) {
        return reply.code(401).send({ message: 'User not found.' })
      }
      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        role: user.role,
        permissions: user.permissions,
      })
    } catch {
      return reply.code(401).send({ message: 'Invalid or expired token.' })
    }
  })

  app.post('/auth/forgot', async (request, reply) => {
    const { email } = request.body as { email?: string }
    if (!email) {
      return reply.code(400).send({ message: 'Email is required.' })
    }

    const user = await deps.authService.findByEmail(email)
    if (!user) {
      // Avoid leaking user existence
      return reply.send({ ok: true })
    }

    const token = deps.tokens.createOneTimeToken('reset', user.id, RESET_TOKEN_TTL_MS)
    console.log(`[Auth] Password reset token for ${user.email}: ${token.token}`)

    await deps.auditService.recordAction({
      userId: user.id,
      role: user.role ?? 'user',
      action: 'auth/forgot',
      details: `Password reset requested for ${user.email}`,
    })

    return reply.send({ ok: true })
  })

  app.post('/auth/reset', async (request, reply) => {
    const { token, password } = request.body as { token?: string; password?: string }
    if (!token || !password) {
      return reply.code(400).send({ message: 'Token and password are required.' })
    }

    const record = deps.tokens.consumeOneTimeToken('reset', token)
    if (!record) {
      return reply.code(400).send({ message: 'Invalid or expired token.' })
    }

    const user = await deps.authService.updatePassword({ userId: record.userId, password })
    deps.tokens.revokeUserTokens(user.id)

    await deps.auditService.recordAction({
      userId: user.id,
      role: user.role ?? 'user',
      action: 'auth/reset',
      details: `Password reset completed for ${user.email}`,
    })

    return reply.send({ ok: true })
  })

  app.post('/auth/magic/request', async (request, reply) => {
    const { email } = request.body as { email?: string }
    if (!email) {
      return reply.code(400).send({ message: 'Email is required.' })
    }

    const user = await deps.authService.findByEmail(email)
    if (!user) {
      return reply.send({ ok: true })
    }

    const token = deps.tokens.createOneTimeToken('magic', user.id, MAGIC_TOKEN_TTL_MS)
    console.log(`[Auth] Magic login token for ${user.email}: ${token.token}`)

    await deps.auditService.recordAction({
      userId: user.id,
      role: user.role ?? 'user',
      action: 'auth/magic',
      details: `Magic link requested for ${user.email}`,
    })

    return reply.send({ ok: true })
  })

  app.post('/auth/magic/verify', async (request, reply) => {
    const { token } = request.body as { token?: string }
    if (!token) {
      return reply.code(400).send({ message: 'Token is required.' })
    }

    const record = deps.tokens.consumeOneTimeToken('magic', token)
    if (!record) {
      return reply.code(400).send({ message: 'Invalid or expired token.' })
    }

    const user = deps.store.state.users.find((u) => u.id === record.userId)
    if (!user) {
      return reply.code(401).send({ message: 'User not found.' })
    }

    const { accessToken, refreshToken, expiresIn } = issueTokens(user, request)

    await deps.auditService.recordAction({
      userId: user.id,
      role: user.role ?? 'user',
      action: 'auth/magic',
      details: `Magic login completed for ${user.email}`,
    })

    return reply.send({
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      role: user.role,
      permissions: user.permissions,
      token: accessToken,
      refreshToken,
      expiresIn,
    })
  })

  app.get('/auth/github', async (_request, reply) => {
    if (!GITHUB_CLIENT_ID) {
      return reply.code(500).send({ message: 'GitHub OAuth not configured.' })
    }
    const stateToken = deps.tokens.createOneTimeToken('oauth_state', 'system', 5 * 60 * 1000)
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_CALLBACK_URL,
      scope: 'read:user user:email',
      allow_signup: 'true',
      state: stateToken.token,
    })
    return reply.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
  })

  app.get('/auth/github/callback', async (request, reply) => {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      return reply.code(500).send({ message: 'GitHub OAuth not configured.' })
    }

    const { code, state } = request.query as { code?: string; state?: string }

    if (!state || !deps.tokens.consumeOneTimeToken('oauth_state', state)) {
      return reply.code(400).send({ message: 'Invalid or expired OAuth state.' })
    }
    if (!code) {
      return reply.code(400).send({ message: 'Missing OAuth code.' })
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_CALLBACK_URL,
      }),
    })

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string }
    if (!tokenPayload.access_token) {
      return reply.code(401).send({ message: 'GitHub OAuth failed.' })
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    })
    const userData = (await userResponse.json()) as { login?: string; id?: number; avatar_url?: string }

    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    })
    const emails = (await emailResponse.json()) as Array<{ email: string; primary?: boolean; verified?: boolean }>
    const primaryEmail = emails.find((row) => row.primary && row.verified)?.email ?? emails[0]?.email

    if (!primaryEmail || !userData.login) {
      return reply.code(400).send({ message: 'Unable to read GitHub user email.' })
    }

    let user = await deps.authService.findByEmail(primaryEmail)
    if (!user) {
      const username = userData.login
      const password = `oauth_${userData.id ?? Date.now()}`
      const result = await deps.authService.register({ username, email: primaryEmail, password })
      user = result.user
      addUserToStore(deps.store, user)
    } else {
      const storeUser = deps.store.state.users.find((u) => u.id === user!.id)
      user = storeUser ?? (await deps.authService.getWithPermissions(user))
      if (!storeUser) addUserToStore(deps.store, user)
    }

    const { accessToken, refreshToken, expiresIn } = issueTokens(user, request)

    await deps.auditService.recordAction({
      userId: user.id,
      role: user.role ?? 'user',
      action: 'auth/github',
      details: `GitHub OAuth login for ${user.email}`,
    })

    const redirectUrl = new URL('/auth/callback', APP_URL)
    redirectUrl.searchParams.set('token', accessToken)
    redirectUrl.searchParams.set('refreshToken', refreshToken)
    redirectUrl.searchParams.set('expiresIn', String(expiresIn))
    return reply.redirect(redirectUrl.toString())
  })
}
