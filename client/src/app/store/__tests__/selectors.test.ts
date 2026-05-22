import { describe, expect, it } from 'vitest'

import {
  getActiveListingsByUser,
  getCategoryStats,
  getConversationPartner,
  getConversationsForUser,
  getFavouriteListingsForUser,
  getListingById,
  getListingsForQuery,
  getReviewById,
  getReviewsForListing,
  getReviewSummaryForListing,
  getMessagesByConversation,
  getPaginatedListings,
  getPriceBuckets,
  getTopSellers,
  getUserById,
  isListingFavouriteForUser,
} from '@/app/store/selectors'
import { initialAppState } from '@/shared/data/seed'

const createState = () => structuredClone(initialAppState)

describe('selectors', () => {
  it('filters listings by category and search term', () => {
    const state = createState()

    const rows = getListingsForQuery(state, {
      category: 'Listening',
      search: 'vinyl',
      status: 'All',
    })

    expect(rows).toHaveLength(9)
    expect(rows[0].id).toBe('listing_3')
  })

  it('paginates listing results safely', () => {
    const state = createState()

    const page1 = getPaginatedListings(state, {
      category: 'All',
      search: '',
      status: 'All',
      page: 1,
      pageSize: 2,
    })

    const page2 = getPaginatedListings(state, {
      category: 'All',
      search: '',
      status: 'All',
      page: 2,
      pageSize: 2,
    })

    expect(page1.rows).toHaveLength(2)
    expect(page2.rows).toHaveLength(2)
    expect(page1.totalPages).toBe(23)
    expect(page2.currentPage).toBe(2)
  })

  it('returns favourites for a user', () => {
    const state = createState()
    const favourites = getFavouriteListingsForUser(state, 'user_1')

    expect(favourites).toHaveLength(2)
    const favouriteIds = favourites.map((listing) => listing.id)
    expect(favouriteIds).toEqual(expect.arrayContaining(['listing_3', 'listing_1']))
  })

  it('computes category statistics', () => {
    const state = createState()
    const rows = getCategoryStats(state)
    const creating = rows.find((row) => row.category === 'Creating')

    expect(rows.length).toBeGreaterThanOrEqual(5)
    expect(creating?.count).toBe(10)
  })

  it('returns listing and user by id', () => {
    const state = createState()

    expect(getListingById(state, 'listing_1')?.title).toContain('ESP')
    expect(getUserById(state, 'user_1')?.username).toBe('alex_riffs')
  })

  it('returns active listings for a user', () => {
    const state = createState()
    const rows = getActiveListingsByUser(state, 'user_1')

    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows.every((row) => row.status === 'Active')).toBe(true)
  })

  it('checks favourite status for user/listing', () => {
    const state = createState()

    expect(isListingFavouriteForUser(state, 'user_1', 'listing_3')).toBe(true)
    expect(isListingFavouriteForUser(state, 'user_1', 'listing_2')).toBe(false)
  })

  it('computes price buckets', () => {
    const state = createState()
    const buckets = getPriceBuckets(state)

    expect(buckets).toHaveLength(5)
    expect(buckets.reduce((sum, row) => sum + row.count, 0)).toBe(state.listings.length)
  })

  it('returns top sellers ranking from listings', () => {
    const state = createState()
    const ranking = getTopSellers(state)

    expect(ranking.length).toBeGreaterThan(0)
    expect(ranking[0].rank).toBe(1)
    expect(ranking[0].listingCount).toBeGreaterThanOrEqual(ranking[ranking.length - 1].listingCount)
  })

  it('returns review helpers for listing', () => {
    const state = createState()

    const review = getReviewById(state, 'review_1')
    expect(review?.listingId).toBe('listing_1')

    const listingReviews = getReviewsForListing(state, 'listing_1')
    expect(listingReviews.length).toBeGreaterThan(0)

    const summary = getReviewSummaryForListing(state, 'listing_1')
    expect(summary.count).toBeGreaterThan(0)
    expect(summary.averageRating).toBeGreaterThan(0)
  })

  it('returns conversations and messages for a user', () => {
    const state = createState()
    const conversations = getConversationsForUser(state, 'user_1')

    expect(conversations).toHaveLength(1)

    const messages = getMessagesByConversation(state, conversations[0].id)
    expect(messages).toHaveLength(2)
  })

  it('returns conversation partner', () => {
    const state = createState()
    const partner = getConversationPartner(state, 'conv_1', 'user_1')
    expect(partner?.id).toBe('user_2')
  })

  it('returns undefined when conversation or partner is missing', () => {
    const state = createState()

    expect(getConversationPartner(state, 'missing', 'user_1')).toBeUndefined()

    const broken = {
      ...state,
      conversations: [
        {
          id: 'conv_missing',
          listingId: 'listing_1',
          participantIds: ['user_1', 'user_1'] as [string, string],
          createdAt: new Date().toISOString(),
        },
      ],
    }

    expect(getConversationPartner(broken, 'conv_missing', 'user_1')).toBeUndefined()
  })
})
