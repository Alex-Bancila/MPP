import { randomBytes, randomUUID } from 'node:crypto'

export interface RefreshTokenRecord {
  token: string
  sessionId: string
  userId: string
  createdAt: string
  expiresAt: string
  lastUsedAt: string
  userAgent?: string
  ip?: string
}

export type OneTimeTokenType = 'reset' | 'magic' | 'oauth_state'

export interface OneTimeTokenRecord {
  token: string
  userId: string
  type: OneTimeTokenType
  createdAt: string
  expiresAt: string
}

export interface CreateRefreshTokenInput {
  userId: string
  ttlMs: number
  userAgent?: string
  ip?: string
}

export interface TokenStore {
  createRefreshToken: (input: CreateRefreshTokenInput) => RefreshTokenRecord
  getRefreshToken: (token: string) => RefreshTokenRecord | null
  rotateRefreshToken: (token: string, ttlMs: number) => RefreshTokenRecord | null
  revokeRefreshToken: (token: string) => boolean
  revokeUserTokens: (userId: string) => number
  listUserSessions: (userId: string) => RefreshTokenRecord[]
  createOneTimeToken: (type: OneTimeTokenType, userId: string, ttlMs: number) => OneTimeTokenRecord
  consumeOneTimeToken: (type: OneTimeTokenType, token: string) => OneTimeTokenRecord | null
  cleanupExpired: () => void
}

const nowIso = () => new Date().toISOString()

const isExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt).getTime() <= Date.now()
}

const createToken = (bytes = 32): string => {
  return randomBytes(bytes).toString('hex')
}

export const createTokenStore = (): TokenStore => {
  const refreshTokens = new Map<string, RefreshTokenRecord>()
  const oneTimeTokens = new Map<string, OneTimeTokenRecord>()

  const cleanupExpired = () => {
    for (const [token, record] of refreshTokens) {
      if (isExpired(record.expiresAt)) {
        refreshTokens.delete(token)
      }
    }
    for (const [token, record] of oneTimeTokens) {
      if (isExpired(record.expiresAt)) {
        oneTimeTokens.delete(token)
      }
    }
  }

  return {
    createRefreshToken: (input) => {
      cleanupExpired()
      const token = createToken(48)
      const sessionId = randomUUID()
      const createdAt = nowIso()
      const expiresAt = new Date(Date.now() + input.ttlMs).toISOString()
      const record: RefreshTokenRecord = {
        token,
        sessionId,
        userId: input.userId,
        createdAt,
        expiresAt,
        lastUsedAt: createdAt,
        userAgent: input.userAgent,
        ip: input.ip,
      }
      refreshTokens.set(token, record)
      return record
    },
    getRefreshToken: (token) => {
      cleanupExpired()
      const record = refreshTokens.get(token)
      if (!record) return null
      if (isExpired(record.expiresAt)) {
        refreshTokens.delete(token)
        return null
      }
      return record
    },
    rotateRefreshToken: (token, ttlMs) => {
      cleanupExpired()
      const existing = refreshTokens.get(token)
      if (!existing || isExpired(existing.expiresAt)) {
        refreshTokens.delete(token)
        return null
      }
      refreshTokens.delete(token)
      const nextToken = createToken(48)
      const now = nowIso()
      const next: RefreshTokenRecord = {
        ...existing,
        token: nextToken,
        lastUsedAt: now,
        expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      }
      refreshTokens.set(nextToken, next)
      return next
    },
    revokeRefreshToken: (token) => {
      return refreshTokens.delete(token)
    },
    revokeUserTokens: (userId) => {
      let removed = 0
      for (const [token, record] of refreshTokens) {
        if (record.userId === userId) {
          refreshTokens.delete(token)
          removed += 1
        }
      }
      return removed
    },
    listUserSessions: (userId) => {
      cleanupExpired()
      return [...refreshTokens.values()].filter((record) => record.userId === userId)
    },
    createOneTimeToken: (type, userId, ttlMs) => {
      cleanupExpired()
      const token = createToken(24)
      const createdAt = nowIso()
      const expiresAt = new Date(Date.now() + ttlMs).toISOString()
      const record: OneTimeTokenRecord = {
        token,
        userId,
        type,
        createdAt,
        expiresAt,
      }
      oneTimeTokens.set(token, record)
      return record
    },
    consumeOneTimeToken: (type, token) => {
      cleanupExpired()
      const record = oneTimeTokens.get(token)
      if (!record || record.type !== type) {
        return null
      }
      if (isExpired(record.expiresAt)) {
        oneTimeTokens.delete(token)
        return null
      }
      oneTimeTokens.delete(token)
      return record
    },
    cleanupExpired,
  }
}
