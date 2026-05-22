import type { FastifyInstance } from 'fastify'

import type { ServerHub } from '../transport/serverHub'
import type { ListingsService } from '../services/listingsService'
import type { ReviewsService } from '../services/reviewsService'
import type { UsersService } from '../services/usersService'
import type { MemoryStore } from '../storage/memoryStore'
import { addReviewToStore, removeReviewFromStore, updateReviewInStore } from '../db/storeUpdates'
import { parseInput, sendNotFound } from '../lib/http'
import { listingReviewParamsSchema, reviewBodySchema, reviewParamsSchema, reviewUpdateSchema } from '../schemas'

export interface ReviewsRouteDeps {
  store: MemoryStore
  hub: ServerHub
  usersService: UsersService
  listingsService: ListingsService
  reviewsService: ReviewsService
}

export const registerReviewsRoutes = (app: FastifyInstance, deps: ReviewsRouteDeps): void => {
  app.get('/listings/:listingId/reviews', async (request, reply) => {
    const params = parseInput(reply, listingReviewParamsSchema, request.params)
    if (!params) {
      return
    }

    const listing = await deps.listingsService.getById(params.listingId)
    if (!listing) {
      sendNotFound(reply, 'Listing')
      return
    }

    return reply.send({
      items: await deps.reviewsService.listForListing(params.listingId),
      totalItems: await deps.reviewsService.countForListing(params.listingId),
    })
  })

  app.post('/listings/:listingId/reviews', async (request, reply) => {
    const params = parseInput(reply, listingReviewParamsSchema, request.params)
    if (!params) {
      return
    }

    const body = parseInput(reply, reviewBodySchema, request.body)
    if (!body || body.listingId !== params.listingId) {
      reply.code(400).send({ error: 'Validation failed', details: { body: ['listingId mismatch'] } })
      return
    }

    if (!(await deps.usersService.exists(body.userId))) {
      sendNotFound(reply, 'User')
      return
    }

    const listing = await deps.listingsService.getById(params.listingId)
    if (!listing) {
      sendNotFound(reply, 'Listing')
      return
    }

    const review = await deps.reviewsService.create(body)
    addReviewToStore(deps.store, review)
    deps.hub.broadcast({ reviews: [review], sync: deps.store.state.sync })

    return reply.code(201).send(review)
  })

  app.patch('/reviews/:reviewId', async (request, reply) => {
    const params = parseInput(reply, reviewParamsSchema, request.params)
    if (!params) {
      return
    }

    const body = parseInput(reply, reviewUpdateSchema, request.body)
    if (!body) {
      return
    }

    const review = await deps.reviewsService.update(params.reviewId, body)
    if (!review) {
      sendNotFound(reply, 'Review')
      return
    }

    updateReviewInStore(deps.store, review)
    deps.hub.broadcast({ reviews: [review], sync: deps.store.state.sync })
    return reply.send(review)
  })

  app.delete('/reviews/:reviewId', async (request, reply) => {
    const params = parseInput(reply, reviewParamsSchema, request.params)
    if (!params) {
      return
    }

    const review = await deps.reviewsService.getById(params.reviewId)
    if (!review) {
      sendNotFound(reply, 'Review')
      return
    }

    const removed = await deps.reviewsService.delete(params.reviewId)
    if (!removed) {
      sendNotFound(reply, 'Review')
      return
    }

    removeReviewFromStore(deps.store, params.reviewId)
    deps.hub.broadcast({ removedReviewIds: [params.reviewId], sync: deps.store.state.sync })
    return reply.send({ removed: true, reviewId: params.reviewId })
  })
}
