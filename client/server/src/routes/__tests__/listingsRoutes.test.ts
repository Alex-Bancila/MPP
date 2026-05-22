import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTestApp, parseJson } from '../../test/testUtils'

describe('listings routes', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  beforeEach(async () => {
    app = await createTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns paginated listings with filters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query Listings($page: Int, $pageSize: Int) {
          listings(page: $page, pageSize: $pageSize) {
            currentPage
            totalPages
            totalItems
            items { id title }
          }
        }`,
        variables: { page: 2, pageSize: 2 },
      },
    })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{
      data: {
        listings: {
          items: Array<{ id: string; title: string }>
          currentPage: number
          totalPages: number
          totalItems: number
        }
      }
    }>(response.payload)

    expect(body.data.listings.currentPage).toBe(2)
    expect(body.data.listings.totalItems).toBe(46)
    expect(body.data.listings.items).toHaveLength(2)
    expect(body.data.listings.items[0].id).toBe('listing_8')
  })

  it('returns a listing by id', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query ListingById($listingId: ID!) {
          listingById(listingId: $listingId) {
            id
            title
          }
        }`,
        variables: { listingId: 'listing_1' },
      },
    })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{ data: { listingById: { id: string; title: string } } }>(response.payload)
    expect(body.data.listingById.id).toBe('listing_1')
    expect(body.data.listingById.title).toContain('ESP LTD')
  })

  it('creates, updates, and deletes a listing', async () => {
    const createdResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation CreateListing($title: String!, $description: String!, $price: Int!, $category: String!, $photos: [String!]!, $sellerId: ID!) {
          createListing(title: $title, description: $description, price: $price, category: $category, photos: $photos, sellerId: $sellerId) {
            id
            status
            title
          }
        }`,
        variables: {
          title: 'Server Side Test Listing',
          description: 'A listing created through the REST API for backend verification.',
          price: 750,
          category: 'Accessories',
          photos: ['https://picsum.photos/seed/server-test/1200/900'],
          sellerId: 'user_1',
        },
      },
    })

    expect(createdResponse.statusCode).toBe(200)

    const created = parseJson<{ data: { createListing: { id: string; status: string; title: string } } }>(
      createdResponse.payload,
    )
    expect(created.data.createListing.title).toBe('Server Side Test Listing')
    expect(created.data.createListing.status).toBe('Active')

    const updatedResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation UpdateListing($listingId: ID!, $status: String, $price: Int) {
          updateListing(listingId: $listingId, status: $status, price: $price) {
            status
            price
          }
        }`,
        variables: {
          listingId: created.data.createListing.id,
          status: 'Sold',
          price: 800,
        },
      },
    })

    expect(updatedResponse.statusCode).toBe(200)

    const updated = parseJson<{ data: { updateListing: { price: number; status: string } } }>(
      updatedResponse.payload,
    )
    expect(updated.data.updateListing.price).toBe(800)
    expect(updated.data.updateListing.status).toBe('Sold')

    const deleteResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation DeleteListing($listingId: ID!) {
          deleteListing(listingId: $listingId)
        }`,
        variables: { listingId: created.data.createListing.id },
      },
    })

    expect(deleteResponse.statusCode).toBe(200)

    const deleted = parseJson<{ data: { deleteListing: boolean } }>(deleteResponse.payload)
    expect(deleted.data.deleteListing).toBe(true)
  })

  it('rejects invalid listing payloads', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation CreateListing($title: String!, $description: String!, $price: Int!, $category: String!, $photos: [String!]!, $sellerId: ID!) {
          createListing(title: $title, description: $description, price: $price, category: $category, photos: $photos, sellerId: $sellerId) {
            id
          }
        }`,
        variables: {
          title: 'bad',
          description: 'too short',
          price: -10,
          category: 'Accessories',
          photos: [],
          sellerId: 'user_1',
        },
      },
    })

    expect(response.statusCode).toBe(400)
    const body = parseJson<{ errors: string[] }>(response.payload)
    expect(body.errors[0]).toBe('Validation failed')
  })

  it('rejects invalid pagination input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `query Listings($page: Int, $pageSize: Int) {
          listings(page: $page, pageSize: $pageSize) {
            currentPage
          }
        }`,
        variables: { page: 0, pageSize: 100 },
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
