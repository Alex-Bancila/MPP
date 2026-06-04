import { useMemo } from 'react'

import { useAppStore } from '@/app/store/useAppStore'
import type { AppState } from '@/shared/types/domain'

export const useAppSelector = <T>(selector: (state: AppState) => T, deps: unknown[] = []): T => {
  const { state } = useAppStore()
  // Generic selector hook: callers pass their own `deps`, so the dependency list is
  // intentionally dynamic (spread) rather than a static array literal.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selector(state), [state, selector, ...deps])
}
