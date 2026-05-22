import type { FastifyInstance } from 'fastify'

import type { ChatService } from '../services/chatService'
import type { ServerHub } from '../transport/serverHub'
import type { MemoryStore } from '../storage/memoryStore'
import { addConversationToStore, addMessageToStore } from '../db/storeUpdates'

export interface WebsocketRouteDeps {
  hub: ServerHub
  store: MemoryStore
  chatService: ChatService
}

export const registerWebsocketRoutes = (app: FastifyInstance, deps: WebsocketRouteDeps): void => {
  app.route({
    method: 'GET',
    url: '/ws',
    handler: (_request, reply) => {
      reply.code(426).send({ error: 'WebSocket upgrade required' })
    },
    wsHandler: (socket) => {
      const unsubscribe = deps.hub.addListener((payload) => {
        try {
          // Only send when socket is open; guard against throws from send().
          if ((socket as any).readyState === 1) {
            socket.send(JSON.stringify(payload))
          }
        } catch (err) {
          // If sending fails, clean up this listener and close the socket.
          try { unsubscribe() } catch {}
          try { socket.close() } catch {}
        }
      })

      socket.send(JSON.stringify({
        type: 'sync/connected',
        sync: deps.store.state.sync,
      }))

      socket.on('message', async (raw: Buffer | string) => {
        try {
          const text = typeof raw === 'string' ? raw : raw.toString()
          const payload = JSON.parse(text) as {
            type?: string
            conversationId?: string
            messageId?: string
            senderId?: string
            recipientId?: string
            listingId?: string
            body?: string
            createdAt?: string
          }

          if (payload.type !== 'chat/send' || !payload.conversationId || !payload.senderId || !payload.recipientId || !payload.listingId || !payload.body) {
            return
          }

          const result = await deps.chatService.sendMessage({
            conversationId: payload.conversationId,
            messageId: payload.messageId,
            senderId: payload.senderId,
            recipientId: payload.recipientId,
            listingId: payload.listingId,
            body: payload.body,
            createdAt: payload.createdAt,
          })
          const message = {
            id: result.message.id,
            conversationId: result.message.conversationId,
            senderId: result.message.senderId,
            recipientId: result.message.recipientId,
            listingId: result.message.listingId,
            body: result.message.body,
            createdAt: result.message.createdAt,
            readAt: result.message.readAt,
          }

          addConversationToStore(deps.store, result.conversation)
          addMessageToStore(deps.store, message)

          deps.hub.broadcast({
            conversations: [result.conversation],
            messages: [message],
            sync: deps.store.state.sync,
          })
        } catch {
          return
        }
      })

      socket.on('close', () => {
        unsubscribe()
      })
    },
  })
}