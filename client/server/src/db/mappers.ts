import type {
  Conversation as PrismaConversation,
  Favourite as PrismaFavourite,
  Listing as PrismaListing,
  Message as PrismaMessage,
  Review as PrismaReview,
  User as PrismaUser,
  Prisma,
} from '@prisma/client'

import type { Conversation, Favourite, Listing, Message, Review, User } from '../shared'

const toIso = (value: Date): string => {
  return value.toISOString()
}

const toStringArray = (value: Prisma.JsonValue): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }

  return []
}

const isAdminRoleId = (roleId: string) => roleId === 'role_admin' || roleId === 'admin'

export const mapUser = (user: PrismaUser): User => ({
  id: user.id,
  username: user.username,
  email: user.email,
  passwordHash: user.passwordHash,
  avatarUrl: user.avatarUrl,
  createdAt: toIso(user.createdAt),
  role: isAdminRoleId(user.roleId) ? 'admin' : 'user',
  banned: user.banned,
  bannedReason: user.bannedReason,
  bannedAt: user.bannedAt ? toIso(user.bannedAt) : null,
  permissions:
    isAdminRoleId(user.roleId)
      ? [
          'listing:create',
          'listing:update',
          'listing:delete',
          'review:create',
          'review:update',
          'review:delete',
          'favourite:toggle',
          'chat:send',
          'admin:read',
          'audit:read',
          'user:ban',
        ]
      : [
          'listing:create',
          'listing:update',
          'listing:delete',
          'review:create',
          'review:update',
          'review:delete',
          'favourite:toggle',
          'chat:send',
        ],
})

export const mapListing = (listing: PrismaListing): Listing => ({
  id: listing.id,
  title: listing.title,
  description: listing.description,
  price: listing.price,
  category: listing.category as Listing['category'],
  photos: toStringArray(listing.photos),
  sellerId: listing.sellerId,
  datePosted: toIso(listing.datePosted),
  status: listing.status as Listing['status'],
})

export const mapReview = (review: PrismaReview): Review => ({
  id: review.id,
  listingId: review.listingId,
  userId: review.userId,
  rating: review.rating,
  title: review.title,
  body: review.body,
  createdAt: toIso(review.createdAt),
  updatedAt: toIso(review.updatedAt),
})

export const mapFavourite = (favourite: PrismaFavourite): Favourite => ({
  userId: favourite.userId,
  listingId: favourite.listingId,
  createdAt: toIso(favourite.createdAt),
})

export const mapConversation = (conversation: PrismaConversation): Conversation => ({
  id: conversation.id,
  listingId: conversation.listingId,
  participantIds: [conversation.participantAId, conversation.participantBId],
  createdAt: toIso(conversation.createdAt),
})

export const mapMessage = (message: PrismaMessage): Message => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  body: message.body,
  createdAt: toIso(message.createdAt),
  readAt: message.readAt ? toIso(message.readAt) : undefined,
})

export const mapMessageWithConversation = (
  message: PrismaMessage,
  conversation: Pick<PrismaConversation, 'id' | 'listingId' | 'participantAId' | 'participantBId'>,
): Message => ({
  ...mapMessage(message),
  recipientId:
    message.senderId === conversation.participantAId
      ? conversation.participantBId
      : conversation.participantAId,
  listingId: conversation.listingId,
})
