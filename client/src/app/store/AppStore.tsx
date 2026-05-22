import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'

import { AppStoreContext, type AppStoreContextValue } from '@/app/store/context'
import type { AppAction } from '@/app/store/actions'
import { appReducer } from '@/app/store/reducers'
import { initialAppState } from '@/shared/data/seed'
import type {
  AppState,
  Conversation,
  Favourite,
  Listing,
  Message,
  Review,
  SyncState,
  User,
} from '@/shared/types/domain'
import {
  getServerReachable,
  getSyncSnapshot,
  getWebSocketUrl,
  replayQueuedMutation,
  type QueuedMutation,
  type SyncSnapshot,
} from '@/features/sync/serverClient'
import { waitForServerHealth } from '@/features/sync/serverHealth'
import { replayQueueWithRetention } from '@/app/store/syncQueue'

interface AppStoreProviderProps {
  children: ReactNode
}

const CURRENT_USER_STORAGE_KEY = 'music-core.currentUserId'

const readStoredCurrentUserId = (): string | null => {
  try {
    return window.localStorage.getItem(CURRENT_USER_STORAGE_KEY)
  } catch {
    return null
  }
}

const writeStoredCurrentUserId = (userId: string | null): void => {
  try {
    if (userId) {
      window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, userId)
      return
    }

    window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
  } catch {
    return
  }
}

interface ServerUpdatePayload {
  type?: 'sync/state' | 'sync/connected'
  users?: User[]
  listings?: Listing[]
  reviews?: Review[]
  favourites?: Favourite[]
  conversations?: Conversation[]
  messages?: Message[]
  removedListingIds?: string[]
  removedReviewIds?: string[]
  sync?: SyncState
}

const sortNewestListings = (listings: Listing[]): Listing[] => {
  return [...listings].sort((first, second) => {
    return new Date(second.datePosted).getTime() - new Date(first.datePosted).getTime()
  })
}

const sortNewestReviews = (reviews: Review[]): Review[] => {
  return [...reviews].sort((first, second) => {
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  })
}

const mergeListings = (current: Listing[], incoming: Listing[]): Listing[] => {
  const map = new Map<string, Listing>()

  current.forEach((listing) => {
    map.set(listing.id, listing)
  })

  incoming.forEach((listing) => {
    map.set(listing.id, listing)
  })

  return sortNewestListings([...map.values()])
}

const mergeReviews = (current: Review[], incoming: Review[]): Review[] => {
  const map = new Map<string, Review>()

  current.forEach((review) => {
    map.set(review.id, review)
  })

  incoming.forEach((review) => {
    map.set(review.id, review)
  })

  return sortNewestReviews([...map.values()])
}

const mergeUsers = (current: User[], incoming: User[]): User[] => {
  const map = new Map<string, User>()

  current.forEach((user) => {
    map.set(user.id, user)
  })

  incoming.forEach((user) => {
    map.set(user.id, user)
  })

  return [...map.values()].sort((first, second) => {
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  })
}

const mergeConversations = (current: Conversation[], incoming: Conversation[]): Conversation[] => {
  const map = new Map<string, Conversation>()

  current.forEach((conversation) => {
    map.set(conversation.id, conversation)
  })

  incoming.forEach((conversation) => {
    map.set(conversation.id, conversation)
  })

  return [...map.values()].sort((first, second) => {
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  })
}

const mergeMessages = (current: Message[], incoming: Message[]): Message[] => {
  const map = new Map<string, Message>()

  current.forEach((message) => {
    map.set(message.id, message)
  })

  incoming.forEach((message) => {
    map.set(message.id, message)
  })

  return [...map.values()].sort((first, second) => {
    return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
  })
}

const mutationActionTypes = new Set<AppAction['type']>([
  'listing/create',
  'listing/update',
  'listing/delete',
  'favourite/toggle',
  'review/create',
  'review/update',
  'review/delete',
  'message/send',
])

const isMutationAction = (action: AppAction): boolean => {
  return mutationActionTypes.has(action.type)
}

const applyQueuedMutations = (baseState: AppState, queue: QueuedMutation[]): AppState => {
  return queue.reduce((state, mutation) => {
    switch (mutation.kind) {
      case 'listing/create':
        return appReducer(state, { type: 'listing/create', payload: mutation.payload })
      case 'listing/update':
        return appReducer(state, { type: 'listing/update', payload: mutation.payload })
      case 'listing/delete':
        return appReducer(state, { type: 'listing/delete', payload: mutation.payload })
      case 'favourite/add': {
        const exists = state.favourites.some((row) => {
          return row.userId === mutation.payload.userId && row.listingId === mutation.payload.listingId
        })
        if (exists) {
          return state
        }
        return appReducer(state, { type: 'favourite/toggle', payload: mutation.payload })
      }
      case 'favourite/remove': {
        const exists = state.favourites.some((row) => {
          return row.userId === mutation.payload.userId && row.listingId === mutation.payload.listingId
        })
        if (!exists) {
          return state
        }
        return appReducer(state, { type: 'favourite/toggle', payload: mutation.payload })
      }
      case 'review/create':
        return appReducer(state, { type: 'review/create', payload: mutation.payload })
      case 'review/update':
        return appReducer(state, { type: 'review/update', payload: mutation.payload })
      case 'review/delete':
        return appReducer(state, { type: 'review/delete', payload: mutation.payload })
      case 'message/send':
        return appReducer(state, { type: 'message/send', payload: mutation.payload })
    }
  }, baseState)
}

const applyServerSnapshot = (state: AppState, snapshot: SyncSnapshot): AppState => {
  const currentUserId =
    state.currentUserId && snapshot.users.some((user) => user.id === state.currentUserId)
      ? state.currentUserId
      : null

  return {
    ...state,
    listings: snapshot.listings,
    reviews: snapshot.reviews,
    favourites: snapshot.favourites,
    users: snapshot.users,
    conversations: snapshot.conversations,
    messages: snapshot.messages,
    currentUserId,
    sync: {
      ...state.sync,
      ...snapshot.sync,
    },
  }
}

const applyServerPatch = (state: AppState, payload: ServerUpdatePayload): AppState => {
  let nextState = state

  if (payload.removedListingIds?.length) {
    nextState = payload.removedListingIds.reduce((current, listingId) => {
      return appReducer(current, { type: 'listing/delete', payload: { listingId } })
    }, nextState)
  }

  if (payload.listings?.length) {
    nextState = {
      ...nextState,
      listings: mergeListings(nextState.listings, payload.listings),
    }
  }

  if (payload.removedReviewIds?.length) {
    nextState = {
      ...nextState,
      reviews: nextState.reviews.filter((review) => !payload.removedReviewIds?.includes(review.id)),
    }
  }

  if (payload.reviews?.length) {
    nextState = {
      ...nextState,
      reviews: mergeReviews(nextState.reviews, payload.reviews),
    }
  }

  if (payload.favourites) {
    nextState = {
      ...nextState,
      favourites: payload.favourites,
    }
  }

  if (payload.users) {
    nextState = {
      ...nextState,
      users: mergeUsers(nextState.users, payload.users),
    }
  }

  if (payload.conversations) {
    nextState = {
      ...nextState,
      conversations: mergeConversations(nextState.conversations, payload.conversations),
    }
  }

  if (payload.messages) {
    nextState = {
      ...nextState,
      messages: mergeMessages(nextState.messages, payload.messages),
    }
  }

  if (payload.sync) {
    nextState = {
      ...nextState,
      sync: {
        ...nextState.sync,
        ...payload.sync,
      },
    }
  }

  return nextState
}

const parseSocketPayload = async (raw: MessageEvent['data']): Promise<ServerUpdatePayload | null> => {
  if (!raw) {
    return null
  }

  let text = ''

  if (typeof raw === 'string') {
    text = raw
  } else if (raw instanceof Blob) {
    text = await raw.text()
  } else if (raw instanceof ArrayBuffer) {
    text = new TextDecoder().decode(raw)
  } else if (ArrayBuffer.isView(raw)) {
    text = new TextDecoder().decode(raw.buffer)
  }

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as ServerUpdatePayload
  } catch {
    return null
  }
}

const toQueuedMutation = (state: AppState, action: AppAction): QueuedMutation | null => {
  switch (action.type) {
    case 'listing/create':
      return { kind: 'listing/create', payload: action.payload }
    case 'listing/update':
      return { kind: 'listing/update', payload: action.payload }
    case 'listing/delete':
      return { kind: 'listing/delete', payload: action.payload }
    case 'favourite/toggle': {
      const existing = state.favourites.some((row) => {
        return row.userId === action.payload.userId && row.listingId === action.payload.listingId
      })

      return existing
        ? { kind: 'favourite/remove', payload: action.payload }
        : { kind: 'favourite/add', payload: action.payload }
    }
    case 'review/create':
      return { kind: 'review/create', payload: action.payload }
    case 'review/update':
      return { kind: 'review/update', payload: action.payload }
    case 'review/delete':
      return { kind: 'review/delete', payload: action.payload }
    case 'message/send':
      return { kind: 'message/send', payload: action.payload }
    default:
      return null
  }
}

export const AppStoreProvider = ({ children }: AppStoreProviderProps) => {
  const [state, reducerDispatch] = useReducer(appReducer, initialAppState, (initialState) => ({
    ...initialState,
    currentUserId: readStoredCurrentUserId(),
  }))
  const stateRef = useRef(state)
    const queueRef = useRef<QueuedMutation[]>([])
  const [isOnline, setIsOnline] = useReducer((_state: boolean, next: boolean) => next, window.navigator.onLine)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const connectSocketRef = useRef<() => void>(() => {})
  const replayInFlightRef = useRef(false)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    writeStoredCurrentUserId(state.currentUserId)
  }, [state.currentUserId])

  const syncFromServer = useCallback(async () => {
    try {
      const reachable = await getServerReachable()
      if (!reachable) {
        reducerDispatch({
          type: 'sync/set',
          payload: { mode: 'offline', serverReachable: false },
        })
        setIsOnline(false)
        return false
      }

      const snapshot = await getSyncSnapshot()
      const baseState = applyServerSnapshot(stateRef.current, snapshot)
      const queuedCount = queueRef.current.length
      const nextSync: SyncState = {
        ...baseState.sync,
        ...snapshot.sync,
        serverReachable: true,
        queuedMutations: queuedCount,
        mode: queuedCount > 0 ? 'syncing' : 'online',
      }
      const stateWithSync = {
        ...baseState,
        sync: nextSync,
      }
      const nextState = queuedCount > 0 ? applyQueuedMutations(stateWithSync, queueRef.current) : stateWithSync
      stateRef.current = nextState
      reducerDispatch({ type: 'state/replace', payload: nextState })
      setIsOnline(true)
      return true
    } catch {
      reducerDispatch({
        type: 'sync/set',
        payload: { mode: 'offline', serverReachable: false },
      })
      setIsOnline(false)
      return false
    }
  }, [])

  const flushQueue = useCallback(async () => {
    const queue = queueRef.current.slice()
    if (queue.length === 0) {
      return true
    }

    reducerDispatch({
      type: 'sync/set',
      payload: { mode: 'syncing', queuedMutations: queue.length, serverReachable: true },
    })

    const { success, remaining } = await replayQueueWithRetention(queue, replayQueuedMutation)

    if (!success) {
      queueRef.current = remaining
      reducerDispatch({
        type: 'sync/set',
        payload: { mode: 'offline', serverReachable: false, queuedMutations: remaining.length },
      })
      setIsOnline(false)
      return false
    }

    queueRef.current = []
    reducerDispatch({
      type: 'sync/set',
      payload: {
        mode: 'online',
        serverReachable: true,
        queuedMutations: 0,
        lastSyncedAt: new Date().toISOString(),
      },
    })

    await syncFromServer()
    return true
  }, [syncFromServer])

  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true)
      const healthy = await waitForServerHealth({ maxAttempts: 20, intervalMs: 500 })
      if (healthy) {
        await syncFromServer()
        await flushQueue()
      }
      void connectSocketRef.current()
    }

    const onOffline = () => {
      setIsOnline(false)
      reducerDispatch({
        type: 'sync/set',
        payload: { mode: 'offline', serverReachable: false },
      })
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [flushQueue, syncFromServer])

  const scheduleReconnect = useCallback(() => {
    if (!window.navigator.onLine || reconnectTimerRef.current) {
      return
    }

    const attempt = reconnectAttemptsRef.current + 1
    reconnectAttemptsRef.current = attempt
    const delay = Math.min(10_000, 400 * attempt)

    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null
      connectSocketRef.current()
    }, delay)
  }, [])

  const handleSocketMessage = useCallback(async (event: MessageEvent) => {
    const payload = await parseSocketPayload(event.data)
    if (!payload) {
      return
    }

    if (payload.type === 'sync/connected') {
      if (payload.sync) {
        reducerDispatch({
          type: 'sync/set',
          payload: {
            ...payload.sync,
            serverReachable: true,
            queuedMutations: queueRef.current.length,
            mode: queueRef.current.length > 0 ? 'syncing' : 'online',
          },
        })
      }
      setIsOnline(true)
      return
    }

    if (payload.type === 'sync/state') {
      const snapshot = {
        users: payload.users ?? [],
        listings: payload.listings ?? [],
        reviews: payload.reviews ?? [],
        favourites: payload.favourites ?? [],
        conversations: payload.conversations ?? [],
        messages: payload.messages ?? [],
        sync: payload.sync ?? stateRef.current.sync,
      }
      const baseState = applyServerSnapshot(stateRef.current, snapshot)
      const queuedCount = queueRef.current.length
      const nextSync: SyncState = {
        ...baseState.sync,
        ...snapshot.sync,
        serverReachable: true,
        queuedMutations: queuedCount,
        mode: queuedCount > 0 ? 'syncing' : 'online',
      }
      const stateWithSync = {
        ...baseState,
        sync: nextSync,
      }
      const nextState = queuedCount > 0 ? applyQueuedMutations(stateWithSync, queueRef.current) : stateWithSync
      stateRef.current = nextState
      reducerDispatch({ type: 'state/replace', payload: nextState })
      setIsOnline(true)
      return
    }

    let nextState = applyServerPatch(stateRef.current, payload)
    if (queueRef.current.length > 0) {
      nextState = applyQueuedMutations(nextState, queueRef.current)
    }
    if (payload.sync) {
      nextState = {
        ...nextState,
        sync: {
          ...nextState.sync,
          ...payload.sync,
          serverReachable: true,
          queuedMutations: queueRef.current.length,
          mode: queueRef.current.length > 0 ? 'syncing' : payload.sync.mode,
        },
      }
    }
    stateRef.current = nextState
    reducerDispatch({ type: 'state/replace', payload: nextState })

    const currentUserId = stateRef.current.currentUserId
    const hasIncomingMessage = payload.messages?.some(
      (msg) => msg.recipientId === currentUserId
    )
    if (hasIncomingMessage) {
      void syncFromServer()
    }
  }, [syncFromServer])

  const connectSocket = useCallback(async () => {
    if (!window.navigator.onLine) {
      return
    }

    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      return
    }

    const healthy = await waitForServerHealth({ maxAttempts: 6, intervalMs: 500 })
    if (!healthy) {
      scheduleReconnect()
      return
    }

    const socket = new WebSocket(getWebSocketUrl())
    socketRef.current = socket

    const connectTimer = setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
    }, 5000)

    socket.addEventListener('open', () => {
      clearTimeout(connectTimer)
      reconnectAttemptsRef.current = 0
      reducerDispatch({ type: 'sync/set', payload: { serverReachable: true } })
      setIsOnline(true)
      void syncFromServer()
      void flushQueue()
    })

    socket.addEventListener('message', (event) => {
      void handleSocketMessage(event)
    })

    socket.addEventListener('close', () => {
      clearTimeout(connectTimer)
      socketRef.current = null
      if (!window.navigator.onLine) {
        setIsOnline(false)
        reducerDispatch({
          type: 'sync/set',
          payload: { mode: 'offline', serverReachable: false },
        })
        return
      }

      scheduleReconnect()
    })

    socket.addEventListener('error', () => {
      clearTimeout(connectTimer)
      if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
        console.warn('[Music Core] WebSocket error — live updates disabled until it connects:', getWebSocketUrl())
      }
      socket.close()
    })
  }, [flushQueue, handleSocketMessage, scheduleReconnect, syncFromServer])

  connectSocketRef.current = connectSocket

  useEffect(() => {
    const queuedCount = queueRef.current.length
    if (queuedCount > 0) {
      const nextState = applyQueuedMutations(stateRef.current, queueRef.current)
      stateRef.current = nextState
      reducerDispatch({ type: 'state/replace', payload: nextState })
    }
    reducerDispatch({
      type: 'sync/set',
      payload: {
        queuedMutations: queuedCount,
        mode: queuedCount > 0 ? (window.navigator.onLine ? 'syncing' : 'offline') : stateRef.current.sync.mode,
      },
    })
    void (async () => {
      const healthy = await waitForServerHealth({ maxAttempts: 40, intervalMs: 500 })
      if (healthy) {
        await syncFromServer()
      }
      void connectSocketRef.current()
    })()
  }, [syncFromServer])

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  const dispatch = useCallback(
    (action: AppAction) => {
      if (!isMutationAction(action)) {
        reducerDispatch(action)
        return
      }

      const queuedMutation = toQueuedMutation(stateRef.current, action)
      reducerDispatch(action)

      if (!queuedMutation) {
        return
      }

      const online = window.navigator.onLine && stateRef.current.sync.serverReachable

      const persistQueued = (
        nextQueue: QueuedMutation[],
        mode: SyncState['mode'],
        serverReachable?: boolean,
      ) => {
        queueRef.current = nextQueue
        const payload: Partial<SyncState> = {
          queuedMutations: nextQueue.length,
          mode,
        }
        if (serverReachable !== undefined) {
          payload.serverReachable = serverReachable
        }
        reducerDispatch({ type: 'sync/set', payload })
      }

      if (!online) {
        persistQueued([...queueRef.current, queuedMutation], 'offline', false)
        setIsOnline(false)
        return
      }

      void (async () => {
        if (replayInFlightRef.current) {
          persistQueued([...queueRef.current, queuedMutation], 'syncing', true)
          return
        }

        replayInFlightRef.current = true
        try {
          reducerDispatch({
            type: 'sync/set',
            payload: { mode: 'syncing', serverReachable: true },
          })
          await replayQueuedMutation(queuedMutation)
          reducerDispatch({
            type: 'sync/set',
            payload: {
              mode: 'online',
              serverReachable: true,
              queuedMutations: queueRef.current.length,
              lastSyncedAt: new Date().toISOString(),
            },
          })
        } catch {
          persistQueued([...queueRef.current, queuedMutation], 'offline', false)
          setIsOnline(false)
        } finally {
          replayInFlightRef.current = false
        }
      })()
    },
    [],
  )

  const value = useMemo<AppStoreContextValue>(() => {
    return {
      state,
      dispatch,
      refreshFromServer: syncFromServer,
      isOnline,
    }
  }, [dispatch, isOnline, state, syncFromServer])

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}
