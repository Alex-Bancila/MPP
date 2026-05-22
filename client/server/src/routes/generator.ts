import type { FastifyInstance } from 'fastify'
import { faker } from '@faker-js/faker'

import type { ServerHub } from '../transport/serverHub'
import type { ListingsService } from '../services/listingsService'
import type { UsersService } from '../services/usersService'
import type { MemoryStore } from '../storage/memoryStore'
import { parseInput } from '../lib/http'
import { generatorStartSchema } from '../schemas'

export interface GeneratorRouteDeps {
  store: MemoryStore
  hub: ServerHub
  listingsService: ListingsService
  usersService: UsersService
}

let intervalHandle: ReturnType<typeof setInterval> | null = null

const generateListing = async (store: MemoryStore, listingsService: ListingsService) => {
  const seller = store.state.users[Math.floor(Math.random() * store.state.users.length)]
  const categories = ['Listening', 'Creating', 'Electrify Your Sound', 'Learning', 'Accessories'] as const
  const category = categories[Math.floor(Math.random() * categories.length)]

  return listingsService.create({
    title: faker.commerce.productName(),
    description: faker.lorem.sentences({ min: 2, max: 4 }),
    price: faker.number.int({ min: 50, max: 5000 }),
    category,
    photos: [faker.image.urlLoremFlickr({ category: 'music' })],
    sellerId: seller.id,
    status: faker.datatype.boolean() ? 'Active' : 'Sold',
  })
}

const generateReview = (store: MemoryStore) => {
  const listing = store.state.listings[Math.floor(Math.random() * store.state.listings.length)]
  const user = store.state.users[Math.floor(Math.random() * store.state.users.length)]
  const review = {
    id: `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    listingId: listing.id,
    userId: user.id,
    rating: faker.number.int({ min: 1, max: 5 }),
    title: faker.commerce.productAdjective(),
    body: faker.lorem.sentence(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  store.state.reviews = [review, ...store.state.reviews]
  return review
}

export interface GeneratorStartInput {
  batchSize?: number
  intervalMs?: number
  entityType?: 'listings' | 'reviews' | 'mixed'
}

export interface GeneratorStatus {
  running: boolean
  batchSize?: number
  intervalMs?: number
  entityType?: 'listings' | 'reviews' | 'mixed'
}

export const createGeneratorController = (deps: GeneratorRouteDeps) => {
  const start = (input: GeneratorStartInput): GeneratorStatus => {
    const parsed = generatorStartSchema.safeParse(input)
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    if (intervalHandle) {
      clearInterval(intervalHandle)
    }

    deps.store.state.sync = {
      ...deps.store.state.sync,
      mode: 'syncing',
      serverReachable: true,
    }
    deps.hub.broadcast({ sync: deps.store.state.sync })

    intervalHandle = setInterval(() => {
      const listings: Awaited<ReturnType<typeof generateListing>>[] = []
      const reviews: Array<ReturnType<typeof generateReview>> = []

      void (async () => {
        for (let index = 0; index < parsed.data.batchSize; index += 1) {
          if (parsed.data.entityType !== 'reviews') {
            listings.push(await generateListing(deps.store, deps.listingsService))
          }

          if (parsed.data.entityType !== 'listings') {
            reviews.push(generateReview(deps.store))
          }
        }

        deps.store.state.sync = {
          ...deps.store.state.sync,
          lastSyncedAt: new Date().toISOString(),
          mode: 'online',
        }

        deps.hub.broadcast({
          listings: listings.length > 0 ? listings : undefined,
          reviews: reviews.length > 0 ? reviews : undefined,
          sync: deps.store.state.sync,
        })
      })()
    }, parsed.data.intervalMs)

    return { running: true, ...parsed.data }
  }

  const stop = (): GeneratorStatus => {
    if (intervalHandle) {
      clearInterval(intervalHandle)
      intervalHandle = null
    }

    deps.store.state.sync = {
      ...deps.store.state.sync,
      mode: 'online',
    }
    deps.hub.broadcast({ sync: deps.store.state.sync })

    return { running: false }
  }

  return { start, stop }
}

export const registerGeneratorRoutes = (app: FastifyInstance, deps: GeneratorRouteDeps): void => {
  const controller = createGeneratorController(deps)

  app.post('/admin/generate/start', async (request, reply) => {
    const parsed = parseInput(reply, generatorStartSchema, request.body)
    if (!parsed) {
      return
    }

    return reply.send(controller.start(parsed))
  })

  app.post('/admin/generate/stop', async () => {
    return controller.stop()
  })
}
