import type { Listing, Favourite } from '../shared'
import type { UsersService } from './usersService'
import type { MemoryStore } from '../storage/memoryStore'

export interface FavouriteListingRow {
  listing: Listing
  createdAt: string
}

export interface FavouriteAddResult {
  favourite: Favourite
  listing: Listing
  created: boolean
}

export interface FavouritesService {
  listForUser: (userId: string) => Promise<FavouriteListingRow[]>
  add: (userId: string, listingId: string) => Promise<FavouriteAddResult | undefined>
  remove: (userId: string, listingId: string) => Promise<boolean>
  isFavourite: (userId: string, listingId: string) => Promise<boolean>
}

export const createFavouritesService = (
  store: MemoryStore,
  usersService: UsersService,
): FavouritesService => {
  return {
    listForUser: async (userId) => {
      const userFavs = store.state.favourites.filter((f) => f.userId === userId)

      const rows: FavouriteListingRow[] = []
      for (const fav of userFavs) {
        const listing = store.state.listings.find((l) => l.id === fav.listingId)
        if (listing) {
          rows.push({
            listing,
            createdAt: fav.createdAt,
          })
        }
      }

      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return rows
    },
    add: async (userId, listingId) => {
      const user = await usersService.getById(userId)
      const listing = store.state.listings.find((l) => l.id === listingId)

      if (!user || !listing) {
        return undefined
      }

      const existingIndex = store.state.favourites.findIndex(
        (f) => f.userId === userId && f.listingId === listingId
      )

      if (existingIndex !== -1) {
        return {
          favourite: store.state.favourites[existingIndex],
          listing,
          created: false,
        }
      }

      const favourite: Favourite = {
        userId,
        listingId,
        createdAt: new Date().toISOString(),
      }

      store.state.favourites.push(favourite)

      return {
        favourite,
        listing,
        created: true,
      }
    },
    remove: async (userId, listingId) => {
      const existingIndex = store.state.favourites.findIndex(
        (f) => f.userId === userId && f.listingId === listingId
      )

      if (existingIndex === -1) {
        return false
      }

      store.state.favourites.splice(existingIndex, 1)
      return true
    },
    isFavourite: async (userId, listingId) => {
      return store.state.favourites.some(
        (f) => f.userId === userId && f.listingId === listingId
      )
    },
  }
}
