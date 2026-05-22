import type { QueuedMutation } from '@/features/sync/serverClient'

export const replayQueueWithRetention = async (
  queue: QueuedMutation[],
  replay: (mutation: QueuedMutation) => Promise<void>,
): Promise<{ success: boolean; remaining: QueuedMutation[] }> => {
  const remaining: QueuedMutation[] = []

  for (let index = 0; index < queue.length; index += 1) {
    const mutation = queue[index]
    try {
      await replay(mutation)
    } catch {
      remaining.push(...queue.slice(index))
      return { success: false, remaining }
    }
  }

  return { success: true, remaining: [] }
}
