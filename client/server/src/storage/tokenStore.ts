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

export interface TwoFactorChallengeRecord {
  challengeId: string
  userId: string
  code: string
  createdAt: string
  expiresAt: string
  attempts: number
}

const MAX_TWO_FACTOR_ATTEMPTS = 5

export interface TokenStore {
  createRefreshToken: (input: CreateRefreshTokenInput) => RefreshTokenRecord
  getRefreshToken: (token: string) => RefreshTokenRecord | null
  rotateRefreshToken: (token: string, ttlMs: number) => RefreshTokenRecord | null
  revokeRefreshToken: (token: string) => boolean
  revokeUserTokens: (userId: string) => number
  listUserSessions: (userId: string) => RefreshTokenRecord[]
  createOneTimeToken: (type: OneTimeTokenType, userId: string, ttlMs: number) => OneTimeTokenRecord
  consumeOneTimeToken: (type: OneTimeTokenType, token: string) => OneTimeTokenRecord | null
  createTwoFactorChallenge: (userId: string, ttlMs: number) => { challengeId: string; code: string }
  verifyTwoFactorChallenge: (challengeId: string, code: string) => string | null
  cleanupExpired: () => void
}

const nowIso = () => new Date().toISOString()

const isExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt).getTime() <= Date.now()
}

const createToken = (bytes = 32): string => {
  return randomBytes(bytes).toString('hex')
}

const createNumericCode = (): string => {
  // 6-digit human-friendly pass key, zero-padded.
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}

export const createTokenStore = (): TokenStore => {
  const refreshTokens = new Map<string, RefreshTokenRecord>()
  const oneTimeTokens = new Map<string, OneTimeTokenRecord>()
  const twoFactorChallenges = new Map<string, TwoFactorChallengeRecord>()

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
    for (const [id, record] of twoFactorChallenges) {
      if (isExpired(record.expiresAt)) {
        twoFactorChallenges.delete(id)
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
    createTwoFactorChallenge: (userId, ttlMs) => {
      cleanupExpired()
      const challengeId = randomUUID()
      const code = createNumericCode()
      const createdAt = nowIso()
      const expiresAt = new Date(Date.now() + ttlMs).toISOString()
      twoFactorChallenges.set(challengeId, {
        challengeId,
        userId,
        code,
        createdAt,
        expiresAt,
        attempts: 0,
      })
      return { challengeId, code }
    },
    verifyTwoFactorChallenge: (challengeId, code) => {
      cleanupExpired()
      const record = twoFactorChallenges.get(challengeId)
      if (!record || isExpired(record.expiresAt)) {
        twoFactorChallenges.delete(challengeId)
        return null
      }
      if (record.attempts >= MAX_TWO_FACTOR_ATTEMPTS) {
        twoFactorChallenges.delete(challengeId)
        return null
      }
      if (record.code !== code.trim()) {
        record.attempts += 1
        return null
      }
      twoFactorChallenges.delete(challengeId)
      return record.userId
    },
    cleanupExpired,
  }
}
