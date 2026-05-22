import type { HealthStatus } from '@/features/sync/serverClient'

const resolveHealthUrl = (): string => {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (typeof window !== 'undefined') {
    if (configured) {
      const url = new URL('/health', configured)
      if (
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1' &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      ) {
        url.hostname = window.location.hostname
      }
      return url.toString()
    }
    return `${window.location.origin}/health`
  }
  if (configured) {
    return new URL('/health', configured).toString()
  }
  return 'http://localhost:3001/health'
}

export const fetchServerHealthRest = async (): Promise<HealthStatus> => {
  try {
    const response = await fetch(resolveHealthUrl(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      return { ok: false, postgres: false, mongo: false }
    }

    const data = (await response.json()) as {
      ok?: boolean
      postgres?: boolean
      mongo?: boolean
    }

    return {
      ok: Boolean(data.ok),
      postgres: Boolean(data.postgres),
      mongo: Boolean(data.mongo),
    }
  } catch {
    return { ok: false, postgres: false, mongo: false }
  }
}

export interface WaitForServerHealthOptions {
  maxAttempts?: number
  intervalMs?: number
}

export const waitForServerHealth = async (
  options: WaitForServerHealthOptions = {},
): Promise<boolean> => {
  const maxAttempts = options.maxAttempts ?? 30
  const intervalMs = options.intervalMs ?? 500

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const health = await fetchServerHealthRest()
    if (health.postgres) {
      return true
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, intervalMs)
      })
    }
  }

  return false
}
