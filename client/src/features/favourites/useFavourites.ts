import { useMemo } from 'react'

import { useAppStore } from '@/app/store/useAppStore'
import { getCurrentUser, getFavouriteListingsForUser } from '@/app/store/selectors'

export const useFavourites = () => {
  const { state, dispatch } = useAppStore()
  // Null-safe: never throw (that blanks the app) and never silently fall back to a
  // different user's data. When logged out there are simply no favourites.
  const currentUser = useMemo(() => getCurrentUser(state) ?? null, [state])

  const rows = useMemo(() => {
    if (!currentUser) {
      return []
    }
    return getFavouriteListingsForUser(state, currentUser.id)
  }, [currentUser, state])

  const toggle = (listingId: string) => {
    if (!currentUser) {
      return
    }
    dispatch({
      type: 'favourite/toggle',
      payload: {
        userId: currentUser.id,
        listingId,
      },
    })
  }

  return {
    currentUser,
    rows,
    toggle,
  }
}
