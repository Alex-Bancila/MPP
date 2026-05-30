import { PrismaClient, ListingStatus } from '@prisma/client'

import { initialAppState } from '../shared'
import { clearChatMessages } from './mongoChat'

const roles = [
  { id: 'role_admin', name: 'admin' as const, description: 'Full permissions' },
  { id: 'role_user', name: 'user' as const, description: 'Restricted permissions' },
]

const permissions = [
  { id: 'perm_listing_create', name: 'listing:create', description: 'Create listings' },
  { id: 'perm_listing_update', name: 'listing:update', description: 'Update listings' },
  { id: 'perm_listing_delete', name: 'listing:delete', description: 'Delete listings' },
  { id: 'perm_review_create', name: 'review:create', description: 'Create reviews' },
  { id: 'perm_review_update', name: 'review:update', description: 'Update reviews' },
  { id: 'perm_review_delete', name: 'review:delete', description: 'Delete reviews' },
  { id: 'perm_favourite_toggle', name: 'favourite:toggle', description: 'Toggle favourites' },
  { id: 'perm_chat_send', name: 'chat:send', description: 'Send chat messages' },
  { id: 'perm_admin_read', name: 'admin:read', description: 'View admin dashboards' },
  { id: 'perm_audit_read', name: 'audit:read', description: 'View logs and suspicious users' },
  { id: 'perm_user_ban', name: 'user:ban', description: 'Ban and unban users' },
]

const rolePermissions = [
  ...permissions.map((permission) => ({ roleId: 'role_admin', permissionId: permission.id })),
  ...permissions
    .filter(
      (permission) =>
        !permission.name.startsWith('admin:') &&
        !permission.name.startsWith('audit:') &&
        !permission.name.startsWith('user:'),
    )
    .map((permission) => ({ roleId: 'role_user', permissionId: permission.id })),
]

export const resetAndSeedDatabase = async (db: PrismaClient): Promise<void> => {
  await db.actionLog.deleteMany()
  await db.suspiciousUser.deleteMany()
  await db.rolePermission.deleteMany()
  await db.permission.deleteMany()
  await db.message.deleteMany()
  await db.conversation.deleteMany()
  await db.favourite.deleteMany()
  await db.review.deleteMany()
  await db.listing.deleteMany()
  await db.user.deleteMany()
  await db.role.deleteMany()

  // Clear MongoDB chat messages (non-blocking)
  try {
    await clearChatMessages()
  } catch {
    // MongoDB unavailable; skip
  }

  await db.role.createMany({
    data: roles,
  })

  await db.permission.createMany({
    data: permissions,
  })

  await db.rolePermission.createMany({
    data: rolePermissions,
  })

  await db.user.createMany({
    data: initialAppState.users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      avatarUrl: user.avatarUrl,
      createdAt: new Date(user.createdAt),
      roleId: user.role === 'admin' ? 'role_admin' : 'role_user',
    })),
  })

  await db.listing.createMany({
    data: initialAppState.listings.map((listing) => ({
      id: listing.id,
      sellerId: listing.sellerId,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      category: listing.category,
      photos: listing.photos,
      datePosted: new Date(listing.datePosted),
      status: listing.status as ListingStatus,
    })),
  })

  await db.review.createMany({
    data: initialAppState.reviews.map((review) => ({
      id: review.id,
      listingId: review.listingId,
      userId: review.userId,
      rating: review.rating,
      title: review.title,
      body: review.body,
      createdAt: new Date(review.createdAt),
      updatedAt: new Date(review.updatedAt),
    })),
  })

  await db.favourite.createMany({
    data: initialAppState.favourites.map((favourite) => ({
      userId: favourite.userId,
      listingId: favourite.listingId,
      createdAt: new Date(favourite.createdAt),
    })),
  })

  for (const conversation of initialAppState.conversations) {
    const [participantAId, participantBId] = conversation.participantIds
    await db.conversation.create({
      data: {
        id: conversation.id,
        listingId: conversation.listingId,
        participantAId,
        participantBId,
        createdAt: new Date(conversation.createdAt),
      },
    })
  }

  await db.message.createMany({
    data: initialAppState.messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      createdAt: new Date(message.createdAt),
    })),
  })
}
