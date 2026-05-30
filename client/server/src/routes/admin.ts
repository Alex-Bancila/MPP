import type { FastifyInstance } from 'fastify'

import type { AuthService } from '../services/authService'
import type { UsersService } from '../services/usersService'
import type { AuditService } from '../services/auditService'
import type { MemoryStore } from '../storage/memoryStore'
import type { ServerHub } from '../transport/serverHub'
import type { TokenStore } from '../storage/tokenStore'
import type { Mailer } from '../lib/mailer'
import { prisma } from '../db/prisma'
import { requirePermission } from '../lib/auth'

export interface RegisterAdminRoutesDeps {
  authService: AuthService
  usersService: UsersService
  auditService: AuditService
  hub: ServerHub
  store: MemoryStore
  tokens: TokenStore
  mailer: Mailer
}

export const registerAdminRoutes = (app: FastifyInstance, deps: RegisterAdminRoutesDeps): void => {
  // List admin access requests (most recent first).
  app.get('/admin/requests', async (request, reply) => {
    const payload = await requirePermission(request, reply, 'admin:read')
    if (!payload) return
    return reply.send({ requests: deps.store.adminRequests })
  })

  app.post('/admin/requests/:id/approve', async (request, reply) => {
    const payload = await requirePermission(request, reply, 'admin:read')
    if (!payload) return

    const { id } = request.params as { id: string }
    const index = deps.store.adminRequests.findIndex((r) => r.id === id)
    if (index === -1) {
      return reply.code(404).send({ message: 'Request not found.' })
    }

    const adminRequest = deps.store.adminRequests[index]
    if (adminRequest.status !== 'pending') {
      return reply.code(409).send({ message: 'This request has already been resolved.' })
    }

    const promoted = await deps.authService.promoteToAdmin(adminRequest.userId)

    const resolvedAt = new Date()
    await prisma.adminAccessRequest.update({
      where: { id },
      data: { status: 'approved', resolvedAt, resolvedById: payload.sub },
    })

    deps.store.adminRequests[index] = {
      ...adminRequest,
      status: 'approved',
      resolvedAt: resolvedAt.toISOString(),
      resolvedById: payload.sub,
    }

    await deps.mailer.sendEmail({
      to: adminRequest.email,
      subject: 'Your admin access request was approved',
      body: `Hi ${adminRequest.username}, an administrator approved your request. You now have admin access — sign in again to use it.`,
    })

    await deps.auditService.recordAction({
      userId: payload.sub,
      role: 'admin',
      action: 'admin/approve',
      details: `Approved admin access for ${adminRequest.username}`,
    })

    deps.hub.broadcast({ users: [promoted], sync: deps.store.state.sync })

    return reply.send({ request: deps.store.adminRequests[index] })
  })

  app.post('/admin/requests/:id/reject', async (request, reply) => {
    const payload = await requirePermission(request, reply, 'admin:read')
    if (!payload) return

    const { id } = request.params as { id: string }
    const index = deps.store.adminRequests.findIndex((r) => r.id === id)
    if (index === -1) {
      return reply.code(404).send({ message: 'Request not found.' })
    }

    const adminRequest = deps.store.adminRequests[index]
    if (adminRequest.status !== 'pending') {
      return reply.code(409).send({ message: 'This request has already been resolved.' })
    }

    const resolvedAt = new Date()
    await prisma.adminAccessRequest.update({
      where: { id },
      data: { status: 'rejected', resolvedAt, resolvedById: payload.sub },
    })

    deps.store.adminRequests[index] = {
      ...adminRequest,
      status: 'rejected',
      resolvedAt: resolvedAt.toISOString(),
      resolvedById: payload.sub,
    }

    await deps.mailer.sendEmail({
      to: adminRequest.email,
      subject: 'Your admin access request was declined',
      body: `Hi ${adminRequest.username}, an administrator declined your admin access request.`,
    })

    await deps.auditService.recordAction({
      userId: payload.sub,
      role: 'admin',
      action: 'admin/reject',
      details: `Rejected admin access for ${adminRequest.username}`,
    })

    return reply.send({ request: deps.store.adminRequests[index] })
  })

  app.post('/admin/users/ban', async (request, reply) => {
    const payload = await requirePermission(request, reply, 'user:ban')
    if (!payload) return

    const { email, reason } = request.body as { email?: string; reason?: string }
    if (!email) {
      return reply.code(400).send({ message: 'Email is required.' })
    }

    const target = await deps.usersService.getByEmail(email.trim().toLowerCase())
    if (!target) {
      return reply.code(404).send({ message: 'No user found with that email.' })
    }
    if (target.id === payload.sub) {
      return reply.code(400).send({ message: 'You cannot ban yourself.' })
    }

    const banned = await deps.usersService.setBanned({
      userId: target.id,
      banned: true,
      reason: reason?.trim() || 'suspicious activity',
    })

    // Kill any active sessions so the ban takes effect immediately.
    deps.tokens.revokeUserTokens(target.id)

    await deps.auditService.recordAction({
      userId: payload.sub,
      role: 'admin',
      action: 'admin/ban',
      details: `Banned ${banned.username} (${banned.email}) — ${banned.bannedReason}`,
    })

    deps.hub.broadcast({ users: [banned], sync: deps.store.state.sync })

    return reply.send({
      id: banned.id,
      email: banned.email,
      username: banned.username,
      banned: banned.banned,
      bannedReason: banned.bannedReason,
      bannedAt: banned.bannedAt,
    })
  })

  app.post('/admin/users/unban', async (request, reply) => {
    const payload = await requirePermission(request, reply, 'user:ban')
    if (!payload) return

    const { email } = request.body as { email?: string }
    if (!email) {
      return reply.code(400).send({ message: 'Email is required.' })
    }

    const target = await deps.usersService.getByEmail(email.trim().toLowerCase())
    if (!target) {
      return reply.code(404).send({ message: 'No user found with that email.' })
    }

    const unbanned = await deps.usersService.setBanned({ userId: target.id, banned: false })

    await deps.auditService.recordAction({
      userId: payload.sub,
      role: 'admin',
      action: 'admin/unban',
      details: `Unbanned ${unbanned.username} (${unbanned.email})`,
    })

    deps.hub.broadcast({ users: [unbanned], sync: deps.store.state.sync })

    return reply.send({
      id: unbanned.id,
      email: unbanned.email,
      username: unbanned.username,
      banned: unbanned.banned,
      bannedReason: unbanned.bannedReason,
      bannedAt: unbanned.bannedAt,
    })
  })
}
