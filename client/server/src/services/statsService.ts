import type { CategoryStatsRow, TopSellerRow } from '../../../src/app/store/selectors'
import type { MemoryStore } from '../storage/memoryStore'

export interface StatsSummary {
  totalUsers: number
  totalListings: number
  activeListings: number
  soldListings: number
  totalFavourites: number
  totalListingValue: number
  averageListingPrice: number
}

export interface FavouriteStatsListingRow {
  listingId: string
  title: string
  category: string
  status: string
  price: number
  count: number
}

export interface FavouriteStatsUserRow {
  userId: string
  username: string
  count: number
}

export interface FavouriteStats {
  totalFavourites: number
  byListing: FavouriteStatsListingRow[]
  byUser: FavouriteStatsUserRow[]
}

export interface ReviewStatsListingRow {
  listingId: string
  title: string
  count: number
  averageRating: number
}

export interface ReviewStatsUserRow {
  userId: string
  username: string
  count: number
  averageRating: number
}

export interface ReviewStats {
  totalReviews: number
  averageRating: number
  byListing: ReviewStatsListingRow[]
  byUser: ReviewStatsUserRow[]
}

export interface StatsService {
  summary: () => Promise<StatsSummary>
  categories: () => Promise<CategoryStatsRow[]>
  sellers: (limit?: number) => Promise<TopSellerRow[]>
  favourites: () => Promise<FavouriteStats>
  reviews: () => Promise<ReviewStats>
}

const computeTopSellerRating = (listingCount: number): number => {
  const base = 4.2
  const listingBonus = Math.min(listingCount, 10) * 0.12
  const score = Math.min(5, base + listingBonus)
  return Number(score.toFixed(1))
}

export const createStatsService = (store: MemoryStore): StatsService => {
  return {
    summary: async () => {
      const totalUsers = store.state.users.length
      const totalListings = store.state.listings.length
      const activeListings = store.state.listings.filter((l) => l.status === 'Active').length
      const totalFavourites = store.state.favourites.length
      const totalListingValue = store.state.listings.reduce((sum, l) => sum + l.price, 0)

      const soldListings = totalListings - activeListings

      return {
        totalUsers,
        totalListings,
        activeListings,
        soldListings,
        totalFavourites,
        totalListingValue,
        averageListingPrice: totalListings === 0 ? 0 : Math.round(totalListingValue / totalListings),
      }
    },
    categories: async () => {
      const categoryMap = new Map<string, { count: number; sumPrice: number }>()

      for (const listing of store.state.listings) {
        const val = categoryMap.get(listing.category) ?? { count: 0, sumPrice: 0 }
        val.count += 1
        val.sumPrice += listing.price
        categoryMap.set(listing.category, val)
      }

      return Array.from(categoryMap.entries()).map(([category, val]) => ({
        category,
        count: val.count,
        averagePrice: Math.round(val.sumPrice / val.count),
        totalValue: val.sumPrice,
        color: '#C0392B',
      }))
    },
    sellers: async (limit = 5) => {
      const countsMap = new Map<string, number>()

      for (const listing of store.state.listings) {
        const currentCount = countsMap.get(listing.sellerId) ?? 0
        countsMap.set(listing.sellerId, currentCount + 1)
      }

      const sortedSellers = Array.from(countsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)

      return sortedSellers.map(([sellerId, listingCount], index) => {
        const seller = store.state.users.find((user) => user.id === sellerId)
        if (!seller) {
          throw new Error('Seller not found')
        }

        return {
          rank: index + 1,
          seller: {
            id: seller.id,
            username: seller.username,
            email: seller.email,
            passwordHash: seller.passwordHash,
            avatarUrl: seller.avatarUrl,
            createdAt: seller.createdAt,
          },
          listingCount,
          rating: computeTopSellerRating(listingCount),
        }
      })
    },
    favourites: async () => {
      const byListingMap = new Map<string, FavouriteStatsListingRow & { datePosted: string }>()
      const byUserMap = new Map<string, FavouriteStatsUserRow>()

      for (const favourite of store.state.favourites) {
        const listing = store.state.listings.find((l) => l.id === favourite.listingId)
        if (listing) {
          const listingRow = byListingMap.get(favourite.listingId)
          if (listingRow) {
            listingRow.count += 1
          } else {
            byListingMap.set(favourite.listingId, {
              listingId: favourite.listingId,
              title: listing.title,
              category: listing.category,
              status: listing.status,
              price: listing.price,
              count: 1,
              datePosted: listing.datePosted,
            })
          }
        }

        const user = store.state.users.find((u) => u.id === favourite.userId)
        if (user) {
          const userRow = byUserMap.get(favourite.userId)
          if (userRow) {
            userRow.count += 1
          } else {
            byUserMap.set(favourite.userId, {
              userId: favourite.userId,
              username: user.username,
              count: 1,
            })
          }
        }
      }

      const byListing = [...byListingMap.values()]
        .sort((first, second) => {
          if (second.count !== first.count) {
            return second.count - first.count
          }
          return new Date(second.datePosted).getTime() - new Date(first.datePosted).getTime()
        })
        .map(({ datePosted: _datePosted, ...row }) => row)

      const byUser = [...byUserMap.values()].sort((first, second) => {
        if (second.count !== first.count) {
          return second.count - first.count
        }
        return first.username.localeCompare(second.username)
      })

      return {
        totalFavourites: store.state.favourites.length,
        byListing,
        byUser,
      }
    },
    reviews: async () => {
      const totalReviews = store.state.reviews.length
      const averageRating =
        totalReviews === 0
          ? 0
          : Number(
              (
                store.state.reviews.reduce((sum, review) => sum + review.rating, 0) /
                totalReviews
              ).toFixed(1),
            )

      const byListingMap = new Map<string, { listingId: string; title: string; total: number; sum: number }>()
      const byUserMap = new Map<string, { userId: string; username: string; total: number; sum: number }>()

      for (const review of store.state.reviews) {
        const listing = store.state.listings.find((l) => l.id === review.listingId)
        if (listing) {
          const listingEntry = byListingMap.get(review.listingId) ?? {
            listingId: review.listingId,
            title: listing.title,
            total: 0,
            sum: 0,
          }
          listingEntry.total += 1
          listingEntry.sum += review.rating
          byListingMap.set(review.listingId, listingEntry)
        }

        const user = store.state.users.find((u) => u.id === review.userId)
        if (user) {
          const userEntry = byUserMap.get(review.userId) ?? {
            userId: review.userId,
            username: user.username,
            total: 0,
            sum: 0,
          }
          userEntry.total += 1
          userEntry.sum += review.rating
          byUserMap.set(review.userId, userEntry)
        }
      }

      return {
        totalReviews,
        averageRating,
        byListing: [...byListingMap.values()].map((entry) => ({
          listingId: entry.listingId,
          title: entry.title,
          count: entry.total,
          averageRating: entry.total === 0 ? 0 : Number((entry.sum / entry.total).toFixed(1)),
        })),
        byUser: [...byUserMap.values()].map((entry) => ({
          userId: entry.userId,
          username: entry.username,
          count: entry.total,
          averageRating: entry.total === 0 ? 0 : Number((entry.sum / entry.total).toFixed(1)),
        })),
      }
    },
  }
}
