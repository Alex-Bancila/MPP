import type { AppState, Conversation, Listing, Message, Review, User, UserRoleName } from '../shared'

export interface UpdatePayload {
  listings?: Listing[]
  reviews?: Review[]
  removedListingIds?: string[]
  removedReviewIds?: string[]
  users?: User[]
  conversations?: Conversation[]
  messages?: Message[]
  actionLogs?: Array<{
    id: string
    userId: string
    username: string
    role: UserRoleName
    action: string
    details: string
    createdAt: string
  }>
  suspiciousUsers?: Array<{
    id: string
    userId: string
    username: string
    role: UserRoleName
    reason: string
    score: number
    createdAt: string
    updatedAt: string
    resolvedAt: string | null
  }>
  sync?: AppState['sync']
}

export interface ServerHub {
  listeners: Set<(payload: UpdatePayload) => void>
  broadcast: (payload: UpdatePayload) => void
  addListener: (listener: (payload: UpdatePayload) => void) => () => void
}

export const createServerHub = (): ServerHub => {
  const listeners = new Set<(payload: UpdatePayload) => void>()

  return {
    listeners,
    broadcast: (payload) => {
      // Deliver to all listeners, but isolate failures so one bad listener
      // doesn't prevent others from receiving updates.
      listeners.forEach((listener) => {
        try {
          listener(payload)
        } catch (err) {
          // If a listener throws, remove it to avoid repeated errors.
          listeners.delete(listener)
        }
      })
    },
    addListener: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
