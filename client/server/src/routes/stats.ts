import type { FastifyInstance } from 'fastify'

import type { StatsService } from '../services/statsService'
import { parseInput } from '../lib/http'
import { sellersQuerySchema } from '../schemas'

export interface StatsRouteDeps {
  statsService: StatsService
}

export const registerStatsRoutes = (app: FastifyInstance, deps: StatsRouteDeps): void => {
  app.get('/stats/summary', async () => {
    return await deps.statsService.summary()
  })

  app.get('/stats/categories', async () => {
    return {
      items: await deps.statsService.categories(),
    }
  })

  app.get('/stats/sellers', async (request, reply) => {
    const parsed = parseInput(reply, sellersQuerySchema, request.query)
    if (!parsed) {
      return
    }

    return reply.send({
      limit: parsed.limit,
      items: await deps.statsService.sellers(parsed.limit),
    })
  })

  app.get('/stats/favourites', async () => {
    return await deps.statsService.favourites()
  })

  app.get('/stats/reviews', async () => {
    return await deps.statsService.reviews()
  })
}
