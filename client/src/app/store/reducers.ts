import type { AppAction } from '@/app/store/actions'
import type { AppState, Conversation, Listing, Message, Review } from '@/shared/types/domain'
import { createId } from '@/shared/utils/id'

const MAX_RECENTLY_VIEWED = 8

const sortNewestListings = (listings: Listing[]): Listing[] => {
  return [...listings].sort((first, second) => {
    return (
      new Date(second.datePosted).getTime() - new Date(first.datePosted).getTime()
    )
  })
}

const findConversation = (
  state: AppState,
  listingId: string,
  userA: string,
  userB: string,
): Conversation | undefined => {
  return state.conversations.find((conversation) => {
    if (conversation.listingId !== listingId) {
      return false
    }

    const participants = new Set(conversation.participantIds)
    return participants.has(userA) && participants.has(userB)
  })
}

const createConversation = (
  listingId: string,
  senderId: string,
  recipientId: string,
  id?: string,
): Conversation => {
  return {
    id: id ?? createId('conv'),
    listingId,
    participantIds: [senderId, recipientId],
    createdAt: new Date().toISOString(),
  }
}

const createMessage = (
  conversationId: string,
  senderId: string,
  recipientId: string,
  listingId: string,
  body: string,
  id?: string,
  createdAt?: string,
): Message => {
  return {
    id: id ?? createId('msg'),
    conversationId,
    senderId,
    recipientId,
    listingId,
    body,
    createdAt: createdAt ?? new Date().toISOString(),
  }
}

const sortNewestReviews = (reviews: Review[]): Review[] => {
  return [...reviews].sort((first, second) => {
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  })
}

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'auth/register': {
      const createdAt = action.payload.createdAt ?? new Date().toISOString()
      const user = {
        ...action.payload,
        createdAt,
      }

      return {
        ...state,
        users: [...state.users, user],
        currentUserId: user.id,
      }
    }

    case 'auth/login': {
      const existingUser = state.users.find((u) => u.id === action.payload.userId)
      if (existingUser || !action.payload.user) {
        return {
          ...state,
          currentUserId: action.payload.userId,
        }
      }

      return {
        ...state,
        users: [...state.users, action.payload.user],
        currentUserId: action.payload.userId,
      }
    }

    case 'auth/logout': {
      return {
        ...state,
        currentUserId: null,
      }
    }

    case 'listing/create': {
      const listing: Listing = {
        ...action.payload,
        id: action.payload.id ?? createId('listing'),
        datePosted: action.payload.datePosted ?? new Date().toISOString(),
      }

      return {
        ...state,
        listings: sortNewestListings([...state.listings, listing]),
      }
    }

    case 'listing/update': {
      return {
        ...state,
        listings: state.listings.map((listing) => {
          if (listing.id !== action.payload.listingId) {
            return listing
          }

          return {
            ...listing,
            ...action.payload.updates,
          }
        }),
      }
    }

    case 'listing/delete': {
      const listings = state.listings.filter(
        (listing) => listing.id !== action.payload.listingId,
      )

      const reviews = state.reviews.filter((review) => {
        return review.listingId !== action.payload.listingId
      })

      const conversations = state.conversations.filter(
        (conversation) => conversation.listingId !== action.payload.listingId,
      )

      const conversationIds = new Set(conversations.map((conversation) => conversation.id))

      const messages = state.messages.filter((message) => {
        return conversationIds.has(message.conversationId)
      })

      const favourites = state.favourites.filter((favourite) => {
        return favourite.listingId !== action.payload.listingId
      })

      return {
        ...state,
        listings,
        reviews,
        conversations,
        messages,
        favourites,
      }
    }

    case 'review/create': {
      const timestamp = action.payload.createdAt ?? new Date().toISOString()
      const review: Review = {
        ...action.payload,
        id: action.payload.id ?? createId('review'),
        createdAt: timestamp,
        updatedAt: action.payload.updatedAt ?? timestamp,
      }

      return {
        ...state,
        reviews: sortNewestReviews([review, ...state.reviews]),
      }
    }

    case 'review/update': {
      const updatedAt = new Date().toISOString()

      return {
        ...state,
        reviews: sortNewestReviews(
          state.reviews.map((review) => {
            if (review.id !== action.payload.reviewId) {
              return review
            }

            return {
              ...review,
              ...action.payload.updates,
              updatedAt,
            }
          }),
        ),
      }
    }

    case 'review/delete': {
      return {
        ...state,
        reviews: state.reviews.filter((review) => {
          return review.id !== action.payload.reviewId
        }),
      }
    }

    case 'listing/status': {
      return {
        ...state,
        listings: state.listings.map((listing) => {
          if (listing.id !== action.payload.listingId) {
            return listing
          }

          return {
            ...listing,
            status: action.payload.status,
          }
        }),
      }
    }

    case 'message/send': {
      const existingConversation = findConversation(
        state,
        action.payload.listingId,
        action.payload.senderId,
        action.payload.recipientId,
      )

      const conversationId = existingConversation?.id ?? action.payload.conversationId ?? createId('conv')

      const nextMessage = createMessage(
        conversationId,
        action.payload.senderId,
        action.payload.recipientId,
        action.payload.listingId,
        action.payload.body,
        action.payload.id,
        action.payload.createdAt,
      )

      if (state.messages.some((message) => message.id === nextMessage.id)) {
        return state
      }

      if (existingConversation) {
        return {
          ...state,
          messages: [...state.messages, nextMessage],
        }
      }

      const conversation = createConversation(
        action.payload.listingId,
        action.payload.senderId,
        action.payload.recipientId,
        conversationId,
      )

      return {
        ...state,
        conversations: [...state.conversations, conversation],
        messages: [...state.messages, { ...nextMessage, conversationId: conversation.id }],
      }
    }

    case 'message/markAsRead': {
      const readAt = new Date().toISOString()
      return {
        ...state,
        messages: state.messages.map((message) => {
          if (message.conversationId === action.payload.conversationId && message.recipientId === action.payload.userId && !message.readAt) {
            return { ...message, readAt }
          }
          return message
        }),
      }
    }

    case 'conversation/create': {
      const exists = state.conversations.some((conv) => conv.id === action.payload.id)
      if (exists) {
        return state
      }
      return {
        ...state,
        conversations: [...state.conversations, action.payload],
      }
    }

    case 'favourite/toggle': {
      const isFavourite = state.favourites.some((favourite) => {
        return (
          favourite.userId === action.payload.userId &&
          favourite.listingId === action.payload.listingId
        )
      })

      if (isFavourite) {
        return {
          ...state,
          favourites: state.favourites.filter((favourite) => {
            return !(
              favourite.userId === action.payload.userId &&
              favourite.listingId === action.payload.listingId
            )
          }),
        }
      }

      return {
        ...state,
        favourites: [
          ...state.favourites,
          {
            userId: action.payload.userId,
            listingId: action.payload.listingId,
            createdAt: new Date().toISOString(),
          },
        ],
      }
    }

    case 'activity/set': {
      return {
        ...state,
        activity: {
          ...state.activity,
          ...action.payload,
        },
      }
    }

    case 'activity/trackViewedListing': {
      const withoutDuplicates = state.activity.recentlyViewedListingIds.filter((listingId) => {
        return listingId !== action.payload.listingId
      })

      return {
        ...state,
        activity: {
          ...state.activity,
          recentlyViewedListingIds: [action.payload.listingId, ...withoutDuplicates].slice(
            0,
            MAX_RECENTLY_VIEWED,
          ),
        },
      }
    }

    case 'state/replace': {
      return action.payload
    }

    case 'sync/set': {
      return {
        ...state,
        sync: {
          ...state.sync,
          ...action.payload,
        },
      }
    }

    default:
      return state
  }
}
