import { buildApp } from '../app'
import { initialAppState } from '../shared'

export const createTestApp = async () => {
  const result = await buildApp()
  // Reset the in-memory store to initial seeded state for perfect test isolation
  result.store.state = structuredClone(initialAppState)
  result.store.logs = []
  result.store.suspiciousUsers = []
  result.store.adminRequests = []
  return result.app
}

export const parseJson = <T>(payload: string): T => {
  return JSON.parse(payload) as T
}
