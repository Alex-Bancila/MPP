import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTestApp, parseJson } from '../../test/testUtils'

describe('reviews routes', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  beforeEach(async () => {
    app = await createTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('lists reviews for a listing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query ReviewsForListing($listingId: ID!) {
          reviewsForListing(listingId: $listingId) {
            totalItems
            items { id }
          }
        }`,
        variables: { listingId: 'listing_1' },
      },
    })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{
      data: { reviewsForListing: { totalItems: number; items: Array<{ id: string }> } }
    }>(response.payload)
    expect(body.data.reviewsForListing.totalItems).toBe(2)
    expect(body.data.reviewsForListing.items).toHaveLength(2)
  })

  it('creates, updates, and deletes a review', async () => {
    const createdResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation CreateReview($listingId: ID!, $userId: ID!, $rating: Int!, $title: String!, $body: String!) {
          createReview(listingId: $listingId, userId: $userId, rating: $rating, title: $title, body: $body) {
            id
          }
        }`,
        variables: {
          listingId: 'listing_1',
          userId: 'user_1',
          rating: 5,
          title: 'Crushing tone',
          body: 'Absolutely killer low end response.',
        },
      },
    })

    expect(createdResponse.statusCode).toBe(200)

    const created = parseJson<{ data: { createReview: { id: string } } }>(createdResponse.payload)

    const updateResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation UpdateReview($reviewId: ID!, $title: String) {
          updateReview(reviewId: $reviewId, title: $title) {
            title
          }
        }`,
        variables: {
          reviewId: created.data.createReview.id,
          title: 'Updated title',
        },
      },
    })

    expect(updateResponse.statusCode).toBe(200)

    const updated = parseJson<{ data: { updateReview: { title: string } } }>(updateResponse.payload)
    expect(updated.data.updateReview.title).toBe('Updated title')

    const deleteResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation DeleteReview($reviewId: ID!) {
          deleteReview(reviewId: $reviewId)
        }`,
        variables: { reviewId: created.data.createReview.id },
      },
    })

    expect(deleteResponse.statusCode).toBe(200)

    const deleted = parseJson<{ data: { deleteReview: boolean } }>(deleteResponse.payload)
    expect(deleted.data.deleteReview).toBe(true)
  })
})
