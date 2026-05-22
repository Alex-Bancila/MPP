import type { FastifyInstance } from 'fastify'

import type { AuthService } from '../services/authService'
import type { MemoryStore } from '../storage/memoryStore'
import type { ServerHub } from '../transport/serverHub'
import { addUserToStore } from '../db/storeUpdates'
import { JWT_EXPIRY } from '../app'

export interface RegisterAuthRoutesDeps {
  authService: AuthService
  hub: ServerHub
  store: MemoryStore
}

export const registerAuthRoutes = (app: FastifyInstance, deps: RegisterAuthRoutesDeps): void => {
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

      const token = app.jwt.sign({
        sub: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      })

      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        role: user.role,
        permissions: user.permissions,
        token,
        expiresIn: JWT_EXPIRY,
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

      const token = app.jwt.sign({
        sub: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      })

      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        role: user.role,
        permissions: user.permissions,
        token,
        expiresIn: JWT_EXPIRY,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.'
      return reply.code(400).send({ message })
    }
  })

  app.post('/auth/logout', async (_request, reply) => {
    return reply.send({ ok: true })
  })

  app.get('/auth/me', async (request, reply) => {
    try {
      await request.jwtVerify()
      const payload = request.user as { sub: string; role: string; permissions: string[] }
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
}