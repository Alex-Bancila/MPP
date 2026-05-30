import type { PrismaClient, Conversation as PrismaConversation } from '@prisma/client'

import type { Message } from '../shared'
import type { MemoryStore } from '../storage/memoryStore'
import {
  mapFavourite,
  mapListing,
  mapMessage,
  mapMessageWithConversation,
  mapReview,
  mapUser,
  mapConversation,
} from './mappers'
import { listAllChatMessages, type ChatMessageRow } from './mongoChat'

const mapMongoMessage = (message: ChatMessageRow): Message => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  recipientId: message.recipientId,
  listingId: message.listingId,
  body: message.body,
  createdAt: message.createdAt,
  readAt: message.readAt,
})

const mapMongoMessageWithContext = (
  message: ChatMessageRow,
  conversation: Pick<PrismaConversation, 'id' | 'listingId' | 'participantAId' | 'participantBId'>,
): Message => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  recipientId: message.senderId === conversation.participantAId
    ? conversation.participantBId
    : conversation.participantAId,
  listingId: conversation.listingId,
  body: message.body,
  createdAt: message.createdAt,
  readAt: message.readAt,
})

const dedupeMessages = (messages: Message[]): Message[] => {
  const map = new Map<string, Message>()

  messages.forEach((message) => {
    map.set(message.id, message)
  })

  return [...map.values()]
}

export const syncStoreFromDb = async (db: PrismaClient, store: MemoryStore): Promise<void> => {
  const [users, listings, reviews, favourites, conversations, postgresMessages, adminRequests] =
    await Promise.all([
    db.user.findMany({ orderBy: { createdAt: 'desc' } }),
    db.listing.findMany({ orderBy: { datePosted: 'desc' } }),
    db.review.findMany({ orderBy: { createdAt: 'desc' } }),
    db.favourite.findMany({ orderBy: { createdAt: 'desc' } }),
    db.conversation.findMany({ orderBy: { createdAt: 'desc' } }),
    db.message.findMany({ orderBy: { createdAt: 'asc' } }),
    db.adminAccessRequest.findMany({ orderBy: { createdAt: 'desc' } }),
  ])

  let mongoMessages: ChatMessageRow[] = []
  try {
    mongoMessages = await listAllChatMessages()
  } catch {
    // MongoDB unavailable; skip chat messages
  }

  const mergedMessages: Message[] = dedupeMessages([
    ...postgresMessages.map((message) => {
      const conversation = conversations.find((row) => row.id === message.conversationId)
      return conversation
        ? mapMessageWithConversation(message, conversation)
        : mapMessage(message)
    }),
    ...mongoMessages.map((message) => {
      const conversation = conversations.find((row) => row.id === message.conversationId)
      return conversation
        ? mapMongoMessageWithContext(message, conversation)
        : mapMongoMessage(message)
    }),
  ])

  const mappedUsers = users.map(mapUser)
  const usersById = new Map(mappedUsers.map((user) => [user.id, user]))

  store.adminRequests = adminRequests.map((request) => {
    const user = usersById.get(request.userId)
    return {
      id: request.id,
      userId: request.userId,
      username: user?.username ?? 'Unknown',
      email: user?.email ?? '',
      status: request.status as 'pending' | 'approved' | 'rejected',
      note: request.note,
      createdAt: request.createdAt.toISOString(),
      resolvedAt: request.resolvedAt ? request.resolvedAt.toISOString() : null,
      resolvedById: request.resolvedById,
    }
  })

  store.state = {
    ...store.state,
    users: mappedUsers,
    listings: listings.map(mapListing),
    reviews: reviews.map(mapReview),
    favourites: favourites.map(mapFavourite),
    conversations: conversations.map(mapConversation),
    messages: mergedMessages.sort((first, second) => {
      return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
    }),
  }
}
