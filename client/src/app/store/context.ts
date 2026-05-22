import { createContext, type Dispatch } from 'react'

import type { AppAction } from '@/app/store/actions'
import type { AppState } from '@/shared/types/domain'

export interface AppStoreContextValue {
  state: AppState
  dispatch: Dispatch<AppAction>
  refreshFromServer: () => Promise<boolean>
  isOnline: boolean
}

export const AppStoreContext = createContext<AppStoreContextValue | undefined>(undefined)
