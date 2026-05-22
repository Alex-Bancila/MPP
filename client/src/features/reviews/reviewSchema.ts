import { z } from 'zod'

export const reviewSchema = z.object({
  rating: z.number({ error: 'Rating is required' }).int().min(1).max(5),
  title: z
    .string()
    .trim()
    .min(3, 'Review title must have at least 3 characters')
    .max(80, 'Review title cannot exceed 80 characters'),
  body: z
    .string()
    .trim()
    .min(10, 'Review must have at least 10 characters')
    .max(800, 'Review cannot exceed 800 characters'),
})

export type ReviewFormValues = z.infer<typeof reviewSchema>
