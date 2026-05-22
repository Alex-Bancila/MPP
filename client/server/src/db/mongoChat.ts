import type { Collection } from 'mongodb'

import { createId } from '../shared'
import { getMongoClient } from './mongo'

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

const collectionName = 'chat_messages'

const isTestEnv = (): boolean => {
  return Boolean(process.env.VITEST) || process.env.NODE_ENV === 'test'
}

const getCollection = async (): Promise<Collection<ChatMessageRow> | null> => {
  const client = await getMongoClient()
  if (!client) {
    return null
  }
  return client.db().collection<ChatMessageRow>(collectionName)
}

export const listChatMessages = async (conversationId: string): Promise<ChatMessageRow[]> => {
  if (isTestEnv()) {
    return []
  }
  try {
    const collection = await getCollection()
    if (!collection) return []
    return collection.find({ conversationId }).sort({ createdAt: 1 }).toArray()
  } catch {
    return []
  }
}

export const listAllChatMessages = async (): Promise<ChatMessageRow[]> => {
  if (isTestEnv()) {
    return []
  }
  try {
    const collection = await getCollection()
    if (!collection) return []
    return collection.find({}).sort({ createdAt: 1 }).toArray()
  } catch {
    return []
  }
}

export const clearChatMessages = async (): Promise<void> => {
  try {
    const collection = await getCollection()
    if (!collection) return
    await collection.deleteMany({})
  } catch {
    // MongoDB not available; skip clearing chat messages
  }
}

export const createChatMessage = async (
  input: Omit<ChatMessageRow, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): Promise<ChatMessageRow> => {
  if (isTestEnv()) {
    return {
      id: input.id ?? createId('chat'),
      conversationId: input.conversationId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      listingId: input.listingId,
      body: input.body,
      createdAt: input.createdAt ?? new Date().toISOString(),
    }
  }
  const collection = await getCollection()
  if (!collection) {
    throw new Error('MongoDB not available')
  }
  const row: ChatMessageRow = {
    id: input.id ?? createId('chat'),
    conversationId: input.conversationId,
    senderId: input.senderId,
    recipientId: input.recipientId,
    listingId: input.listingId,
    body: input.body,
    createdAt: input.createdAt ?? new Date().toISOString(),
  }

  await collection.updateOne({ id: row.id }, { $setOnInsert: row }, { upsert: true })
  return row
}
