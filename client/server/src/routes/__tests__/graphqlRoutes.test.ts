import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTestApp, parseJson } from '../../test/testUtils'

describe('graphql routes', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  beforeEach(async () => {
    app = await createTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns health and listings', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query Listings($page: Int, $pageSize: Int) {
          health { ok postgres mongo }
          listings(page: $page, pageSize: $pageSize) {
            currentPage
            totalPages
            totalItems
            items { id title }
          }
        }`,
        variables: { page: 1, pageSize: 2 },
      },
    })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{
      data: { health: { ok: boolean; postgres: boolean; mongo: boolean }; listings: { items: Array<{ id: string }> } }
    }>(response.payload)
    expect(body.data.health.ok).toBe(true)
    expect(body.data.listings.items).toHaveLength(2)
  })

  it('creates a review via mutation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation CreateReview($listingId: ID!, $userId: ID!, $rating: Int!, $title: String!, $body: String!) {
          createReview(listingId: $listingId, userId: $userId, rating: $rating, title: $title, body: $body) {
            id
            title
            rating
          }
        }`,
        variables: {
          listingId: 'listing_1',
          userId: 'user_1',
          rating: 4,
          title: 'GraphQL review',
          body: 'Good response and nice sustain.',
        },
      },
    })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{ data: { createReview: { id: string; title: string } } }>(response.payload)
    expect(body.data.createReview.title).toBe('GraphQL review')
  })
})
