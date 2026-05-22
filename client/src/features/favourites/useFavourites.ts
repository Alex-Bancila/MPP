import { useMemo } from 'react'

import { useAppStore } from '@/app/store/useAppStore'
import {
  getCurrentUser,
  getFavouriteListingsForUser,
  getUserById,
} from '@/app/store/selectors'

export const useFavourites = () => {
  const { state, dispatch } = useAppStore()
  const currentUser = useMemo(() => {
    const resolvedUser = getCurrentUser(state) ?? getUserById(state, 'user_1') ?? state.users[0]
    if (!resolvedUser) {
      throw new Error('No users available in app state.')
    }

    return resolvedUser
  }, [state])

  const rows = useMemo(() => {
    return getFavouriteListingsForUser(state, currentUser.id)
  }, [currentUser, state])

  const toggle = (listingId: string) => {
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
