import type { User } from '../shared'
import { createId, hashPassword, verifyPassword } from '../shared'
import type { MemoryStore } from '../storage/memoryStore'
import type { RolesService } from './rolesService'
import type { UsersService } from './usersService'
import { prisma } from '../db/prisma'

export interface LoginResult {
  user: User
  permissions: string[]
}

export interface AuthService {
  register: (input: { username: string; email: string; password: string }) => Promise<LoginResult>
  login: (input: { email: string; password: string }) => Promise<LoginResult>
  updatePassword: (input: { userId: string; password: string }) => Promise<User>
  findByEmail: (email: string) => Promise<User | null>
  getWithPermissions: (user: User) => Promise<User>
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

export const createAuthService = (
  store: MemoryStore,
  usersService: UsersService,
  rolesService: RolesService,
): AuthService => {
  return {
    register: async (input) => {
      const email = input.email.trim().toLowerCase()
      const username = input.username.trim()

      const existingEmail = await usersService.getByEmail(email)
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
      const roleRow = await rolesService.getRole(role)
      const permissions = roleRow?.permissions.map((row) => row.name) ??
        (isFirstUser ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS)

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

      const dbRole = await prisma.role.findFirst({ where: { name: role } })
      await prisma.user.create({
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          passwordHash: user.passwordHash,
          avatarUrl: user.avatarUrl,
          createdAt: new Date(user.createdAt),
          roleId: dbRole?.id ?? (role === 'admin' ? 'role_admin' : 'role_user'),
        },
      })

      store.state.users.push(user)

      return { user, permissions }
    },
    login: async (input) => {
      const email = input.email.trim().toLowerCase()
      const user = await usersService.getByEmail(email)
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        store.authLog.push({ email, at: new Date().toISOString() })
        throw new Error('Invalid email or password.')
      }

      const roleRow = user.role ? await rolesService.getRole(user.role) : null
      const permissions = user.permissions
        ?? roleRow?.permissions.map((row) => row.name)
        ?? DEFAULT_USER_PERMISSIONS

      return { user: { ...user, permissions }, permissions }
    },
    updatePassword: async (input) => {
      const userIndex = store.state.users.findIndex((u) => u.id === input.userId)
      if (userIndex === -1) {
        throw new Error('User not found.')
      }
      const newHash = hashPassword(input.password)
      await prisma.user.update({ where: { id: input.userId }, data: { passwordHash: newHash } })
      const updated: User = { ...store.state.users[userIndex], passwordHash: newHash }
      store.state.users[userIndex] = updated
      return updated
    },
    findByEmail: async (email) => {
      const normalized = email.trim().toLowerCase()
      const user = await usersService.getByEmail(normalized)
      return user ?? null
    },
    getWithPermissions: async (user) => {
      const roleRow = user.role ? await rolesService.getRole(user.role) : null
      const permissions = user.permissions
        ?? roleRow?.permissions.map((row) => row.name)
        ?? DEFAULT_USER_PERMISSIONS
      return { ...user, permissions }
    },
  }
}
