import type { UserRoleName } from '../shared'
import type { MemoryStore } from '../storage/memoryStore'

export interface RolePermissionRow {
  id: string
  name: string
  description: string | null
}

export interface RoleRow {
  id: string
  name: UserRoleName
  description: string | null
  permissions: RolePermissionRow[]
}

export interface RolesService {
  getRole: (roleName: UserRoleName) => Promise<RoleRow | undefined>
  listRoles: () => Promise<RoleRow[]>
}

const USER_PERMISSIONS: RolePermissionRow[] = [
  { id: 'perm_l_create', name: 'listing:create', description: 'Create listings' },
  { id: 'perm_l_update', name: 'listing:update', description: 'Update listings' },
  { id: 'perm_l_delete', name: 'listing:delete', description: 'Delete listings' },
  { id: 'perm_r_create', name: 'review:create', description: 'Create reviews' },
  { id: 'perm_r_update', name: 'review:update', description: 'Update reviews' },
  { id: 'perm_r_delete', name: 'review:delete', description: 'Delete reviews' },
  { id: 'perm_f_toggle', name: 'favourite:toggle', description: 'Toggle favourites' },
  { id: 'perm_c_send', name: 'chat:send', description: 'Send chat messages' },
]

const ADMIN_PERMISSIONS: RolePermissionRow[] = [
  ...USER_PERMISSIONS,
  { id: 'perm_a_read', name: 'admin:read', description: 'Access admin panel' },
  { id: 'perm_au_read', name: 'audit:read', description: 'Access audit logs' },
]

const ROLES: RoleRow[] = [
  {
    id: 'role_admin',
    name: 'admin',
    description: 'Administrator role with full access',
    permissions: ADMIN_PERMISSIONS,
  },
  {
    id: 'role_user',
    name: 'user',
    description: 'Standard user role',
    permissions: USER_PERMISSIONS,
  },
]

export const createRolesService = (_store: MemoryStore): RolesService => {
  return {
    getRole: async (roleName) => {
      return ROLES.find((r) => r.name === roleName)
    },
    listRoles: async () => {
      return ROLES
    },
  }
}
