import { describe, expect, it } from 'vitest'

import { loginSchema, registerSchema } from '@/features/auth/authSchema'

describe('auth schemas', () => {
  it('accepts valid register payload', () => {
    const parsed = registerSchema.safeParse({
      username: 'tone_chaser',
      email: 'tone@musiccore.local',
      password: 'StrongPass123!',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects weak register password', () => {
    const parsed = registerSchema.safeParse({
      username: 'tone_chaser',
      email: 'tone@musiccore.local',
      password: 'weak',
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects invalid login email', () => {
    const parsed = loginSchema.safeParse({
      email: 'bad-email',
      password: 'anything',
    })

    expect(parsed.success).toBe(false)
  })
})
