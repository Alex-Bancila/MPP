import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTestApp, parseJson } from '../../test/testUtils'

describe('REST HTTP routes (Assignment 2 bronze)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  beforeEach(async () => {
    app = await createTestApp()
  })

  afterEach(async () => {
    await app.inject({ method: 'POST', url: '/admin/generate/stop' })
    await app.close()
  })

  it('GET /listings returns paginated listings', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/listings?page=2&pageSize=2',
    })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{
      currentPage: number
      totalPages: number
      totalItems: number
      items: Array<{ id: string; title: string }>
    }>(response.payload)

    expect(body.currentPage).toBe(2)
    expect(body.totalItems).toBe(46)
    expect(body.items).toHaveLength(2)
    expect(body.items[0].id).toBe('listing_8')
  })

  it('GET /listings/:listingId returns one listing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/listings/listing_1',
    })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{ id: string; title: string }>(response.payload)
    expect(body.id).toBe('listing_1')
    expect(body.title).toContain('ESP LTD')
  })

  it('POST/PATCH/DELETE /listings performs full CRUD', async () => {
    const createdResponse = await app.inject({
      method: 'POST',
      url: '/listings',
      payload: {
        title: 'REST HTTP Test Listing',
        description: 'A listing created through the REST API for backend verification.',
        price: 750,
        category: 'Accessories',
        photos: ['https://picsum.photos/seed/rest-http-test/1200/900'],
        sellerId: 'user_1',
      },
    })

    expect(createdResponse.statusCode).toBe(201)

    const created = parseJson<{ id: string; status: string; title: string }>(createdResponse.payload)
    expect(created.title).toBe('REST HTTP Test Listing')
    expect(created.status).toBe('Active')

    const updatedResponse = await app.inject({
      method: 'PATCH',
      url: `/listings/${created.id}`,
      payload: { status: 'Sold', price: 800 },
    })

    expect(updatedResponse.statusCode).toBe(200)

    const updated = parseJson<{ price: number; status: string }>(updatedResponse.payload)
    expect(updated.price).toBe(800)
    expect(updated.status).toBe('Sold')

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/listings/${created.id}`,
    })

    expect(deleteResponse.statusCode).toBe(200)

    const deleted = parseJson<{ deleted: boolean; listingId: string }>(deleteResponse.payload)
    expect(deleted.deleted).toBe(true)
    expect(deleted.listingId).toBe(created.id)
  })

  it('POST /listings rejects invalid payloads with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/listings',
      payload: {
        title: 'bad',
        description: 'too short',
        price: -10,
        category: 'Accessories',
        photos: [],
        sellerId: 'user_1',
      },
    })

    expect(response.statusCode).toBe(400)
    const body = parseJson<{ error: string }>(response.payload)
    expect(body.error).toBe('Validation failed')
  })

  it('GET /listings rejects invalid pagination with 400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/listings?page=0&pageSize=100',
    })

    expect(response.statusCode).toBe(400)
  })

  it('GET /stats/summary returns aggregate statistics', async () => {
    const response = await app.inject({ method: 'GET', url: '/stats/summary' })

    expect(response.statusCode).toBe(200)

    const body = parseJson<{ totalListings: number; totalUsers: number }>(response.payload)
    expect(body.totalListings).toBeGreaterThan(0)
    expect(body.totalUsers).toBeGreaterThan(0)
  })

  it('POST /admin/generate/start and /stop control the generator', async () => {
    const startResponse = await app.inject({
      method: 'POST',
      url: '/admin/generate/start',
      payload: {
        batchSize: 1,
        intervalMs: 500,
        entityType: 'listings',
      },
    })

    expect(startResponse.statusCode).toBe(200)

    const startBody = parseJson<{ running: boolean }>(startResponse.payload)
    expect(startBody.running).toBe(true)

    const stopResponse = await app.inject({
      method: 'POST',
      url: '/admin/generate/stop',
    })

    expect(stopResponse.statusCode).toBe(200)

    const stopBody = parseJson<{ running: boolean }>(stopResponse.payload)
    expect(stopBody.running).toBe(false)
  })
})
