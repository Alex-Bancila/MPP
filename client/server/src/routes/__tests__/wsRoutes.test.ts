import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import websocket from '@fastify/websocket'
import Fastify from 'fastify'

import type { Listing } from '../../shared'
import { createMemoryStore } from '../../storage/memoryStore'
import { createServerHub } from '../../transport/serverHub'
import { registerWebsocketRoutes } from '../ws'

describe('websocket hub', () => {
  let hub = createServerHub()

  beforeEach(() => {
    hub = createServerHub()
  })

  afterEach(() => {
    hub.listeners.clear()
  })

  it('broadcasts updates to listeners', () => {
    const received: Array<{ listings?: Listing[] }> = []
    const unsubscribe = hub.addListener((payload) => {
      received.push(payload)
    })

    hub.broadcast({ listings: [{ id: 'listing_99' } as Listing] })

    expect(received).toHaveLength(1)
    expect(received[0].listings?.[0].id).toBe('listing_99')

    unsubscribe()
    hub.broadcast({ listings: [{ id: 'listing_100' } as Listing] })
    expect(received).toHaveLength(1)
  })

  it('sends the initial sync payload over the websocket route', async () => {
    const app = Fastify()
    await app.register(websocket)

    registerWebsocketRoutes(app, {
      hub,
      store: createMemoryStore(),
      chatService: {
        listConversations: async () => [],
        listConversationsForUser: async () => [],
        getConversationById: async () => undefined,
        listMessages: async () => [],
        listAllMessages: async () => [],
        sendMessage: async () => {
          throw new Error('not used in this test')
        },
      },
    })

    await app.ready()
    let resolveMessage: (message: string) => void = () => undefined
    const messagePromise = new Promise<string>((resolve) => {
      resolveMessage = resolve
    })
    const ws = await app.injectWS('/ws', undefined, {
      onInit: (client) => {
        client.once('message', (data: { toString: () => string }) => resolveMessage(data.toString()))
      },
    })
    const message = await messagePromise

    expect(JSON.parse(message)).toMatchObject({ type: 'sync/connected' })

    ws.terminate()
    await app.close()
  })

  it('persists websocket chat sends into the sync store and broadcasts them', async () => {
    const app = Fastify()
    await app.register(websocket)
    const store = createMemoryStore()

    registerWebsocketRoutes(app, {
      hub,
      store,
      chatService: {
        listConversations: async () => [],
        listConversationsForUser: async () => [],
        getConversationById: async () => undefined,
        listMessages: async () => [],
        listAllMessages: async () => [],
        sendMessage: async () => ({
          conversation: {
            id: 'conv_lan',
            listingId: 'listing_1',
            participantIds: ['user_phone', 'user_laptop'],
            createdAt: '2026-05-19T18:00:00.000Z',
          },
          message: {
            id: 'msg_lan',
            conversationId: 'conv_lan',
            senderId: 'user_phone',
            recipientId: 'user_laptop',
            listingId: 'listing_1',
            body: 'hello over lan',
            createdAt: '2026-05-19T18:00:01.000Z',
            readAt: undefined,
          },
          createdConversation: true,
        }),
      },
    })

    await app.ready()
    let resolveBroadcast: (message: string) => void = () => undefined
    const broadcastPromise = new Promise<string>((resolve) => {
      resolveBroadcast = resolve
    })
    const ws = await app.injectWS('/ws', undefined, {
      onInit: (client) => {
        client.on('message', (data: { toString: () => string }) => {
          const text = data.toString()
          if (text.includes('msg_lan')) {
            resolveBroadcast(text)
          }
        })
      },
    })

    ws.send(JSON.stringify({
      type: 'chat/send',
      conversationId: 'conv_lan',
      listingId: 'listing_1',
      senderId: 'user_phone',
      recipientId: 'user_laptop',
      body: 'hello over lan',
    }))

    const broadcast = JSON.parse(await broadcastPromise)
    expect(broadcast.messages[0].id).toBe('msg_lan')
    expect(store.state.conversations.some((conversation) => conversation.id === 'conv_lan')).toBe(true)
    expect(store.state.messages.some((message) => message.id === 'msg_lan')).toBe(true)

    ws.terminate()
    await app.close()
  })
})
