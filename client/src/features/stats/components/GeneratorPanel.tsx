import { useCallback, useState } from 'react'

import {
  startServerGenerator,
  stopServerGenerator,
  type GeneratorStatus,
} from '@/features/sync/serverClient'
import { Button } from '@/shared/components/ui/Button'

export const GeneratorPanel = () => {
  const [status, setStatus] = useState<GeneratorStatus>({ running: false })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleStart = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const next = await startServerGenerator({
        batchSize: 2,
        intervalMs: 2500,
        entityType: 'listings',
      })
      setStatus(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start generator.')
    } finally {
      setBusy(false)
    }
  }, [])

  const handleStop = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const next = await stopServerGenerator()
      setStatus(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to stop generator.')
    } finally {
      setBusy(false)
    }
  }, [])

  return (
    <article className="mc-stats-card mc-generator-panel">
      <h2 className="mc-stats-card__title">Live data generator (Silver)</h2>
      <p className="mc-page__subtitle">
        Starts the server Faker generator. New listings broadcast over WebSocket and update the
        statistics table and charts beside it.
      </p>
      <div className="mc-form__actions">
        <Button variant="primary" disabled={busy || status.running} onClick={() => void handleStart()}>
          Start generator
        </Button>
        <Button variant="secondary" disabled={busy || !status.running} onClick={() => void handleStop()}>
          Stop generator
        </Button>
        <span className="mc-tag">{status.running ? 'Running' : 'Stopped'}</span>
      </div>
      {error ? <p className="mc-auth-panel__error">{error}</p> : null}
    </article>
  )
}
