import { randomUUID } from 'node:crypto'

import type { Listing, ListingStatus, PaginatedListingsResult, ListingCategoryFilter } from '../shared'
import type { MemoryStore } from '../storage/memoryStore'
import type { UsersService } from './usersService'

export interface ListingsQuery {
  category: ListingCategoryFilter
  search: string
  status: ListingStatus | 'All'
  page: number
  pageSize: number
}

export interface CreateListingInput {
  id?: string
  datePosted?: string
  title: string
  description: string
  price: number
  category: Listing['category']
  photos: string[]
  status: ListingStatus
  sellerId: string
}

export type UpdateListingInput = Partial<Omit<CreateListingInput, 'sellerId'>>

export interface ListingsService {
  list: (query: ListingsQuery) => Promise<PaginatedListingsResult>
  getById: (listingId: string) => Promise<Listing | undefined>
  create: (input: CreateListingInput) => Promise<Listing>
  update: (listingId: string, updates: UpdateListingInput) => Promise<Listing | undefined>
  delete: (listingId: string) => Promise<boolean>
  count: () => Promise<number>
}

export const createListingsService = (
  store: MemoryStore,
  usersService: UsersService,
): ListingsService => {
  return {
    list: async (query) => {
      let filtered = [...store.state.listings]

      if (query.category !== 'All') {
        filtered = filtered.filter((l) => l.category === query.category)
      }

      if (query.status !== 'All') {
        filtered = filtered.filter((l) => l.status === query.status)
      }

      if (query.search.trim()) {
        const searchLower = query.search.trim().toLowerCase()
        filtered = filtered.filter(
          (l) =>
            l.title.toLowerCase().includes(searchLower) ||
            l.description.toLowerCase().includes(searchLower)
        )
      }

      // Sort by datePosted desc
      filtered.sort(
        (a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()
      )

      const totalItems = filtered.length
      const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize))
      const currentPage = Math.min(Math.max(query.page, 1), totalPages)

      const rows = filtered.slice(
        (currentPage - 1) * query.pageSize,
        currentPage * query.pageSize
      )

      return {
        rows,
        totalItems,
        totalPages,
        currentPage,
      }
    },
    getById: async (listingId) => {
      return store.state.listings.find((l) => l.id === listingId)
    },
    create: async (input) => {
      const seller = await usersService.getById(input.sellerId)
      if (!seller) {
        throw new Error('Seller not found')
      }

      const id = input.id ?? randomUUID()
      const listing: Listing = {
        id,
        title: input.title,
        description: input.description,
        price: input.price,
        category: input.category,
        photos: input.photos,
        sellerId: input.sellerId,
        datePosted: input.datePosted ? new Date(input.datePosted).toISOString() : new Date().toISOString(),
        status: input.status,
      }

      store.state.listings.push(listing)
      return listing
    },
    update: async (listingId, updates) => {
      const listingIndex = store.state.listings.findIndex((l) => l.id === listingId)
      if (listingIndex === -1) {
        return undefined
      }

      const existing = store.state.listings[listingIndex]
      const updated: Listing = {
        ...existing,
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.price !== undefined && { price: updates.price }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.photos !== undefined && { photos: updates.photos }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.datePosted !== undefined && { datePosted: new Date(updates.datePosted).toISOString() }),
      }

      store.state.listings[listingIndex] = updated
      return updated
    },
    delete: async (listingId) => {
      const listingIndex = store.state.listings.findIndex((l) => l.id === listingId)
      if (listingIndex === -1) {
        return false
      }

      store.state.listings.splice(listingIndex, 1)
      return true
    },
    count: async () => {
      return store.state.listings.length
    },
  }
}
