import { useMemo } from 'react'

import { useAppStore } from '@/app/store/useAppStore'
import type { AppState } from '@/shared/types/domain'

export const useAppSelector = <T>(selector: (state: AppState) => T, deps: unknown[] = []): T => {
  const { state } = useAppStore()
  return useMemo(() => selector(state), [state, selector, ...deps])
}
