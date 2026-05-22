import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTestApp, parseJson } from '../../test/testUtils'

describe('favourites routes', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  beforeEach(async () => {
    app = await createTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('lists a users favourite listings', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query FavouriteListings($userId: ID!) {
          favouritesForUser(userId: $userId) {
            totalItems
            items { listing { id } }
          }
        }`,
        variables: { userId: 'user_1' },
      },
    })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{
      data: { favouritesForUser: { totalItems: number; items: Array<{ listing: { id: string } }> } }
    }>(response.payload)

    expect(body.data.favouritesForUser.totalItems).toBe(2)
    expect(body.data.favouritesForUser.items.map((row) => row.listing.id)).toEqual([
      'listing_1',
      'listing_3',
    ])
  })

  it('adds and removes favourites', async () => {
    const addResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation AddFavourite($userId: ID!, $listingId: ID!) {
          toggleFavourite(userId: $userId, listingId: $listingId)
        }`,
        variables: { userId: 'user_1', listingId: 'listing_2' },
      },
    })

    expect(addResponse.statusCode).toBe(200)

    const addBody = parseJson<{ data: { toggleFavourite: boolean } }>(addResponse.payload)
    expect(addBody.data.toggleFavourite).toBe(true)

    const currentResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query FavouriteListings($userId: ID!) {
          favouritesForUser(userId: $userId) {
            totalItems
          }
        }`,
        variables: { userId: 'user_1' },
      },
    })

    const current = parseJson<{ data: { favouritesForUser: { totalItems: number } } }>(
      currentResponse.payload,
    )
    expect(current.data.favouritesForUser.totalItems).toBe(3)

    const deleteResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation RemoveFavourite($userId: ID!, $listingId: ID!) {
          removeFavourite(userId: $userId, listingId: $listingId)
        }`,
        variables: { userId: 'user_1', listingId: 'listing_2' },
      },
    })

    expect(deleteResponse.statusCode).toBe(200)

    const afterDeleteResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query FavouriteListings($userId: ID!) {
          favouritesForUser(userId: $userId) {
            totalItems
          }
        }`,
        variables: { userId: 'user_1' },
      },
    })

    const afterDelete = parseJson<{ data: { favouritesForUser: { totalItems: number } } }>(
      afterDeleteResponse.payload,
    )
    expect(afterDelete.data.favouritesForUser.totalItems).toBe(2)
  })

  it('cascades favourite removal when a listing is deleted', async () => {
    const deleteListingResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation DeleteListing($listingId: ID!) {
          deleteListing(listingId: $listingId)
        }`,
        variables: { listingId: 'listing_1' },
      },
    })

    expect(deleteListingResponse.statusCode).toBe(200)

    const favouritesResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query FavouriteListings($userId: ID!) {
          favouritesForUser(userId: $userId) {
            totalItems
          }
        }`,
        variables: { userId: 'user_1' },
      },
    })

    const favourites = parseJson<{ data: { favouritesForUser: { totalItems: number } } }>(
      favouritesResponse.payload,
    )
    expect(favourites.data.favouritesForUser.totalItems).toBe(1)
  })
})
