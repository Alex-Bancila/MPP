import { randomUUID } from 'node:crypto'

import type { Review } from '../shared'
import type { MemoryStore } from '../storage/memoryStore'

export interface CreateReviewInput {
  id?: string
  userId: string
  listingId: string
  rating: number
  title: string
  body: string
  createdAt?: string
  updatedAt?: string
}

export interface UpdateReviewInput {
  rating?: number
  title?: string
  body?: string
}

export interface ReviewsService {
  listForListing: (listingId: string) => Promise<Review[]>
  getById: (reviewId: string) => Promise<Review | undefined>
  create: (input: CreateReviewInput) => Promise<Review>
  update: (reviewId: string, updates: UpdateReviewInput) => Promise<Review | undefined>
  delete: (reviewId: string) => Promise<boolean>
  countForListing: (listingId: string) => Promise<number>
}

export const createReviewsService = (store: MemoryStore): ReviewsService => {
  return {
    listForListing: async (listingId) => {
      return store.state.reviews
        .filter((r) => r.listingId === listingId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },
    getById: async (reviewId) => {
      return store.state.reviews.find((r) => r.id === reviewId)
    },
    create: async (input) => {
      const timestamp = input.createdAt ? new Date(input.createdAt).toISOString() : new Date().toISOString()
      const id = input.id ?? randomUUID()
      const review: Review = {
        id,
        listingId: input.listingId,
        userId: input.userId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        createdAt: timestamp,
        updatedAt: input.updatedAt ? new Date(input.updatedAt).toISOString() : timestamp,
      }

      store.state.reviews.push(review)
      return review
    },
    update: async (reviewId, updates) => {
      const reviewIndex = store.state.reviews.findIndex((r) => r.id === reviewId)
      if (reviewIndex === -1) {
        return undefined
      }

      const existing = store.state.reviews[reviewIndex]
      const updated: Review = {
        ...existing,
        ...(updates.rating !== undefined && { rating: updates.rating }),
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.body !== undefined && { body: updates.body }),
        updatedAt: new Date().toISOString(),
      }

      store.state.reviews[reviewIndex] = updated
      return updated
    },
    delete: async (reviewId) => {
      const reviewIndex = store.state.reviews.findIndex((r) => r.id === reviewId)
      if (reviewIndex === -1) {
        return false
      }

      store.state.reviews.splice(reviewIndex, 1)
      return true
    },
    countForListing: async (listingId) => {
      return store.state.reviews.filter((r) => r.listingId === listingId).length
    },
  }
}
