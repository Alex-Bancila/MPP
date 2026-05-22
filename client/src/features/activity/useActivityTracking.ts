import { useEffect, useRef } from 'react'

import { useAppStore } from '@/app/store/useAppStore'
import { readActivityCookies, writeActivityCookies } from '@/features/activity/cookies'

const NAVIGATION_EVENT = 'music-core:navigation'

const currentRoute = (): string => {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export const useActivityTracking = (): void => {
  const { state, dispatch } = useAppStore()
  const skipFirstWriteRef = useRef(true)

  useEffect(() => {
    const stored = readActivityCookies()
    if (!stored) {
      return
    }

    dispatch({
      type: 'activity/set',
      payload: {
        preferredCategory: stored.preferredCategory,
        preferredView: stored.preferredView,
        preferredListingsLayout: stored.preferredListingsLayout,
        lastSearch: stored.lastSearch,
        recentlyViewedListingIds: stored.recentlyViewedListingIds,
        lastVisitedRoute: stored.lastVisitedRoute,
        lastActiveAt: stored.lastActiveAt,
      },
    })
  }, [dispatch])

  useEffect(() => {
    const syncRoute = () => {
      dispatch({
        type: 'activity/set',
        payload: {
          lastVisitedRoute: currentRoute(),
          lastActiveAt: new Date().toISOString(),
        },
      })
    }

    const historyRef = window.history as History & {
      __musicCorePatched?: boolean
      __musicCorePushState?: History['pushState']
      __musicCoreReplaceState?: History['replaceState']
    }

    if (!historyRef.__musicCorePatched) {
      historyRef.__musicCorePushState = historyRef.pushState.bind(historyRef)
      historyRef.__musicCoreReplaceState = historyRef.replaceState.bind(historyRef)

      historyRef.pushState = (...args: Parameters<History['pushState']>) => {
        historyRef.__musicCorePushState?.(...args)
        window.dispatchEvent(new Event(NAVIGATION_EVENT))
      }

      historyRef.replaceState = (...args: Parameters<History['replaceState']>) => {
        historyRef.__musicCoreReplaceState?.(...args)
        window.dispatchEvent(new Event(NAVIGATION_EVENT))
      }

      historyRef.__musicCorePatched = true
    }

    syncRoute()
    window.addEventListener('popstate', syncRoute)
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener(NAVIGATION_EVENT, syncRoute)

    return () => {
      window.removeEventListener('popstate', syncRoute)
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener(NAVIGATION_EVENT, syncRoute)
    }
  }, [dispatch])

  useEffect(() => {
    if (skipFirstWriteRef.current) {
      skipFirstWriteRef.current = false
      return
    }

    writeActivityCookies(state.activity)
  }, [state.activity])
}
