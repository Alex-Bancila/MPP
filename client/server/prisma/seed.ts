import { PrismaClient } from '@prisma/client'

import { loadServerEnv } from '../src/db/env'
import { resetAndSeedDatabase } from '../src/db/seedDatabase'

loadServerEnv()

const prisma = new PrismaClient()

const main = async () => {
  await resetAndSeedDatabase(prisma)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
