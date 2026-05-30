import { initialAppState, type AppState, type ActionLog, type SuspiciousUser } from '../shared'

export interface MemoryStore {
  state: AppState
  logs: ActionLog[]
  suspiciousUsers: SuspiciousUser[]
  authLog: Array<{ email: string; at: string }>
}

export const createMemoryStore = (): MemoryStore => {
  return {
    state: structuredClone(initialAppState),
    logs: [],
    suspiciousUsers: [],
    authLog: [],
  }
}
