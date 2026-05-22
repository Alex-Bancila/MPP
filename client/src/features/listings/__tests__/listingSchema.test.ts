import { describe, expect, it } from 'vitest'

import { listingSchema } from '@/features/listings/listingSchema'

describe('listing schema', () => {
  it('accepts valid listing payload', () => {
    const parsed = listingSchema.safeParse({
      title: 'Mesa Boogie Rectifier',
      description: 'Amp head in great condition with fresh tubes and footswitch included.',
      price: 5400,
      category: 'Electrify Your Sound',
      photos: ['https://picsum.photos/seed/rectifier/1200/900'],
      status: 'Active',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects listing with no photos', () => {
    const parsed = listingSchema.safeParse({
      title: 'Used Amp',
      description: 'This listing has enough characters to pass description minimum.',
      price: 100,
      category: 'Electrify Your Sound',
      photos: [],
      status: 'Active',
    })

    expect(parsed.success).toBe(false)
  })
})
