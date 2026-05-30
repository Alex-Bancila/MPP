import { initialAppState, type AppState, type ActionLog, type SuspiciousUser, type AdminAccessRequest } from '../shared'

export interface MemoryStore {
  state: AppState
  logs: ActionLog[]
  suspiciousUsers: SuspiciousUser[]
  adminRequests: AdminAccessRequest[]
  authLog: Array<{ email: string; at: string }>
}

export const createMemoryStore = (): MemoryStore => {
  return {
    state: structuredClone(initialAppState),
    logs: [],
    suspiciousUsers: [],
    adminRequests: [],
    authLog: [],
  }
}
