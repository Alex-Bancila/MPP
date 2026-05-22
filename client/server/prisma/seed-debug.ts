import { PrismaClient } from '@prisma/client'
import { loadServerEnv } from '../src/db/env'

loadServerEnv()

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')
  
  console.log('Deleting action logs...')
  await prisma.actionLog.deleteMany()
  
  console.log('Deleting suspicious users...')
  await prisma.suspiciousUser.deleteMany()
  
  console.log('Deleting role permissions...')
  await prisma.rolePermission.deleteMany()
  
  console.log('Deleting permissions...')
  await prisma.permission.deleteMany()
  
  console.log('Deleting messages...')
  await prisma.message.deleteMany()
  
  console.log('Deleting conversations...')
  await prisma.conversation.deleteMany()
  
  console.log('Deleting favourites...')
  await prisma.favourite.deleteMany()
  
  console.log('Deleting reviews...')
  await prisma.review.deleteMany()
  
  console.log('Deleting listings...')
  await prisma.listing.deleteMany()
  
  console.log('Deleting users...')
  await prisma.user.deleteMany()
  
  console.log('Deleting roles...')
  await prisma.role.deleteMany()
  
  console.log('Clearing MongoDB chat messages...')
  try {
    const { clearChatMessages } = await import('../src/db/mongoChat')
    await clearChatMessages()
    console.log('MongoDB cleared (or skipped)')
  } catch (e) {
    console.log('MongoDB unavailable, skipping')
  }
  
  console.log('Seed complete!')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect() })
