import { useCallback, useMemo, useRef } from 'react'

import { useAppStore } from '@/app/store/useAppStore'
import {
  getCurrentUser,
  getListingById,
  getListingsForQuery,
  getPaginatedListings,
  type ListingsQuery,
} from '@/app/store/selectors'
import { createId } from '@/shared/utils/id'
import type { ListingFormValues } from '@/features/listings/listingSchema'
import { getServerListings } from '@/features/sync/serverClient'

export const useListings = () => {
  const { state, dispatch } = useAppStore()
  const prefetchCacheRef = useRef(new Map<string, ReturnType<typeof getServerListings> extends Promise<infer T> ? T : never>())

  const currentUser = useMemo(() => {
    return getCurrentUser(state) ?? null
  }, [state])

  const getRows = (query: ListingsQuery) => {
    return getPaginatedListings(state, query)
  }

  const buildCacheKey = (query: ListingsQuery) => {
    return [query.category, query.search, query.status, query.page, query.pageSize].join('|')
  }

  const prefetchPage = async (query: ListingsQuery) => {
    const key = buildCacheKey(query)
    const cached = prefetchCacheRef.current.get(key)
    if (cached) {
      return cached
    }

    try {
      const result = await getServerListings({
        category: query.category,
        search: query.search,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      })
      prefetchCacheRef.current.set(key, result)
      return result
    } catch {
      const fallback = getPaginatedListings(state, query)
      const result = {
        items: fallback.rows,
        totalItems: fallback.totalItems,
        totalPages: fallback.totalPages,
        currentPage: fallback.currentPage,
        pageSize: query.pageSize,
      }
      prefetchCacheRef.current.set(key, result)
      return result
    }
  }

  const clearPrefetchCache = useCallback(() => {
    prefetchCacheRef.current.clear()
  }, [])

  const getFilteredRows = (
    query: Pick<ListingsQuery, 'category' | 'search' | 'status'>,
  ) => {
    return getListingsForQuery(state, query)
  }

  const createListing = (payload: ListingFormValues): { ok: boolean; message?: string } => {
    if (!currentUser) {
      return { ok: false, message: 'You must be logged in to create listings.' }
    }
    const id = createId('listing')
    const datePosted = new Date().toISOString()
    dispatch({
      type: 'listing/create',
      payload: {
        id,
        datePosted,
        ...payload,
        sellerId: currentUser.id,
      },
    })

    return { ok: true }
  }

  const updateListing = (
    listingId: string,
    payload: ListingFormValues,
  ): { ok: boolean; message?: string } => {
    if (!currentUser) {
      return { ok: false, message: 'You must be logged in to edit listings.' }
    }
    const listing = getListingById(state, listingId)
    if (!listing) {
      return { ok: false, message: 'Listing not found.' }
    }

    if (listing.sellerId !== currentUser.id) {
      return { ok: false, message: 'Only the listing owner can edit this item.' }
    }

    dispatch({
      type: 'listing/update',
      payload: {
        listingId,
        updates: payload,
      },
    })

    return { ok: true }
  }

  const deleteListing = (listingId: string): { ok: boolean; message?: string } => {
    if (!currentUser) {
      return { ok: false, message: 'You must be logged in to delete listings.' }
    }
    const listing = getListingById(state, listingId)
    if (!listing) {
      return { ok: false, message: 'Listing not found.' }
    }

    if (listing.sellerId !== currentUser.id) {
      return { ok: false, message: 'Only the listing owner can delete this item.' }
    }

    dispatch({
      type: 'listing/delete',
      payload: {
        listingId,
      },
    })

    return { ok: true }
  }

  const toggleFavourite = (listingId: string): { ok: boolean; message?: string } => {
    if (!currentUser) {
      return { ok: false, message: 'You must be logged in to toggle favourites.' }
    }
    dispatch({
      type: 'favourite/toggle',
      payload: {
        userId: currentUser.id,
        listingId,
      },
    })

    return { ok: true }
  }

  const createReview = (
    listingId: string,
    payload: { rating: number; title: string; body: string },
  ): { ok: boolean; message?: string } => {
    if (!currentUser) {
      return { ok: false, message: 'You must be logged in to create reviews.' }
    }
    dispatch({
      type: 'review/create',
      payload: {
        id: createId('review'),
        listingId,
        userId: currentUser.id,
        ...payload,
      },
    })
    return { ok: true }
  }

  const updateReview = (
    reviewId: string,
    updates: { rating?: number; title?: string; body?: string },
  ) => {
    dispatch({
      type: 'review/update',
      payload: {
        reviewId,
        updates,
      },
    })
  }

  const deleteReview = (reviewId: string) => {
    dispatch({
      type: 'review/delete',
      payload: { reviewId },
    })
  }

  const favouriteIds = useMemo(() => {
    if (!currentUser) {
      return new Set<string>()
    }
    return new Set(
      state.favourites
        .filter((row) => row.userId === currentUser.id)
        .map((row) => row.listingId),
    )
  }, [currentUser, state.favourites])

  const isFavourite = useCallback(
    (listingId: string) => favouriteIds.has(listingId),
    [favouriteIds],
  )

  return {
    state,
    currentUser,
    getRows,
    prefetchPage,
    clearPrefetchCache,
    getFilteredRows,
    createListing,
    updateListing,
    deleteListing,
    toggleFavourite,
    isFavourite,
    createReview,
    updateReview,
    deleteReview,
  }
}
