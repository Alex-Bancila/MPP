import type { User } from '../shared'
import type { MemoryStore } from '../storage/memoryStore'
import { prisma } from '../db/prisma'

export interface UsersService {
  getById: (userId: string) => Promise<User | undefined>
  getByEmail: (email: string) => Promise<User | undefined>
  exists: (userId: string) => Promise<boolean>
  list: () => Promise<User[]>
  setBanned: (input: { userId: string; banned: boolean; reason?: string | null }) => Promise<User>
}

export const createUsersService = (store: MemoryStore): UsersService => {
  return {
    getById: async (userId) => {
      return store.state.users.find((u) => u.id === userId)
    },
    getByEmail: async (email) => {
      return store.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    },
    exists: async (userId) => {
      return store.state.users.some((u) => u.id === userId)
    },
    list: async () => {
      return [...store.state.users].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    },
    setBanned: async ({ userId, banned, reason }) => {
      const index = store.state.users.findIndex((u) => u.id === userId)
      if (index === -1) {
        throw new Error('User not found.')
      }
      const bannedAt = banned ? new Date() : null
      const bannedReason = banned ? reason ?? 'suspicious activity' : null

      await prisma.user.update({
        where: { id: userId },
        data: { banned, bannedReason, bannedAt },
      })

      const updated: User = {
        ...store.state.users[index],
        banned,
        bannedReason,
        bannedAt: bannedAt ? bannedAt.toISOString() : null,
      }
      store.state.users[index] = updated
      return updated
    },
  }
}
