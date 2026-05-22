import type { User } from '../shared'
import { createId, hashPassword, verifyPassword } from '../shared'
import type { MemoryStore } from '../storage/memoryStore'

export interface LoginResult {
  user: User
  permissions: string[]
}

export interface AuthService {
  register: (input: { username: string; email: string; password: string }) => Promise<LoginResult>
  login: (input: { email: string; password: string }) => Promise<LoginResult>
}

const DEFAULT_USER_PERMISSIONS = [
  'listing:create',
  'listing:update',
  'listing:delete',
  'review:create',
  'review:update',
  'review:delete',
  'favourite:toggle',
  'chat:send',
]

const DEFAULT_ADMIN_PERMISSIONS = [
  ...DEFAULT_USER_PERMISSIONS,
  'admin:read',
  'audit:read',
]

export const createAuthService = (store: MemoryStore): AuthService => {
  return {
    register: async (input) => {
      const email = input.email.trim().toLowerCase()
      const username = input.username.trim()

      const existingEmail = store.state.users.find((u) => u.email.toLowerCase() === email)
      if (existingEmail) {
        throw new Error('An account with this email already exists.')
      }

      const existingUsername = store.state.users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      )
      if (existingUsername) {
        throw new Error('This username is already taken.')
      }

      const isFirstUser = store.state.users.length === 0
      const role = isFirstUser ? 'admin' : 'user'
      const permissions = isFirstUser ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS

      const user: User = {
        id: createId('user'),
        username,
        email,
        passwordHash: hashPassword(input.password),
        avatarUrl: `https://i.pravatar.cc/96?u=${email}`,
        createdAt: new Date().toISOString(),
        role,
        permissions,
      }

      store.state.users.push(user)

      return {
        user,
        permissions,
      }
    },
    login: async (input) => {
      const email = input.email.trim().toLowerCase()
      const user = store.state.users.find((u) => u.email.toLowerCase() === email)
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new Error('Invalid email or password.')
      }

      return {
        user,
        permissions: user.permissions ?? DEFAULT_USER_PERMISSIONS,
      }
    },
  }
}
