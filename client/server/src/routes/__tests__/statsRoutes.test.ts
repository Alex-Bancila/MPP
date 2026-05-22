import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTestApp, parseJson } from '../../test/testUtils'

describe('stats routes', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  beforeEach(async () => {
    app = await createTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns summary statistics', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query SummaryStats {
          stats {
            totalUsers
            totalListings
            soldListings
            totalFavourites
          }
        }`,
      },
    })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{ data: { stats: { totalUsers: number; totalListings: number; soldListings: number; totalFavourites: number } } }>(
      response.payload,
    )

    expect(body.data.stats.totalUsers).toBe(3)
    expect(body.data.stats.totalListings).toBe(46)
    expect(body.data.stats.soldListings).toBe(9)
    expect(body.data.stats.totalFavourites).toBe(2)
  })

  it('returns category and seller stats', async () => {
    const categoriesResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query CategoryStats {
          categoriesStats {
            category
            count
          }
        }`,
      },
    })

    expect(categoriesResponse.statusCode).toBe(200)

    const categories = parseJson<{ data: { categoriesStats: Array<{ category: string; count: number }> } }>(
      categoriesResponse.payload,
    )

    expect(categories.data.categoriesStats).toHaveLength(5)

    const sellersResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query SellerStats($limit: Int) {
          sellersStats(limit: $limit) {
            rank
            seller { username }
          }
        }`,
        variables: { limit: 2 },
      },
    })

    expect(sellersResponse.statusCode).toBe(200)

    const sellers = parseJson<{ data: { sellersStats: Array<{ seller: { username: string } }> } }>(
      sellersResponse.payload,
    )

    expect(sellers.data.sellersStats).toHaveLength(2)
    expect(sellers.data.sellersStats[0].seller.username).toBe('maya_blastbeat')
  })

  it('returns favourite stats', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query FavouriteStats {
          favouriteStats {
            totalFavourites
            byListing { listingId count }
            byUser { userId count }
          }
        }`,
      },
    })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{
      data: {
        favouriteStats: {
          totalFavourites: number
          byListing: Array<{ listingId: string; count: number }>
          byUser: Array<{ userId: string; count: number }>
        }
      }
    }>(response.payload)

    expect(body.data.favouriteStats.totalFavourites).toBe(2)
    expect(body.data.favouriteStats.byListing.map((row) => row.listingId)).toEqual([
      'listing_1',
      'listing_3',
    ])
    expect(body.data.favouriteStats.byUser[0].userId).toBe('user_1')
  })
})
