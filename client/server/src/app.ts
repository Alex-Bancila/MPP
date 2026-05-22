import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import Fastify from 'fastify'

import { createMemoryStore, type MemoryStore } from './storage/memoryStore'
import { createServices } from './services/factory'
import { registerGraphQLRoutes } from './routes/graphql'
import { registerAuthRoutes } from './routes/auth'
import { registerWebsocketRoutes } from './routes/ws'
import { registerHealthRoutes } from './routes/health'
import { registerListingsRoutes } from './routes/listings'
import { registerStatsRoutes } from './routes/stats'
import { registerReviewsRoutes } from './routes/reviews'
import { registerFavouritesRoutes } from './routes/favourites'
import { registerGeneratorRoutes } from './routes/generator'
import type { ServerHub } from './transport/serverHub'
import { createServerHub } from './transport/serverHub'

export interface BuildAppResult {
  app: ReturnType<typeof Fastify>
  store: MemoryStore
  hub: ServerHub
}

export const buildApp = async (): Promise<BuildAppResult> => {
  const app = Fastify({
    logger: false,
  })

  await app.register(cors, {
    origin: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  await app.register(websocket, {
    options: {
      maxPayload: 1048576,
    },
  })

  const store = createMemoryStore()
  const hub = createServerHub()

  console.log(`[Server] RAM-only store initialized: ${store.state.users.length} users, ${store.state.listings.length} listings, ${store.state.reviews.length} reviews`)

  const {
    authService,
    auditService,
    chatService,
    rolesService,
    usersService,
    listingsService,
    favouritesService,
    reviewsService,
    statsService,
  } = createServices(store)

  registerGraphQLRoutes(app, {
    store,
    hub,
    authService,
    auditService,
    chatService,
    rolesService,
    usersService,
    listingsService,
    favouritesService,
    reviewsService,
    statsService,
  })
  registerAuthRoutes(app, { authService, hub, store })
  registerWebsocketRoutes(app, { hub, store, chatService })
  registerHealthRoutes(app)

  const routeDeps = {
    store,
    hub,
    authService,
    usersService,
    listingsService,
    favouritesService,
    reviewsService,
    statsService,
  }

  registerListingsRoutes(app, routeDeps)
  registerStatsRoutes(app, { statsService: routeDeps.statsService })
  registerReviewsRoutes(app, routeDeps)
  registerFavouritesRoutes(app, routeDeps)
  registerGeneratorRoutes(app, routeDeps)

  app.setNotFoundHandler(async (_request, reply) => {
    reply.code(404).send({
      error: 'Route not found',
    })
  })

  app.setErrorHandler(async (error, _request, reply) => {
    if (reply.sent) {
      return
    }

    app.log.error(error)
    reply.code(500).send({
      error: 'Internal server error',
    })
  })

  return {
    app,
    store,
    hub,
  }
}