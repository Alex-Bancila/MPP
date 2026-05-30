import type {
  ListingCategory,
  ListingCategoryFilter,
} from '../constants/categories'

export type ListingStatus = 'Active' | 'Sold'

export type UserRoleName = 'admin' | 'user'

export type AppView = 'listings' | 'statistics'

export interface User {
  id: string
  username: string
  email: string
  passwordHash: string
  avatarUrl: string
  createdAt: string
  role?: UserRoleName
  permissions?: string[]
  banned?: boolean
  bannedReason?: string | null
  bannedAt?: string | null
}

export type AdminAccessRequestStatus = 'pending' | 'approved' | 'rejected'

export interface AdminAccessRequest {
  id: string
  userId: string
  username: string
  email: string
  status: AdminAccessRequestStatus
  note: string | null
  createdAt: string
  resolvedAt: string | null
  resolvedById: string | null
}

export interface Listing {
  id: string
  title: string
  description: string
  price: number
  category: ListingCategory
  photos: string[]
  sellerId: string
  datePosted: string
  status: ListingStatus
}

export interface Review {
  id: string
  listingId: string
  userId: string
  rating: number
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

export type SyncMode = 'online' | 'offline' | 'syncing'

export interface SyncState {
  mode: SyncMode
  queuedMutations: number
  lastSyncedAt: string | null
  serverReachable: boolean
}

export interface Conversation {
  id: string
  listingId: string
  participantIds: [string, string]
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  recipientId?: string
  listingId?: string
  body: string
  createdAt: string
  readAt?: string
}

export interface ActionLog {
  id: string
  userId: string
  username: string
  role: UserRoleName
  action: string
  details: string
  createdAt: string
}

export interface SuspiciousUser {
  id: string
  userId: string
  username: string
  role: UserRoleName
  reason: string
  score: number
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface Favourite {
  userId: string
  listingId: string
  createdAt: string
}

export type ListingsLayout = 'cards' | 'table'

export interface ActivityPreferences {
  preferredCategory: ListingCategoryFilter
  preferredView: AppView
  preferredListingsLayout: ListingsLayout
  lastSearch: string
  recentlyViewedListingIds: string[]
  lastVisitedRoute: string
  lastActiveAt: string
}

export interface AppState {
  users: User[]
  listings: Listing[]
  reviews: Review[]
  conversations: Conversation[]
  messages: Message[]
  favourites: Favourite[]
  currentUserId: string | null
  activity: ActivityPreferences
  sync: SyncState
}
