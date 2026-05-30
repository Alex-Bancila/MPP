import type { FastifyInstance } from 'fastify'

import type { ListingsService } from '../services/listingsService'
import type { UsersService } from '../services/usersService'
import { addListingToStore, removeListingFromStore, updateListingInStore } from '../db/storeUpdates'
import { parseInput, sendNotFound } from '../lib/http'
import { requirePermission } from '../lib/auth'
import {
  createListingSchema,
  listingParamsSchema,
  listingQuerySchema,
  updateListingSchema,
} from '../schemas'

export interface ListingsRouteDeps {
  listingsService: ListingsService
  usersService: UsersService
  store: import('../storage/memoryStore').MemoryStore
  hub: import('../transport/serverHub').ServerHub
}

export const registerListingsRoutes = (
  app: FastifyInstance,
  deps: ListingsRouteDeps,
): void => {
  app.get('/listings', async (request, reply) => {
    const parsed = parseInput(reply, listingQuerySchema, request.query)
    if (!parsed) {
      return
    }

    const result = await deps.listingsService.list(parsed)

    return reply.send({
      items: result.rows,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      pageSize: parsed.pageSize,
    })
  })

  app.get('/listings/:listingId', async (request, reply) => {
    const parsed = parseInput(reply, listingParamsSchema, request.params)
    if (!parsed) {
      return
    }

    const listing = await deps.listingsService.getById(parsed.listingId)
    if (!listing) {
      sendNotFound(reply, 'Listing')
      return
    }

    return reply.send(listing)
  })

  app.post('/listings', async (request, reply) => {
    const auth = await requirePermission(request, reply, 'listing:create')
    if (!auth) return
    const parsed = parseInput(reply, createListingSchema, request.body)
    if (!parsed) {
      return
    }

    if (auth.sub !== parsed.sellerId && auth.role !== 'admin') {
      return reply.code(403).send({ message: 'You can only create listings on your own behalf.' })
    }

    const seller = await deps.usersService.getById(parsed.sellerId)
    if (!seller) {
      sendNotFound(reply, 'Seller')
      return
    }

    const listing = await deps.listingsService.create(parsed)
    addListingToStore(deps.store, listing)
    deps.hub.broadcast({ listings: [listing], sync: deps.store.state.sync })
    return reply.code(201).send(listing)
  })

  app.patch('/listings/:listingId', async (request, reply) => {
    const auth = await requirePermission(request, reply, 'listing:update')
    if (!auth) return
    const params = parseInput(reply, listingParamsSchema, request.params)
    if (!params) {
      return
    }

    const existing = await deps.listingsService.getById(params.listingId)
    if (!existing) {
      sendNotFound(reply, 'Listing')
      return
    }

    if (auth.sub !== existing.sellerId && auth.role !== 'admin') {
      return reply.code(403).send({ message: 'You can only edit your own listings.' })
    }

    const body = parseInput(reply, updateListingSchema, request.body)
    if (!body) {
      return
    }

    const updated = await deps.listingsService.update(params.listingId, body)
    if (!updated) {
      sendNotFound(reply, 'Listing')
      return
    }

    updateListingInStore(deps.store, updated)
    deps.hub.broadcast({ listings: [updated], sync: deps.store.state.sync })
    return reply.send(updated)
  })

  app.delete('/listings/:listingId', async (request, reply) => {
    const auth = await requirePermission(request, reply, 'listing:delete')
    if (!auth) return
    const parsed = parseInput(reply, listingParamsSchema, request.params)
    if (!parsed) {
      return
    }

    const existing = await deps.listingsService.getById(parsed.listingId)
    if (!existing) {
      sendNotFound(reply, 'Listing')
      return
    }

    if (auth.sub !== existing.sellerId && auth.role !== 'admin') {
      return reply.code(403).send({ message: 'You can only delete your own listings.' })
    }

    const deleted = await deps.listingsService.delete(parsed.listingId)
    if (!deleted) {
      sendNotFound(reply, 'Listing')
      return
    }

    removeListingFromStore(deps.store, parsed.listingId)
    deps.hub.broadcast({ removedListingIds: [parsed.listingId], sync: deps.store.state.sync })

    return reply.send({
      deleted: true,
      listingId: parsed.listingId,
    })
  })
}
