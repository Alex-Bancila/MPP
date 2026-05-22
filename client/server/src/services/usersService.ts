import type { User } from '../shared'
import type { MemoryStore } from '../storage/memoryStore'

export interface UsersService {
  getById: (userId: string) => Promise<User | undefined>
  getByEmail: (email: string) => Promise<User | undefined>
  exists: (userId: string) => Promise<boolean>
  list: () => Promise<User[]>
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
  }
}
