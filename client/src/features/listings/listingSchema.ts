import { z } from 'zod'

import { LISTING_CATEGORIES } from '../../shared/constants/categories'

export const listingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must have at least 5 characters')
    .max(80, 'Title cannot exceed 80 characters'),
  description: z
    .string()
    .trim()
    .min(20, 'Description must have at least 20 characters')
    .max(1200, 'Description cannot exceed 1200 characters'),
  price: z
    .number({
      error: 'Price is required',
    })
    .positive('Price must be greater than 0')
    .max(200_000, 'Price is unrealistically high'),
  category: z.enum(LISTING_CATEGORIES, {
    error: 'Please pick one of the valid categories',
  }),
  photos: z
    .array(z.url('Each photo must be a valid URL'))
    .min(1, 'At least one photo is required')
    .max(5, 'You can add up to 5 photos'),
  status: z.enum(['Active', 'Sold']),
})

export type ListingFormValues = z.infer<typeof listingSchema>
