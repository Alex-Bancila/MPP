import type { FastifyInstance } from 'fastify'

import { prisma } from '../db/prisma'
import { getMongoClient } from '../db/mongo'

export const registerHealthRoutes = (app: FastifyInstance): void => {
  app.get('/health', async () => {
    let postgres = false
    let mongo = false

    try {
      await prisma.$queryRaw`SELECT 1`
      postgres = true
    } catch {
      postgres = false
    }

    try {
      const client = await getMongoClient()
      mongo = Boolean(client)
    } catch {
      mongo = false
    }

    return {
      ok: postgres,
      postgres,
      mongo,
      uptime: Number(process.uptime().toFixed(2)),
    }
  })
}
