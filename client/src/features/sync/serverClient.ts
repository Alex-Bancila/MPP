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

// Token management
let authToken: string | null = null

export const setAuthToken = (token: string | null): void => {
  authToken = token
  if (token) {
    localStorage.setItem('music-core.token', token)
  } else {
    localStorage.removeItem('music-core.token')
  }
}

let refreshToken: string | null = null

export const setRefreshToken = (token: string | null): void => {
  refreshToken = token
  if (token) {
    localStorage.setItem('music-core.refresh', token)
  } else {
    localStorage.removeItem('music-core.refresh')
  }
}

export const getRefreshToken = (): string | null => {
  if (refreshToken) return refreshToken
  try {
    refreshToken = localStorage.getItem('music-core.refresh')
  } catch {
    refreshToken = null
  }
  return refreshToken
}

export const getAuthToken = (): string | null => {
  if (authToken) return authToken
  try {
    authToken = localStorage.getItem('music-core.token')
  } catch {
    authToken = null
  }
  return authToken
}

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
          const wsUrl = httpBaseToWebSocketUrl(url.toString())
          const token = getAuthToken()
          return token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl
        } catch {
          // fall through
        }
      }
      const url = `ws://${window.location.hostname}:3001/ws`
      const token = getAuthToken()
      return token ? `${url}?token=${encodeURIComponent(token)}` : url
    }
    const url = httpBaseToWebSocketUrl(window.location.origin)
    const token = getAuthToken()
    if (token) {
      return `${url}?token=${encodeURIComponent(token)}`
    }
    return url
  }

  const url = httpBaseToWebSocketUrl(window.location.origin)
  const token = getAuthToken()
  if (token) {
    return `${url}?token=${encodeURIComponent(token)}`
  }
  return url
}

const REQUEST_TIMEOUT = 10000

const buildUrl = (path: string): string => {
  return new URL(path, API_BASE_URL).toString()
}

const fetchWithTimeout = async (url: string, options: RequestInit, timeout = REQUEST_TIMEOUT): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const token = getAuthToken()
  try {
    return await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

const doGraphQLRequest = async (query: string, variables?: Record<string, unknown>): Promise<Response> => {
  const token = getAuthToken()
  return fetchWithTimeout(buildUrl('/graphql'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })
}

const requestGraphQL = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
  let response = await doGraphQLRequest(query, variables)

  // Silent token refresh on 401 — retry once with the new token
  if (response.status === 401) {
    const refreshed = await refreshServerSession()
    if (refreshed) {
      response = await doGraphQLRequest(query, variables)
    }
  }

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

export type LoginOutcome =
  | { kind: 'success'; user: User }
  | { kind: '2fa'; challengeId: string }

const persistTokens = (data: { token?: string; refreshToken?: string }): void => {
  if (data.token) {
    setAuthToken(data.token)
  }
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken)
  }
}

export const loginServerUser = async (input: { email: string; password: string }): Promise<LoginOutcome> => {
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
  if (data.twoFactorRequired) {
    return { kind: '2fa', challengeId: data.challengeId }
  }
  persistTokens(data)
  return { kind: 'success', user: mapAuthUser(data) }
}

export const verifyTwoFactor = async (input: { challengeId: string; code: string }): Promise<User> => {
  const response = await fetchWithTimeout(buildUrl('/auth/login/verify-2fa'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Verification failed' }))
    throw new Error(error.message ?? `Verification failed with status ${response.status}`)
  }

  const data = await response.json()
  persistTokens(data)
  return mapAuthUser(data)
}

export interface RegisterOutcome {
  user: User
  adminRequestPending: boolean
}

export const registerServerUser = async (input: {
  username: string
  email: string
  password: string
  requestAdmin?: boolean
}): Promise<RegisterOutcome> => {
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
  persistTokens(data)
  return { user: mapAuthUser(data), adminRequestPending: Boolean(data.adminRequestPending) }
}

export const refreshServerSession = async (): Promise<boolean> => {
  const token = getRefreshToken()
  if (!token) return false

  const response = await fetchWithTimeout(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  })

  if (!response.ok) {
    setAuthToken(null)
    setRefreshToken(null)
    return false
  }

  const data = await response.json()
  if (data.token) setAuthToken(data.token)
  if (data.refreshToken) setRefreshToken(data.refreshToken)
  return true
}

// FIX: restores the session on page reload by calling /auth/me with the stored token
export const restoreServerSession = async (): Promise<User | null> => {
  const token = getAuthToken()
  if (!token) return null

  try {
    const authHeader: Record<string, string> | undefined = token
      ? { Authorization: `Bearer ${token}` }
      : undefined
    const response = await fetchWithTimeout(buildUrl('/auth/me'), {
      method: 'GET',
      headers: authHeader,
    })

    if (!response.ok) {
      // Token expired or invalid — clear it so the user isn't stuck
      setAuthToken(null)
      setRefreshToken(null)
      return null
    }

    const data = await response.json()
    return mapAuthUser(data)
  } catch {
    // Network error — don't clear the token, server may just be temporarily down
    return null
  }
}

export const requestPasswordReset = async (input: { email: string }): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(buildUrl('/auth/forgot'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return response.ok
  } catch {
    return false
  }
}

export const resetPassword = async (input: { token: string; password: string }): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(buildUrl('/auth/reset'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return response.ok
  } catch {
    return false
  }
}

export const requestMagicLink = async (input: { email: string }): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(buildUrl('/auth/magic/request'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return response.ok
  } catch {
    return false
  }
}

export const verifyMagicLink = async (input: { token: string }): Promise<User> => {
  const response = await fetchWithTimeout(buildUrl('/auth/magic/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Magic link failed' }))
    throw new Error(error.message ?? `Magic link failed with status ${response.status}`)
  }

  const data = await response.json()
  if (data.token) setAuthToken(data.token)
  if (data.refreshToken) setRefreshToken(data.refreshToken)
  return mapAuthUser(data)
}

export const logoutServerSession = async (): Promise<void> => {
  const token = getRefreshToken()
  if (!token) {
    setAuthToken(null)
    return
  }
  await fetchWithTimeout(buildUrl('/auth/logout'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  }).catch(() => undefined)
  setAuthToken(null)
  setRefreshToken(null)
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

export interface AdminAccessRequest {
  id: string
  userId: string
  username: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  note: string | null
  createdAt: string
  resolvedAt: string | null
  resolvedById: string | null
}

// Authenticated REST request with the same silent refresh-on-401 retry as requestGraphQL,
// so admin calls don't fail once the short-lived access token expires.
const requestAdminJson = async <T>(
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
): Promise<T> => {
  const send = () =>
    fetchWithTimeout(buildUrl(path), {
      method,
      // Only declare a JSON content-type when we actually send a body — Fastify rejects
      // an empty body when Content-Type is application/json (approve/reject send none).
      ...(body
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : {}),
    })

  let response = await send()
  if (response.status === 401) {
    const refreshed = await refreshServerSession()
    if (refreshed) {
      response = await send()
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message ?? `Request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const getAdminRequests = async (): Promise<AdminAccessRequest[]> => {
  const data = await requestAdminJson<{ requests: AdminAccessRequest[] }>('/admin/requests', 'GET')
  return data.requests
}

export const approveAdminRequest = async (id: string): Promise<AdminAccessRequest> => {
  const data = await requestAdminJson<{ request: AdminAccessRequest }>(`/admin/requests/${id}/approve`, 'POST')
  return data.request
}

export const rejectAdminRequest = async (id: string): Promise<AdminAccessRequest> => {
  const data = await requestAdminJson<{ request: AdminAccessRequest }>(`/admin/requests/${id}/reject`, 'POST')
  return data.request
}

export interface BanResult {
  id: string
  email: string
  username: string
  banned: boolean
  bannedReason: string | null
  bannedAt: string | null
}

export const banUser = async (input: { email: string; reason: string }): Promise<BanResult> => {
  return requestAdminJson<BanResult>('/admin/users/ban', 'POST', input)
}

export const unbanUser = async (input: { email: string }): Promise<BanResult> => {
  return requestAdminJson<BanResult>('/admin/users/unban', 'POST', input)
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
