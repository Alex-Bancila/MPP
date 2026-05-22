import type { ListingCategoryFilter } from '@/shared/constants/categories'
import type { ListingsLayout } from '@/shared/types/domain'
import type {
  AppState,
  AppView,
  Conversation,
  Listing,
  ListingStatus,
  Review,
  SyncState,
  User,
} from '@/shared/types/domain'

export type RegisterPayload = Omit<User, 'createdAt'> & { createdAt?: string }

export type CreateListingPayload = Omit<Listing, 'id' | 'datePosted'> & {
  id?: string
  datePosted?: string
}

export type CreateReviewPayload = Omit<Review, 'id' | 'createdAt' | 'updatedAt'> & {
  clientId?: string
  id?: string
  createdAt?: string
  updatedAt?: string
}

export type UpdateListingPayload = {
  listingId: string
  updates: Partial<
    Pick<
      Listing,
      'title' | 'description' | 'price' | 'category' | 'photos' | 'status'
    >
  >
}

export type LoginPayload = { userId: string; user?: User }

export type AppAction =
  | { type: 'auth/register'; payload: RegisterPayload }
  | { type: 'auth/login'; payload: LoginPayload }
  | { type: 'auth/logout' }
  | { type: 'listing/create'; payload: CreateListingPayload }
  | { type: 'listing/update'; payload: UpdateListingPayload }
  | { type: 'listing/delete'; payload: { listingId: string } }
  | { type: 'review/create'; payload: CreateReviewPayload }
  | {
      type: 'review/update'
      payload: { reviewId: string; updates: Partial<Pick<Review, 'title' | 'body' | 'rating'>> }
    }
  | { type: 'review/delete'; payload: { reviewId: string } }
  | {
      type: 'listing/status'
      payload: { listingId: string; status: ListingStatus }
    }
  | {
      type: 'message/send'
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
  | { type: 'message/markAsRead'; payload: { conversationId: string; userId: string } }
  | { type: 'conversation/create'; payload: Conversation }
  | { type: 'favourite/toggle'; payload: { userId: string; listingId: string } }
  | {
      type: 'activity/set'
      payload: Partial<{
        preferredCategory: ListingCategoryFilter
        preferredView: AppView
        preferredListingsLayout: ListingsLayout
        lastSearch: string
        recentlyViewedListingIds: string[]
        lastVisitedRoute: string
        lastActiveAt: string
      }>
    }
  | { type: 'activity/trackViewedListing'; payload: { listingId: string } }
  | { type: 'state/replace'; payload: AppState }
  | { type: 'sync/set'; payload: Partial<SyncState> }
