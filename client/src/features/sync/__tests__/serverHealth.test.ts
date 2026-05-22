import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchServerHealthRest, waitForServerHealth } from '@/features/sync/serverHealth'

describe('serverHealth', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetchServerHealthRest returns postgres status from /health', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, postgres: true, mongo: false }),
    } as Response)

    const health = await fetchServerHealthRest()
    expect(health.postgres).toBe(true)
    expect(health.ok).toBe(true)
  })

  it('waitForServerHealth retries until postgres is ready', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, postgres: false, mongo: false }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, postgres: true, mongo: true }),
      } as Response)

    const ready = await waitForServerHealth({ maxAttempts: 3, intervalMs: 1 })
    expect(ready).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
