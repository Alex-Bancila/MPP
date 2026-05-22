import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAppStore } from '@/app/store/useAppStore'
import { useAppSelector } from '@/app/store/useAppSelector'
import { getCurrentUser, getListingsForQuery, getUserById } from '@/app/store/selectors'
import { CategoryFilter } from '@/features/listings/components/CategoryFilter'
import { ListingCard } from '@/features/listings/components/ListingCard'
import { ListingsTable } from '@/features/listings/components/ListingsTable'
import { SearchInput } from '@/features/listings/components/SearchInput'
import { useListings } from '@/features/listings/useListings'
import { Button } from '@/shared/components/ui/Button'
import { Tabs } from '@/shared/components/ui/Tabs'
import { type ListingCategoryFilter } from '@/shared/constants/categories'
import type { AppState, AppView, Listing, ListingsLayout } from '@/shared/types/domain'

const PAGE_SIZE = 6
const SEARCH_DEBOUNCE_MS = 300

const viewOptions: { value: AppView; label: string }[] = [
  { value: 'listings', label: 'Browse Listings' },
  { value: 'statistics', label: 'Statistics' },
]

const layoutOptions: { value: ListingsLayout; label: string }[] = [
  { value: 'cards', label: 'Cards' },
  { value: 'table', label: 'Table' },
]

const MemoListingCard = memo(ListingCard)

const listingsQueryState = (listings: Listing[]): Pick<AppState, 'listings'> => ({
  listings,
})

export const ListingsPage = () => {
  const navigate = useNavigate()
  const { dispatch } = useAppStore()
  const { isFavourite, toggleFavourite, prefetchPage, clearPrefetchCache } = useListings()
  const listings = useAppSelector((state) => state.listings)
  const users = useAppSelector((state) => state.users)
  const activity = useAppSelector((state) => state.activity)
  const sync = useAppSelector((state) => state.sync)
  const currentUser = useAppSelector((state) => getCurrentUser(state))

  const category = activity.preferredCategory
  const search = activity.lastSearch
  const layout = activity.preferredListingsLayout
  const [searchDraft, setSearchDraft] = useState(search)
  const [page, setPage] = useState(1)
  const [serverItems, setServerItems] = useState<Listing[]>([])
  const [serverTotalPages, setServerTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const activeQueryRef = useRef(`${category}|${search}|All`)
  const previousKeyRef = useRef(`${category}|${search}|All`)
  const previousServerPreferredRef = useRef(false)

  const queryKey = `${category}|${search}|All`
  const localRows = useMemo(() => {
    return getListingsForQuery(listingsQueryState(listings) as AppState, {
      category,
      search,
      status: 'All',
    })
  }, [category, listings, search])

  useEffect(() => {
    setSearchDraft(search)
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft === search) {
        return
      }
      setPage(1)
      dispatch({
        type: 'activity/set',
        payload: { lastSearch: searchDraft },
      })
      clearPrefetchCache()
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [clearPrefetchCache, dispatch, search, searchDraft])

  const localTotalPages = Math.max(1, Math.ceil(localRows.length / PAGE_SIZE))
  const serverPreferred =
    sync.serverReachable && window.navigator.onLine && sync.queuedMutations === 0
  const totalPages = serverPreferred ? serverTotalPages : localTotalPages
  const items =
    serverPreferred && serverItems.length > 0
      ? serverItems
      : localRows.slice(0, page * PAGE_SIZE)
  const hasMore = page < totalPages

  const loadPage = useCallback(
    async (nextPage: number, options?: { replace?: boolean }) => {
      if (!serverPreferred) {
        setPage(Math.min(nextPage, localTotalPages))
        return
      }

      setIsLoading(true)
      const requestKey = queryKey

      try {
        const response = await prefetchPage({
          category,
          search,
          status: 'All',
          page: nextPage,
          pageSize: PAGE_SIZE,
        })

        if (activeQueryRef.current !== requestKey) {
          return
        }

        setServerTotalPages(response.totalPages)
        setPage(response.currentPage)
        setServerItems((current) => {
          if (options?.replace) {
            return response.items
          }

          const existingIds = new Set(current.map((listing) => listing.id))
          const nextItems = response.items.filter((listing) => !existingIds.has(listing.id))
          return [...current, ...nextItems]
        })
      } finally {
        setIsLoading(false)
      }
    },
    [category, localTotalPages, prefetchPage, queryKey, search, serverPreferred],
  )

  useEffect(() => {
    const keyChanged = previousKeyRef.current !== queryKey
    const serverBecamePreferred = !previousServerPreferredRef.current && serverPreferred

    previousKeyRef.current = queryKey
    previousServerPreferredRef.current = serverPreferred
    activeQueryRef.current = queryKey

    if (keyChanged || serverBecamePreferred) {
      setPage(1)
      if (serverPreferred) {
        setServerItems([])
        clearPrefetchCache()
        void loadPage(1, { replace: true })
      } else {
        setServerTotalPages(localTotalPages)
      }
    }
  }, [clearPrefetchCache, loadPage, localTotalPages, queryKey, serverPreferred])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const listingMap = useMemo(() => {
    return new Map(listings.map((listing) => [listing.id, listing]))
  }, [listings])

  const resolvedItems = useMemo(() => {
    return items.map((listing) => listingMap.get(listing.id) ?? listing)
  }, [items, listingMap])

  const sellerMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getUserById>>()
    const stateForUsers = { users } as AppState
    resolvedItems.forEach((listing) => {
      map.set(listing.id, getUserById(stateForUsers, listing.sellerId))
    })
    return map
  }, [resolvedItems, users])

  const updateCategory = (nextCategory: ListingCategoryFilter) => {
    setPage(1)
    dispatch({
      type: 'activity/set',
      payload: { preferredCategory: nextCategory },
    })
    clearPrefetchCache()
  }

  const updateView = (nextView: AppView) => {
    dispatch({
      type: 'activity/set',
      payload: { preferredView: nextView },
    })
    if (nextView === 'statistics') {
      navigate('/stats')
    }
  }

  const updateLayout = (nextLayout: ListingsLayout) => {
    dispatch({
      type: 'activity/set',
      payload: { preferredListingsLayout: nextLayout },
    })
  }

  const handleToggleFavourite = useCallback(
    (listingId: string) => {
      if (!currentUser) {
        navigate('/login', { state: { returnTo: '/listings' } })
        return
      }
      toggleFavourite(listingId)
    },
    [currentUser, navigate, toggleFavourite],
  )

  const loadNextPage = useCallback(async () => {
    if (isLoading || !hasMore) {
      return
    }

    void loadPage(page + 1)
  }, [hasMore, isLoading, loadPage, page])

  useEffect(() => {
    if (layout !== 'cards' || !sentinelRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadNextPage()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(sentinelRef.current)

    return () => {
      observer.disconnect()
    }
  }, [layout, loadNextPage])

  return (
    <section className="mc-page mc-listings-page">
      <div className="mc-listings-page__view-toggle">
        <Tabs value="listings" onChange={updateView} options={viewOptions} />
      </div>

      <SearchInput value={searchDraft} onChange={setSearchDraft} />

      <div className="mc-listings-page__toolbar">
        <CategoryFilter value={category} onChange={updateCategory} />
        <Tabs value={layout} onChange={updateLayout} options={layoutOptions} />
      </div>

      {layout === 'table' ? (
        <>
          <ListingsTable listings={resolvedItems} />
          {hasMore ? (
            <div className="mc-listings-page__footer">
              <Button variant="ghost" onClick={() => void loadNextPage()} disabled={isLoading}>
                {isLoading ? 'Loading more...' : 'Load more listings'}
              </Button>
            </div>
          ) : (
            <span className="mc-page__subtitle">You have reached the end.</span>
          )}
        </>
      ) : (
        <>
          <div className="mc-grid mc-grid--cards">
            {resolvedItems.length > 0 ? (
              resolvedItems.map((listing) => (
                <MemoListingCard
                  key={listing.id}
                  listing={listing}
                  seller={sellerMap.get(listing.id)}
                  showStatus
                  dimSold
                  isFavourite={isFavourite(listing.id)}
                  onToggleFavourite={handleToggleFavourite}
                />
              ))
            ) : (
              <div className="mc-empty">No listings match your filters yet.</div>
            )}
          </div>

          <div className="mc-listings-page__footer">
            {hasMore ? (
              <Button variant="ghost" onClick={() => void loadNextPage()} disabled={isLoading}>
                {isLoading ? 'Loading more...' : 'Load more listings'}
              </Button>
            ) : (
              <span className="mc-page__subtitle">You have reached the end.</span>
            )}
          </div>

          {hasMore ? (
            <div
              className={`mc-listings-page__infinite-indicator${
                isLoading ? ' mc-listings-page__infinite-indicator--loading' : ''
              }`}
              aria-live="polite"
            >
              <span className="mc-listings-page__infinite-dot" aria-hidden="true" />
              {isLoading ? 'Loading more listings...' : 'Scroll to load more listings'}
            </div>
          ) : null}
          <div ref={sentinelRef} className="mc-listings-page__sentinel" />
        </>
      )}
    </section>
  )
}
