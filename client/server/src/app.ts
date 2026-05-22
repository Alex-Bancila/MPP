import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import Fastify from 'fastify'
import { readFileSync } from 'fs'
import { join } from 'path'

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
import { prisma } from './db/prisma'
import { syncStoreFromDb } from './db/snapshot'

export const JWT_SECRET = process.env.JWT_SECRET ?? 'music-core-dev-secret-change-in-production'
export const JWT_EXPIRY = '2h'
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export interface BuildAppResult {
  app: ReturnType<typeof Fastify>
  store: MemoryStore
  hub: ServerHub
}

export const buildApp = async (options?: { https?: boolean }): Promise<BuildAppResult> => {
  const useHttps = options?.https ?? process.env.USE_HTTPS === 'true'

  const serverOptions: Parameters<typeof Fastify>[0] = {
    logger: false,
  }

  if (useHttps) {
    try {
      serverOptions.https = {
        key: readFileSync(join(process.cwd(), 'server/certs/key.pem')),
        cert: readFileSync(join(process.cwd(), 'server/certs/cert.pem')),
      }
    } catch {
      console.warn('[Server] HTTPS certs not found, falling back to HTTP')
    }
  }

  const app = Fastify(serverOptions)

  await app.register(helmet, { contentSecurityPolicy: false })

  await app.register(cors, {
    origin: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  await app.register(cookie)

  await app.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: JWT_EXPIRY },
  })

  await app.register(websocket, {
    options: { maxPayload: 1048576 },
  })

  const store = createMemoryStore()
  const hub = createServerHub()
  await syncStoreFromDb(prisma, store)
  console.log(`[Server] Loaded from DB: ${store.state.users.length} users, ${store.state.listings.length} listings, ${store.state.reviews.length} reviews`)

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

  const routeDeps = {
    store,
    hub,
    usersService,
    listingsService,
    favouritesService,
    reviewsService,
    statsService,
  }

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
  registerListingsRoutes(app, routeDeps)
  registerStatsRoutes(app, { statsService })
  registerReviewsRoutes(app, routeDeps)
  registerFavouritesRoutes(app, routeDeps)
  registerGeneratorRoutes(app, { store, hub, listingsService, usersService })

  app.setNotFoundHandler(async (_request, reply) => {
    reply.code(404).send({ error: 'Route not found' })
  })

  app.setErrorHandler(async (error, _request, reply) => {
    if (reply.sent) return
    app.log.error(error)
    reply.code(500).send({ error: 'Internal server error' })
  })

  return { app, store, hub }
}