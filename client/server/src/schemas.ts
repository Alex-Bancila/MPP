import { z } from 'zod'

import { ALL_CATEGORIES_FILTER, LISTING_CATEGORIES } from './shared'
import { listingSchema } from '../../src/features/listings/listingSchema'

export const DEFAULT_PAGE_SIZE = 6
export const MAX_PAGE_SIZE = 24

export const listingQuerySchema = z
  .object({
    category: z
      .union([z.enum(LISTING_CATEGORIES), z.literal(ALL_CATEGORIES_FILTER)])
      .default(ALL_CATEGORIES_FILTER),
    search: z.string().trim().default(''),
    status: z.enum(['All', 'Active', 'Sold']).default('All'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .strict()

export const listingParamsSchema = z
  .object({
    listingId: z.string().trim().min(1, 'listingId is required'),
  })
  .strict()

export const createListingSchema = listingSchema
  .omit({ status: true })
  .extend({
    id: z.string().trim().min(1).optional(),
    datePosted: z.string().datetime().optional(),
    sellerId: z.string().trim().min(1, 'sellerId is required'),
    status: z.enum(['Active', 'Sold']).default('Active'),
  })
  .strict()

export const updateListingSchema = listingSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  })

export const favouriteQuerySchema = z
  .object({
    userId: z.string().trim().min(1, 'userId is required'),
  })
  .strict()

export const favouriteParamsSchema = z
  .object({
    listingId: z.string().trim().min(1, 'listingId is required'),
  })
  .strict()

export const favouriteBodySchema = z
  .object({
    userId: z.string().trim().min(1, 'userId is required'),
    listingId: z.string().trim().min(1, 'listingId is required'),
  })
  .strict()

export const sellersQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
  })
  .strict()

export const reviewParamsSchema = z
  .object({
    reviewId: z.string().trim().min(1, 'reviewId is required'),
  })
  .strict()

export const listingReviewParamsSchema = z
  .object({
    listingId: z.string().trim().min(1, 'listingId is required'),
  })
  .strict()

export const reviewBodySchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    userId: z.string().trim().min(1, 'userId is required'),
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().min(3).max(80),
    body: z.string().trim().min(10).max(800),
    listingId: z.string().trim().min(1, 'listingId is required'),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .strict()

export const reviewUpdateSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().trim().min(3).max(80).optional(),
    body: z.string().trim().min(10).max(800).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one review field to update',
  })

export const authRegisterSchema = z
  .object({
    username: z.string().trim().min(3).max(24),
    email: z.email(),
    password: z.string().min(8),
  })
  .strict()

export const authLoginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(1),
  })
  .strict()

export const chatConversationQuerySchema = z
  .object({
    userId: z.string().trim().min(1, 'userId is required'),
  })
  .strict()

export const chatMessagesQuerySchema = z
  .object({
    conversationId: z.string().trim().min(1, 'conversationId is required'),
  })
  .strict()

export const chatSendSchema = z
  .object({
    conversationId: z.string().trim().min(1).optional(),
    messageId: z.string().trim().min(1).optional(),
    listingId: z.string().trim().min(1, 'listingId is required'),
    senderId: z.string().trim().min(1, 'senderId is required'),
    recipientId: z.string().trim().min(1, 'recipientId is required'),
    body: z.string().trim().min(1, 'body is required').max(800),
    createdAt: z.string().trim().min(1).optional(),
  })
  .strict()

export const adminDashboardQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict()

export const generatorStartSchema = z
  .object({
    batchSize: z.coerce.number().int().min(1).max(20).default(3),
    intervalMs: z.coerce.number().int().min(250).max(10_000).default(1_500),
    entityType: z.enum(['listings', 'reviews', 'mixed']).default('mixed'),
  })
  .strict()
