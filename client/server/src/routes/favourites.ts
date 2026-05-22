import type { FastifyInstance } from 'fastify'

import type { FavouritesService } from '../services/favouritesService'
import type { ListingsService } from '../services/listingsService'
import type { UsersService } from '../services/usersService'
import { addFavouriteToStore, removeFavouriteFromStore } from '../db/storeUpdates'
import { parseInput, sendNotFound } from '../lib/http'
import {
  favouriteBodySchema,
  favouriteParamsSchema,
  favouriteQuerySchema,
} from '../schemas'

export interface FavouritesRouteDeps {
  favouritesService: FavouritesService
  listingsService: ListingsService
  usersService: UsersService
  store: import('../storage/memoryStore').MemoryStore
  hub: import('../transport/serverHub').ServerHub
}

export const registerFavouritesRoutes = (
  app: FastifyInstance,
  deps: FavouritesRouteDeps,
): void => {
  app.get('/favourites', async (request, reply) => {
    const parsed = parseInput(reply, favouriteQuerySchema, request.query)
    if (!parsed) {
      return
    }

    if (!(await deps.usersService.exists(parsed.userId))) {
      sendNotFound(reply, 'User')
      return
    }

    const items = await deps.favouritesService.listForUser(parsed.userId)
    return reply.send({
      userId: parsed.userId,
      totalItems: items.length,
      items,
    })
  })

  app.post('/favourites', async (request, reply) => {
    const parsed = parseInput(reply, favouriteBodySchema, request.body)
    if (!parsed) {
      return
    }

    if (!(await deps.usersService.exists(parsed.userId))) {
      sendNotFound(reply, 'User')
      return
    }

    const listing = await deps.listingsService.getById(parsed.listingId)
    if (!listing) {
      sendNotFound(reply, 'Listing')
      return
    }

    const result = await deps.favouritesService.add(parsed.userId, parsed.listingId)
    if (!result) {
      sendNotFound(reply, 'Favourite')
      return
    }

    addFavouriteToStore(deps.store, result.favourite)
    deps.hub.broadcast({ sync: deps.store.state.sync })

    return reply.code(result.created ? 201 : 200).send({
      userId: parsed.userId,
      listingId: parsed.listingId,
      created: result.created,
      createdAt: result.favourite.createdAt,
      listing: result.listing,
    })
  })

  app.delete('/favourites/:listingId', async (request, reply) => {
    const params = parseInput(reply, favouriteParamsSchema, request.params)
    if (!params) {
      return
    }

    const query = parseInput(reply, favouriteQuerySchema, request.query)
    if (!query) {
      return
    }

    if (!(await deps.usersService.exists(query.userId))) {
      sendNotFound(reply, 'User')
      return
    }

    const listing = await deps.listingsService.getById(params.listingId)
    if (!listing) {
      sendNotFound(reply, 'Listing')
      return
    }

    const removed = await deps.favouritesService.remove(query.userId, params.listingId)
    if (!removed) {
      sendNotFound(reply, 'Favourite')
      return
    }

    removeFavouriteFromStore(deps.store, query.userId, params.listingId)
    deps.hub.broadcast({ sync: deps.store.state.sync })

    return reply.send({
      removed: true,
      userId: query.userId,
      listingId: params.listingId,
    })
  })
}
