import { describe, expect, it, vi } from 'vitest'

import { replayQueueWithRetention } from '@/app/store/syncQueue'
import type { QueuedMutation } from '@/features/sync/serverClient'

const mutation = (id: string): QueuedMutation => ({
  kind: 'listing/delete',
  payload: { listingId: id },
})

describe('replayQueueWithRetention', () => {
  it('keeps failed mutation and all following items in the queue', async () => {
    const replay = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined)

    const result = await replayQueueWithRetention(
      [mutation('a'), mutation('b'), mutation('c')],
      replay,
    )

    expect(replay).toHaveBeenCalledTimes(2)
    expect(result.success).toBe(false)
    expect(result.remaining).toEqual([mutation('b'), mutation('c')])
  })

  it('clears the queue when all mutations succeed', async () => {
    const replay = vi.fn().mockResolvedValue(undefined)

    const result = await replayQueueWithRetention([mutation('a'), mutation('b')], replay)

    expect(result.success).toBe(true)
    expect(result.remaining).toEqual([])
  })
})
