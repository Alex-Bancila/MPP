import type { MemoryStore } from '../storage/memoryStore'
import type { Listing, Review, Favourite, Conversation, Message, User } from '../shared'

export const addUserToStore = (store: MemoryStore, user: User): void => {
  const exists = store.state.users.some((row) => row.id === user.id)
  if (!exists) {
    store.state.users = [user, ...store.state.users]
  }
}

export const addListingToStore = (store: MemoryStore, listing: Listing): void => {
  const exists = store.state.listings.some((l) => l.id === listing.id)
  if (!exists) {
    store.state.listings = [listing, ...store.state.listings]
  }
}

export const updateListingInStore = (store: MemoryStore, listing: Listing): void => {
  store.state.listings = store.state.listings.map((l) =>
    l.id === listing.id ? listing : l,
  )
}

export const removeListingFromStore = (store: MemoryStore, listingId: string): void => {
  store.state.listings = store.state.listings.filter((l) => l.id !== listingId)
  store.state.reviews = store.state.reviews.filter((r) => r.listingId !== listingId)
  store.state.favourites = store.state.favourites.filter((f) => f.listingId !== listingId)
  store.state.conversations = store.state.conversations.filter((c) => c.listingId !== listingId)
}

export const addReviewToStore = (store: MemoryStore, review: Review): void => {
  const exists = store.state.reviews.some((r) => r.id === review.id)
  if (!exists) {
    store.state.reviews = [review, ...store.state.reviews]
  }
}

export const updateReviewInStore = (store: MemoryStore, review: Review): void => {
  store.state.reviews = store.state.reviews.map((r) =>
    r.id === review.id ? review : r,
  )
}

export const removeReviewFromStore = (store: MemoryStore, reviewId: string): void => {
  store.state.reviews = store.state.reviews.filter((r) => r.id !== reviewId)
}

export const addFavouriteToStore = (store: MemoryStore, favourite: Favourite): void => {
  const exists = store.state.favourites.some(
    (f) => f.userId === favourite.userId && f.listingId === favourite.listingId,
  )
  if (!exists) {
    store.state.favourites = [...store.state.favourites, favourite]
  }
}

export const removeFavouriteFromStore = (store: MemoryStore, userId: string, listingId: string): void => {
  store.state.favourites = store.state.favourites.filter(
    (f) => !(f.userId === userId && f.listingId === listingId),
  )
}

export const addConversationToStore = (store: MemoryStore, conversation: Conversation): void => {
  const exists = store.state.conversations.some((c) => c.id === conversation.id)
  if (!exists) {
    store.state.conversations = [conversation, ...store.state.conversations]
  }
}

export const addMessageToStore = (store: MemoryStore, message: Message): void => {
  const exists = store.state.messages.some((m) => m.id === message.id)
  if (!exists) {
    store.state.messages = [...store.state.messages, message].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }
}
