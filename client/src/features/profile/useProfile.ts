import { useMemo } from 'react'

import { useAppStore } from '@/app/store/useAppStore'
import { getListingsByUser } from '@/app/store/selectors'

export const useProfile = (username: string | undefined) => {
  const { state } = useAppStore()

  const user = useMemo(() => {
    if (!username) {
      return undefined
    }

    return state.users.find((row) => row.username.toLowerCase() === username.toLowerCase())
  }, [state.users, username])

  const listings = useMemo(() => {
    if (!user) {
      return []
    }

    return getListingsByUser(state, user.id)
  }, [state, user])

  return {
    user,
    listings,
  }
}
