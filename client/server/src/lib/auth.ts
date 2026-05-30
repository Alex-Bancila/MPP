import type { FastifyRequest, FastifyReply } from 'fastify'

export type AuthPayload = {
  sub: string
  username?: string
  role?: string
  permissions?: string[]
}

export const getAuthTokenFromRequest = (request: FastifyRequest): string | undefined => {
  const header = request.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length)
  }
  const cookie = (request.cookies as Record<string, string | undefined>)?.mc_access
  if (cookie) {
    return cookie
  }
  return undefined
}

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<AuthPayload | null> => {
  try {
    const token = getAuthTokenFromRequest(request)
    if (token && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${token}`
    }
    await request.jwtVerify()
    return request.user as AuthPayload
  } catch {
    reply.code(401).send({ message: 'Unauthorized' })
    return null
  }
}

export const requirePermission = async (
  request: FastifyRequest,
  reply: FastifyReply,
  permission: string,
): Promise<AuthPayload | null> => {
  const payload = await requireAuth(request, reply)
  if (!payload) return null
  const permissions = payload.permissions ?? []
  if (!permissions.includes(permission)) {
    reply.code(403).send({ message: 'Forbidden' })
    return null
  }
  return payload
}

export const requireAuthPayload = async (request: FastifyRequest): Promise<AuthPayload> => {
  const token = getAuthTokenFromRequest(request)
  if (token && !request.headers.authorization) {
    request.headers.authorization = `Bearer ${token}`
  }
  await request.jwtVerify()
  return request.user as AuthPayload
}

export const requirePermissionGraphQL = async (request: FastifyRequest, permission: string): Promise<AuthPayload> => {
  const payload = await requireAuthPayload(request)
  const permissions = payload.permissions ?? []
  if (!permissions.includes(permission)) {
    throw new Error('Forbidden')
  }
  return payload
}
