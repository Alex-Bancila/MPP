import type { ReactNode } from 'react'

import { AppStoreProvider } from '@/app/store/AppStore'
import { useActivityTracking } from '@/features/activity/useActivityTracking'

interface AppProvidersProps {
  children: ReactNode
}

const ActivityBridge = ({ children }: AppProvidersProps) => {
  useActivityTracking()
  return <>{children}</>
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <AppStoreProvider>
      <ActivityBridge>{children}</ActivityBridge>
    </AppStoreProvider>
  )
}
