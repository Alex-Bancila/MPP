import { PrismaClient } from '@prisma/client'

import { loadServerTestEnv } from '../src/db/env'
import { resetAndSeedDatabase } from '../src/db/seedDatabase'

loadServerTestEnv()

const prisma = new PrismaClient()

const main = async () => {
  await resetAndSeedDatabase(prisma)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
