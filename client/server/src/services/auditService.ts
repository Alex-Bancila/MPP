import type { UserRoleName, ActionLog, SuspiciousUser } from '../shared'
import { createId } from '../shared'
import type { MemoryStore } from '../storage/memoryStore'

export interface ActionLogRow extends ActionLog {}
export interface SuspiciousUserRow extends SuspiciousUser {}

export interface AuditDashboard {
  logs: ActionLogRow[]
  suspiciousUsers: SuspiciousUserRow[]
}

export interface AuditService {
  recordAction: (input: {
    userId: string
    role: UserRoleName
    action: string
    details: string
  }) => Promise<ActionLogRow>
  recordSuspicion: (input: {
    userId: string
    role: UserRoleName
    reason: string
    score: number
  }) => Promise<SuspiciousUserRow>
  dashboard: (limit?: number) => Promise<AuditDashboard>
  detectMaliciousBehavior: (input: {
    userId: string
    role: UserRoleName
    action: string
    recentActionCount: number
    timeWindowMs: number
  }) => Promise<SuspiciousUserRow | null>
}

const MALICIOUS_THRESHOLDS: Record<string, { maxActions: number; score: number; reason: string }> = {
  'listing/create': { maxActions: 10, score: 5, reason: 'Rapid listing creation — possible spam' },
  'listing/delete': { maxActions: 5, score: 3, reason: 'Rapid listing deletion — possible vandalism' },
  'review/create': { maxActions: 8, score: 4, reason: 'Rapid review creation — possible review bombing' },
  'review/delete': { maxActions: 5, score: 3, reason: 'Rapid review deletion — possible cover-up' },
  'favourite/toggle': { maxActions: 20, score: 2, reason: 'Excessive favourite toggling — possible bot behaviour' },
  'chat/send': { maxActions: 15, score: 3, reason: 'Message spam detected' },
  'auth/login': { maxActions: 5, score: 2, reason: 'Multiple rapid login attempts' },
}

export const createAuditService = (store: MemoryStore): AuditService => {
  return {
    recordAction: async (input) => {
      const user = store.state.users.find((u) => u.id === input.userId)
      const username = user ? user.username : 'Unknown'

      const row: ActionLogRow = {
        id: createId('log'),
        userId: input.userId,
        username,
        role: input.role,
        action: input.action,
        details: input.details,
        createdAt: new Date().toISOString(),
      }

      store.logs.push(row)
      return row
    },
    recordSuspicion: async (input) => {
      const now = new Date().toISOString()
      const user = store.state.users.find((u) => u.id === input.userId)
      const username = user ? user.username : 'Unknown'

      const existingIndex = store.suspiciousUsers.findIndex((s) => s.userId === input.userId)

      if (existingIndex !== -1) {
        const existing = store.suspiciousUsers[existingIndex]
        const updated: SuspiciousUserRow = {
          ...existing,
          reason: input.reason,
          score: existing.score + input.score,
          updatedAt: now,
        }
        store.suspiciousUsers[existingIndex] = updated
        return updated
      }

      const row: SuspiciousUserRow = {
        id: createId('sus'),
        userId: input.userId,
        username,
        role: input.role,
        reason: input.reason,
        score: input.score,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
      }

      store.suspiciousUsers.push(row)
      return row
    },
    dashboard: async (limit = 25) => {
      const logs = [...store.logs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)

      const suspiciousUsers = [...store.suspiciousUsers]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit)

      return {
        logs,
        suspiciousUsers,
      }
    },
    detectMaliciousBehavior: async (input) => {
      const threshold = MALICIOUS_THRESHOLDS[input.action]
      if (!threshold) {
        return null
      }

      if (input.recentActionCount <= threshold.maxActions) {
        return null
      }

      const now = new Date().toISOString()
      const user = store.state.users.find((u) => u.id === input.userId)
      const username = user ? user.username : 'Unknown'

      const existingIndex = store.suspiciousUsers.findIndex((s) => s.userId === input.userId)

      if (existingIndex !== -1) {
        const existing = store.suspiciousUsers[existingIndex]
        const updated: SuspiciousUserRow = {
          ...existing,
          reason: threshold.reason,
          score: existing.score + threshold.score,
          updatedAt: now,
        }
        store.suspiciousUsers[existingIndex] = updated
        return updated
      }

      const row: SuspiciousUserRow = {
        id: createId('sus'),
        userId: input.userId,
        username,
        role: input.role,
        reason: threshold.reason,
        score: threshold.score,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
      }

      store.suspiciousUsers.push(row)
      return row
    },
  }
}
