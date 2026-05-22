import type {
  CreateListingPayload,
  CreateReviewPayload,
  UpdateListingPayload,
} from '@/app/store/actions'
import type {
  Conversation,
  Favourite,
  Listing,
  Message,
  Review,
  SyncState,
  User,
} from '@/shared/types/domain'

const resolveApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (typeof window !== 'undefined') {
    if (configured) {
      const url = new URL(configured)
      if (
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1' &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      ) {
        url.hostname = window.location.hostname
      }
      return url.toString()
    }
    return window.location.origin
  }
  if (configured) {
    return configured
  }
  return 'http://localhost:3001'
}

const API_BASE_URL = resolveApiBaseUrl()

/** Turn http(s) origin into ws(s) URL including /ws path. */
const httpBaseToWebSocketUrl = (httpBase: string): string => {
  const trimmed = httpBase.replace(/\/$/, '')
  if (trimmed.startsWith('wss://') || trimmed.startsWith('ws://')) {
    return trimmed.endsWith('/ws') ? trimmed : `${trimmed}/ws`
  }
  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice('https://'.length)}/ws`
  }
  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice('http://'.length)}/ws`
  }
  return `ws://${trimmed}/ws`
}

/**
 * WebSocket URL for real-time sync (chat, listings, etc.).
 *
 * In **development**, the default is the **same host and port as the page** (e.g.
 * `ws://192.168.1.5:5173/ws`) so traffic goes through the **Vite proxy** to the API.
 * That way only the dev-server port (usually 5173) must be allowed through the firewall
 * from your phone — the same as GraphQL. A direct socket to `:3001` often fails on
 * Windows because inbound TCP 3001 is blocked while 5173 works.
 *
 * Set `VITE_WS_DIRECT=true` to use `ws://<hostname>:3001/ws` instead (open port 3001).
 * Set `VITE_WS_URL` for a fully custom WebSocket URL.
 */
export const getWebSocketUrl = (): string => {
  const explicit = (import.meta.env.VITE_WS_URL as string | undefined)?.trim()
  if (explicit) {
    if (explicit.startsWith('ws://') || explicit.startsWith('wss://')) {
      return explicit.endsWith('/ws') ? explicit : `${explicit.replace(/\/$/, '')}/ws`
    }
    return httpBaseToWebSocketUrl(explicit)
  }

  if (typeof window === 'undefined') {
    return 'ws://localhost:3001/ws'
  }

  if (import.meta.env.DEV) {
    const direct = (import.meta.env.VITE_WS_DIRECT as string | undefined) === 'true'
    if (direct) {
      const configured = import.meta.env.VITE_API_BASE_URL as string | undefined
      if (configured) {
        try {
          const url = new URL(configured)
          if (
            window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1' &&
            (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
          ) {
            url.hostname = window.location.hostname
          }
          return httpBaseToWebSocketUrl(url.toString())
        } catch {
          // fall through
        }
      }
      const url = `ws://${window.location.hostname}:3001/ws`
      console.log('[WS] direct url:', url)  // ADD THIS
      return url
    }
    const url = httpBaseToWebSocketUrl(window.location.origin)
    console.log('[WS] proxy url:', url)  // ADD THIS
    return url
  }

  const url = httpBaseToWebSocketUrl(window.location.origin)
  console.log('[WS] prod url:', url)  // ADD THIS
  return url
}

const REQUEST_TIMEOUT = 10000

const buildUrl = (path: string): string => {
  return new URL(path, API_BASE_URL).toString()
}

const fetchWithTimeout = async (url: string, options: RequestInit, timeout = REQUEST_TIMEOUT): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const requestGraphQL = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
  const response = await fetchWithTimeout(buildUrl('/graphql'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  const payload = (await response.json()) as {
    data?: T
    errors?: Array<{ message?: string } | string>
  }

  if (!response.ok || payload.errors?.length) {
    const message = payload.errors
      ?.map((error) => (typeof error === 'string' ? error : error.message))
      .filter(Boolean)
      .join('; ')
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  if (!payload.data) {
    throw new Error('GraphQL response missing data')
  }

  return payload.data
}

export interface SyncSnapshot {
  users: User[]
  listings: Listing[]
  reviews: Review[]
  favourites: Favourite[]
  conversations: Conversation[]
  messages: Message[]
  sync: SyncState
}

export interface ListingsPageQuery {
  category: string
  search: string
  status: 'All' | 'Active' | 'Sold'
  page: number
  pageSize: number
}

export interface ListingsPageResponse {
  items: Listing[]
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
}

const LISTING_FIELDS = `
  id
  title
  description
  price
  category
  photos
  sellerId
  datePosted
  status
`

const REVIEW_FIELDS = `
  id
  listingId
  userId
  rating
  title
  body
  createdAt
  updatedAt
`

const FAVOURITE_FIELDS = `
  userId
  listingId
  createdAt
`

const USER_FIELDS = `
  id
  username
  email
  avatarUrl
  createdAt
  role
  permissions
`

const LISTING_CARD_FIELDS = `
  id
  title
  price
  category
  photos
  sellerId
  datePosted
  status
`

const CONVERSATION_FIELDS = `
  id
  listingId
  participantIds
  createdAt
`

const MESSAGE_FIELDS = `
  id
  conversationId
  senderId
  recipientId
  listingId
  body
  createdAt
  readAt
`

const SYNC_FIELDS = `
  mode
  queuedMutations
  lastSyncedAt
  serverReachable
`

export type QueuedMutation =
  | { kind: 'listing/create'; payload: CreateListingPayload }
  | { kind: 'listing/update'; payload: UpdateListingPayload }
  | { kind: 'listing/delete'; payload: { listingId: string } }
  | { kind: 'favourite/add'; payload: { userId: string; listingId: string } }
  | { kind: 'favourite/remove'; payload: { userId: string; listingId: string } }
  | { kind: 'review/create'; payload: CreateReviewPayload }
  | { kind: 'review/update'; payload: { reviewId: string; updates: Partial<Pick<CreateReviewPayload, 'rating' | 'title' | 'body'>> } }
  | { kind: 'review/delete'; payload: { reviewId: string } }
  | {
      kind: 'message/send'
      payload: {
        listingId: string
        recipientId: string
        senderId: string
        body: string
        conversationId?: string
        id?: string
        createdAt?: string
      }
    }

export interface HealthStatus {
  ok: boolean
  postgres: boolean
  mongo: boolean
}

export const getServerHealth = async (): Promise<HealthStatus> => {
  try {
    const data = await requestGraphQL<{ health: HealthStatus }>(`
      query Health {
        health {
          ok
          postgres
          mongo
        }
      }
    `)
    return data.health
  } catch {
    return { ok: false, postgres: false, mongo: false }
  }
}

export const getServerReachable = async (): Promise<boolean> => {
  const health = await getServerHealth()
  return health.postgres
}

export const getSyncSnapshot = async (): Promise<SyncSnapshot> => {
  const data = await requestGraphQL<{ syncState: SyncSnapshot }>(`
    query SyncState {
      syncState {
        users { ${USER_FIELDS} }
        listings { ${LISTING_FIELDS} }
        reviews { ${REVIEW_FIELDS} }
        favourites { ${FAVOURITE_FIELDS} }
        conversations { ${CONVERSATION_FIELDS} }
        messages { ${MESSAGE_FIELDS} }
        sync { ${SYNC_FIELDS} }
      }
    }
  `)
  return data.syncState
}

export const loginServerUser = async (input: { email: string; password: string }): Promise<User> => {
  const response = await fetchWithTimeout(buildUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }))
    throw new Error(error.message ?? `Login failed with status ${response.status}`)
  }

  const data = await response.json()
  return mapAuthUser(data)
}

const mapAuthUser = (data: {
  id: string
  username: string
  email: string
  avatarUrl: string
  createdAt?: string
  role?: User['role']
  permissions?: string[]
}): User => ({
  id: data.id,
  username: data.username,
  email: data.email,
  passwordHash: '',
  avatarUrl: data.avatarUrl,
  createdAt: data.createdAt ?? new Date().toISOString(),
  role: data.role ?? 'user',
  permissions: data.permissions ?? [],
})

export const registerServerUser = async (input: {
  username: string
  email: string
  password: string
}): Promise<User> => {
  const response = await fetchWithTimeout(buildUrl('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Registration failed' }))
    throw new Error(error.message ?? `Registration failed with status ${response.status}`)
  }

  const data = await response.json()
  return mapAuthUser(data)
}

export const getServerListings = async (query: ListingsPageQuery): Promise<ListingsPageResponse> => {
  const data = await requestGraphQL<{
    listings: Omit<ListingsPageResponse, 'pageSize'>
  }>(
    `
    query Listings($category: String, $search: String, $status: String, $page: Int, $pageSize: Int) {
      listings(category: $category, search: $search, status: $status, page: $page, pageSize: $pageSize) {
        items { ${LISTING_CARD_FIELDS} }
        totalItems
        totalPages
        currentPage
      }
    }
  `,
    {
      category: query.category,
      search: query.search,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    },
  )

  return {
    ...data.listings,
    pageSize: query.pageSize,
  }
}

export const createServerListing = async (payload: CreateListingPayload): Promise<Listing> => {
  const data = await requestGraphQL<{ createListing: Listing }>(
    `
    mutation CreateListing(
      $id: ID
      $datePosted: String
      $title: String!
      $description: String!
      $price: Int!
      $category: String!
      $photos: [String!]!
      $sellerId: ID!
      $status: String
    ) {
      createListing(
        id: $id
        datePosted: $datePosted
        title: $title
        description: $description
        price: $price
        category: $category
        photos: $photos
        sellerId: $sellerId
        status: $status
      ) {
        ${LISTING_FIELDS}
      }
    }
  `,
    {
      id: payload.id,
      datePosted: payload.datePosted,
      title: payload.title,
      description: payload.description,
      price: payload.price,
      category: payload.category,
      photos: payload.photos ?? [],
      sellerId: payload.sellerId,
      status: payload.status,
    },
  )

  return data.createListing
}

export const updateServerListing = async (listingId: string, updates: UpdateListingPayload['updates']): Promise<Listing> => {
  const data = await requestGraphQL<{ updateListing: Listing | null }>(
    `
    mutation UpdateListing(
      $listingId: ID!
      $title: String
      $description: String
      $price: Int
      $category: String
      $photos: [String!]
      $status: String
    ) {
      updateListing(
        listingId: $listingId
        title: $title
        description: $description
        price: $price
        category: $category
        photos: $photos
        status: $status
      ) {
        ${LISTING_FIELDS}
      }
    }
  `,
    {
      listingId,
      title: updates.title,
      description: updates.description,
      price: updates.price,
      category: updates.category,
      photos: updates.photos,
      status: updates.status,
    },
  )

  if (!data.updateListing) {
    throw new Error('Listing not found')
  }

  return data.updateListing
}

export const deleteServerListing = async (listingId: string): Promise<void> => {
  const data = await requestGraphQL<{ deleteListing: boolean }>(
    `
    mutation DeleteListing($listingId: ID!) {
      deleteListing(listingId: $listingId)
    }
  `,
    { listingId },
  )

  if (!data.deleteListing) {
    throw new Error('Listing not found')
  }
}

export const addServerFavourite = async (userId: string, listingId: string): Promise<void> => {
  await requestGraphQL<{ toggleFavourite: boolean }>(
    `
    mutation AddFavourite($userId: ID!, $listingId: ID!) {
      toggleFavourite(userId: $userId, listingId: $listingId)
    }
  `,
    { userId, listingId },
  )
}

export const removeServerFavourite = async (userId: string, listingId: string): Promise<void> => {
  const data = await requestGraphQL<{ removeFavourite: boolean }>(
    `
    mutation RemoveFavourite($userId: ID!, $listingId: ID!) {
      removeFavourite(userId: $userId, listingId: $listingId)
    }
  `,
    { userId, listingId },
  )

  if (!data.removeFavourite) {
    throw new Error('Favourite not found')
  }
}

export const createServerReview = async (payload: CreateReviewPayload): Promise<Review> => {
  const data = await requestGraphQL<{ createReview: Review }>(
    `
    mutation CreateReview(
      $listingId: ID!
      $userId: ID!
      $rating: Int!
      $title: String!
      $body: String!
    ) {
      createReview(
        listingId: $listingId
        userId: $userId
        rating: $rating
        title: $title
        body: $body
      ) {
        ${REVIEW_FIELDS}
      }
    }
  `,
    {
      listingId: payload.listingId,
      userId: payload.userId,
      rating: payload.rating,
      title: payload.title,
      body: payload.body,
    },
  )

  return data.createReview
}

export const updateServerReview = async (
  reviewId: string,
  updates: Partial<Pick<CreateReviewPayload, 'rating' | 'title' | 'body'>>,
): Promise<Review> => {
  const data = await requestGraphQL<{ updateReview: Review | null }>(
    `
    mutation UpdateReview($reviewId: ID!, $rating: Int, $title: String, $body: String) {
      updateReview(reviewId: $reviewId, rating: $rating, title: $title, body: $body) {
        ${REVIEW_FIELDS}
      }
    }
  `,
    {
      reviewId,
      rating: updates.rating,
      title: updates.title,
      body: updates.body,
    },
  )

  if (!data.updateReview) {
    throw new Error('Review not found')
  }

  return data.updateReview
}

export const deleteServerReview = async (reviewId: string): Promise<void> => {
  const data = await requestGraphQL<{ deleteReview: boolean }>(
    `
    mutation DeleteReview($reviewId: ID!) {
      deleteReview(reviewId: $reviewId)
    }
  `,
    { reviewId },
  )

  if (!data.deleteReview) {
    throw new Error('Review not found')
  }
}

export const sendServerChatMessage = async (input: {
  conversationId?: string
  messageId?: string
  listingId: string
  senderId: string
  recipientId: string
  body: string
  createdAt?: string
}): Promise<Message> => {
  const data = await requestGraphQL<{ sendChatMessage: Message }>(
    `
    mutation SendChatMessage(
      $conversationId: ID
      $messageId: ID
      $listingId: ID!
      $senderId: ID!
      $recipientId: ID!
      $body: String!
      $createdAt: String
    ) {
      sendChatMessage(
        conversationId: $conversationId
        messageId: $messageId
        listingId: $listingId
        senderId: $senderId
        recipientId: $recipientId
        body: $body
        createdAt: $createdAt
      ) {
        ${MESSAGE_FIELDS}
      }
    }
  `,
    input,
  )

  return data.sendChatMessage
}

export interface AdminRole {
  id: string
  name: string
  description: string | null
  permissions: string[]
}

export interface AdminActionLog {
  id: string
  userId: string
  username: string
  role: string
  action: string
  details: string
  createdAt: string
}

export interface AdminSuspiciousUser {
  id: string
  userId: string
  username: string
  role: string
  reason: string
  score: number
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface AdminDashboardData {
  logs: AdminActionLog[]
  suspiciousUsers: AdminSuspiciousUser[]
}

export const getAdminRoles = async (): Promise<AdminRole[]> => {
  const data = await requestGraphQL<{ roles: AdminRole[] }>(
    `
    query Roles {
      roles {
        id
        name
        description
        permissions
      }
    }
  `,
  )
  return data.roles
}

export const getAdminDashboard = async (limit = 25): Promise<AdminDashboardData> => {
  const data = await requestGraphQL<{ adminDashboard: AdminDashboardData }>(
    `
    query AdminDashboard($limit: Int) {
      adminDashboard(limit: $limit) {
        logs {
          id
          userId
          username
          role
          action
          details
          createdAt
        }
        suspiciousUsers {
          id
          userId
          username
          role
          reason
          score
          createdAt
          updatedAt
          resolvedAt
        }
      }
    }
  `,
    { limit },
  )
  return data.adminDashboard
}

export interface GeneratorStatus {
  running: boolean
  batchSize?: number
  intervalMs?: number
  entityType?: string
}

export const startServerGenerator = async (input?: {
  batchSize?: number
  intervalMs?: number
  entityType?: 'listings' | 'reviews' | 'mixed'
}): Promise<GeneratorStatus> => {
  const data = await requestGraphQL<{ startGenerator: GeneratorStatus }>(
    `
    mutation StartGenerator($batchSize: Int, $intervalMs: Int, $entityType: String) {
      startGenerator(batchSize: $batchSize, intervalMs: $intervalMs, entityType: $entityType) {
        running
        batchSize
        intervalMs
        entityType
      }
    }
  `,
    input ?? {},
  )
  return data.startGenerator
}

export const stopServerGenerator = async (): Promise<GeneratorStatus> => {
  const data = await requestGraphQL<{ stopGenerator: GeneratorStatus }>(
    `
    mutation StopGenerator {
      stopGenerator {
        running
      }
    }
  `,
  )
  return data.stopGenerator
}

export const replayQueuedMutation = async (mutation: QueuedMutation): Promise<void> => {
  switch (mutation.kind) {
    case 'listing/create':
      await createServerListing(mutation.payload)
      return
    case 'listing/update':
      await updateServerListing(mutation.payload.listingId, mutation.payload.updates)
      return
    case 'listing/delete':
      await deleteServerListing(mutation.payload.listingId)
      return
    case 'favourite/add':
      await addServerFavourite(mutation.payload.userId, mutation.payload.listingId)
      return
    case 'favourite/remove':
      await removeServerFavourite(mutation.payload.userId, mutation.payload.listingId)
      return
    case 'review/create':
      await createServerReview(mutation.payload)
      return
    case 'review/update':
      await updateServerReview(mutation.payload.reviewId, mutation.payload.updates)
      return
    case 'review/delete':
      await deleteServerReview(mutation.payload.reviewId)
      return
    case 'message/send':
      await sendServerChatMessage({
        conversationId: mutation.payload.conversationId,
        messageId: mutation.payload.id,
        listingId: mutation.payload.listingId,
        senderId: mutation.payload.senderId,
        recipientId: mutation.payload.recipientId,
        body: mutation.payload.body,
        createdAt: mutation.payload.createdAt,
      })
      return
  }
}

export { API_BASE_URL }
