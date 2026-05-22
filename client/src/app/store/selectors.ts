import {
  ALL_CATEGORIES_FILTER,
  CATEGORY_CHART_COLORS,
  LISTING_CATEGORIES,
  type ListingCategoryFilter,
} from '../../shared/constants/categories'
import type { AppState, Listing, ListingStatus, Message, Review, User } from '../../shared/types/domain'

export interface ListingsQuery {
  category: ListingCategoryFilter
  search: string
  status: ListingStatus | 'All'
  page: number
  pageSize: number
}

export interface PaginatedListingsResult {
  rows: Listing[]
  totalItems: number
  totalPages: number
  currentPage: number
}

const sortNewest = (rows: Listing[]): Listing[] => {
  return [...rows].sort((first, second) => {
    return new Date(second.datePosted).getTime() - new Date(first.datePosted).getTime()
  })
}

export const getCurrentUser = (state: AppState): User | undefined => {
  return state.users.find((user) => user.id === state.currentUserId)
}

export const getUserById = (state: AppState, userId: string): User | undefined => {
  return state.users.find((user) => user.id === userId)
}

export const getListingById = (state: AppState, listingId: string): Listing | undefined => {
  return state.listings.find((listing) => listing.id === listingId)
}

export const getReviewById = (state: AppState, reviewId: string): Review | undefined => {
  return state.reviews.find((review) => review.id === reviewId)
}

export const getReviewsForListing = (state: AppState, listingId: string): Review[] => {
  return [...state.reviews]
    .filter((review) => review.listingId === listingId)
    .sort((first, second) => {
      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    })
}

export const getReviewSummaryForListing = (state: AppState, listingId: string) => {
  const reviews = getReviewsForListing(state, listingId)
  const count = reviews.length
  const averageRating =
    count === 0 ? 0 : Number((reviews.reduce((sum, review) => sum + review.rating, 0) / count).toFixed(1))

  return {
    count,
    averageRating,
  }
}

export const getListingsForQuery = (
  state: AppState,
  query: Pick<ListingsQuery, 'category' | 'search' | 'status'>,
): Listing[] => {
  const normalizedSearch = query.search.trim().toLowerCase()

  const filtered = state.listings.filter((listing) => {
    const isCategoryMatch =
      query.category === ALL_CATEGORIES_FILTER || listing.category === query.category
    const isStatusMatch = query.status === 'All' || listing.status === query.status
    const isSearchMatch =
      normalizedSearch.length === 0 ||
      listing.title.toLowerCase().includes(normalizedSearch) ||
      listing.description.toLowerCase().includes(normalizedSearch)

    return isCategoryMatch && isStatusMatch && isSearchMatch
  })

  return sortNewest(filtered)
}

export const getPaginatedListings = (
  state: AppState,
  query: ListingsQuery,
): PaginatedListingsResult => {
  const filtered = getListingsForQuery(state, query)
  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize))
  const currentPage = Math.min(Math.max(query.page, 1), totalPages)

  const offset = (currentPage - 1) * query.pageSize
  const rows = filtered.slice(offset, offset + query.pageSize)

  return {
    rows,
    totalItems,
    totalPages,
    currentPage,
  }
}

export const getListingsByUser = (state: AppState, userId: string): Listing[] => {
  return sortNewest(
    state.listings.filter((listing) => {
      return listing.sellerId === userId
    }),
  )
}

export const getActiveListingsByUser = (state: AppState, userId: string): Listing[] => {
  return getListingsByUser(state, userId).filter((listing) => listing.status === 'Active')
}

export const getFavouriteListingsForUser = (state: AppState, userId: string): Listing[] => {
  const favouriteIds = new Set(
    state.favourites
      .filter((favourite) => favourite.userId === userId)
      .map((favourite) => favourite.listingId),
  )

  return sortNewest(
    state.listings.filter((listing) => {
      return favouriteIds.has(listing.id)
    }),
  )
}

export const isListingFavouriteForUser = (
  state: AppState,
  userId: string,
  listingId: string,
): boolean => {
  return state.favourites.some((favourite) => {
    return favourite.userId === userId && favourite.listingId === listingId
  })
}

export interface CategoryStatsRow {
  category: string
  count: number
  averagePrice: number
  totalValue: number
  color: string
}

export const getCategoryStats = (state: AppState): CategoryStatsRow[] => {
  return LISTING_CATEGORIES.map((category) => {
    const listings = state.listings.filter((listing) => listing.category === category)
    const totalValue = listings.reduce((sum, listing) => sum + listing.price, 0)

    return {
      category,
      count: listings.length,
      averagePrice: Math.round(totalValue / Math.max(listings.length, 1)),
      totalValue,
      color: CATEGORY_CHART_COLORS[category],
    }
  })
}

export interface TopSellerRow {
  rank: number
  seller: User
  listingCount: number
  rating: number
}

const computeTopSellerRating = (listingCount: number): number => {
  const base = 4.2
  const listingBonus = Math.min(listingCount, 10) * 0.12
  const score = Math.min(5, base + listingBonus)
  return Number(score.toFixed(1))
}

export const getTopSellers = (state: AppState, limit = 5): TopSellerRow[] => {
  const listingsBySeller = new Map<string, number>()

  state.listings.forEach((listing) => {
    const current = listingsBySeller.get(listing.sellerId) ?? 0
    listingsBySeller.set(listing.sellerId, current + 1)
  })

  const rows = state.users
    .map((user) => {
      return {
        seller: user,
        listingCount: listingsBySeller.get(user.id) ?? 0,
      }
    })
    .filter((row) => row.listingCount > 0)
    .sort((first, second) => {
      if (second.listingCount !== first.listingCount) {
        return second.listingCount - first.listingCount
      }

      return first.seller.username.localeCompare(second.seller.username)
    })
    .slice(0, limit)

  return rows.map((row, index) => {
    return {
      rank: index + 1,
      seller: row.seller,
      listingCount: row.listingCount,
      rating: computeTopSellerRating(row.listingCount),
    }
  })
}

export interface PriceBucket {
  range: string
  count: number
}

export const getPriceBuckets = (state: AppState): PriceBucket[] => {
  const ranges = [
    { min: 0, max: 200, label: '0-200' },
    { min: 201, max: 500, label: '201-500' },
    { min: 501, max: 1000, label: '501-1000' },
    { min: 1001, max: 3000, label: '1001-3000' },
    { min: 3001, max: Number.POSITIVE_INFINITY, label: '3000+' },
  ]

  return ranges.map((range) => {
    const count = state.listings.filter((listing) => {
      return listing.price >= range.min && listing.price <= range.max
    }).length

    return {
      range: range.label,
      count,
    }
  })
}

export const getConversationPartner = (
  state: AppState,
  conversationId: string,
  currentUserId: string,
): User | undefined => {
  const conversation = state.conversations.find((row) => row.id === conversationId)
  if (!conversation) {
    return undefined
  }

  const partnerId = conversation.participantIds.find((id) => id !== currentUserId)
  if (!partnerId) {
    return undefined
  }

  return getUserById(state, partnerId)
}

export const getMessagesByConversation = (state: AppState, conversationId: string) => {
  const map = new Map<string, Message>()

  state.messages.forEach((message) => {
    if (message.conversationId === conversationId) {
      map.set(message.id, message)
    }
  })

  return [...map.values()]
    .sort((first, second) => {
      return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
    })
}

export const getConversationsForUser = (state: AppState, userId: string) => {
  return [...state.conversations]
    .filter((conversation) => conversation.participantIds.includes(userId))
    .sort((first, second) => {
      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    })
}
