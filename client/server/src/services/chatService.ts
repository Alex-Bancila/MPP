import type { Conversation, Message } from '../shared'
import { createId } from '../shared'
import type { MemoryStore } from '../storage/memoryStore'

export interface SendChatMessageInput {
  conversationId?: string
  messageId?: string
  listingId: string
  senderId: string
  recipientId: string
  body: string
  createdAt?: string
}

export interface ChatMessageRow {
  id: string
  conversationId: string
  senderId: string
  recipientId: string
  listingId: string
  body: string
  createdAt: string
  readAt?: string
}

export interface SendChatMessageResult {
  conversation: Conversation
  message: ChatMessageRow
  createdConversation: boolean
}

export interface ChatService {
  listConversations: () => Promise<Conversation[]>
  listConversationsForUser: (userId: string) => Promise<Conversation[]>
  getConversationById: (conversationId: string) => Promise<Conversation | undefined>
  listMessages: (conversationId: string) => Promise<Message[]>
  listAllMessages: () => Promise<Message[]>
  sendMessage: (input: SendChatMessageInput) => Promise<SendChatMessageResult>
}

const toChatMessageRow = (
  message: Message,
  conversation: Conversation,
): ChatMessageRow => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  recipientId:
    message.recipientId ??
    (message.senderId === conversation.participantIds[0]
      ? conversation.participantIds[1]
      : conversation.participantIds[0]),
  listingId: message.listingId ?? conversation.listingId,
  body: message.body,
  createdAt: message.createdAt,
  readAt: message.readAt,
})

export const createChatService = (store: MemoryStore): ChatService => {
  const getConversationRow = async (conversationId: string) => {
    return store.state.conversations.find((c) => c.id === conversationId)
  }

  const findConversationForPair = async (
    listingId: string,
    senderId: string,
    recipientId: string,
  ) => {
    return store.state.conversations.find(
      (c) =>
        c.listingId === listingId &&
        ((c.participantIds[0] === senderId && c.participantIds[1] === recipientId) ||
          (c.participantIds[0] === recipientId && c.participantIds[1] === senderId))
    )
  }

  return {
    listConversations: async () => {
      return [...store.state.conversations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    },
    listConversationsForUser: async (userId) => {
      return store.state.conversations
        .filter((c) => c.participantIds.includes(userId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },
    getConversationById: async (conversationId) => {
      return getConversationRow(conversationId)
    },
    listMessages: async (conversationId) => {
      const messages = store.state.messages.filter((m) => m.conversationId === conversationId)
      return [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    },
    listAllMessages: async () => {
      return [...store.state.messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    },
    sendMessage: async (input) => {
      let existingConversation = input.conversationId
        ? await getConversationRow(input.conversationId)
        : null

      if (!existingConversation) {
        existingConversation = await findConversationForPair(
          input.listingId,
          input.senderId,
          input.recipientId,
        )
      }

      let conversation: Conversation
      let createdConversation = false

      if (existingConversation) {
        conversation = existingConversation
      } else {
        conversation = {
          id: input.conversationId ?? createId('conv'),
          listingId: input.listingId,
          participantIds: [input.senderId, input.recipientId],
          createdAt: new Date().toISOString(),
        }
        store.state.conversations.push(conversation)
        createdConversation = true
      }

      const messageId = input.messageId ?? createId('msg')
      const existingMessage = store.state.messages.find((m) => m.id === messageId)

      if (existingMessage) {
        return {
          conversation,
          message: toChatMessageRow(existingMessage, conversation),
          createdConversation,
        }
      }

      const createdAt = input.createdAt ? new Date(input.createdAt).toISOString() : new Date().toISOString()
      const message: Message = {
        id: messageId,
        conversationId: conversation.id,
        senderId: input.senderId,
        recipientId: input.recipientId,
        listingId: input.listingId,
        body: input.body,
        createdAt,
      }

      store.state.messages.push(message)

      return {
        conversation,
        message: toChatMessageRow(message, conversation),
        createdConversation,
      }
    },
  }
}
