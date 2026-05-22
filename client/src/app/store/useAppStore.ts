import { useContext } from 'react'

import { AppStoreContext } from '@/app/store/context'

export const useAppStore = () => {
  const context = useContext(AppStoreContext)

  if (!context) {
    throw new Error('useAppStore must be used inside AppStoreProvider')
  }

  return context
}
