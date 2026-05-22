import { describe, expect, it } from 'vitest'

import { appReducer } from '@/app/store/reducers'
import { initialAppState } from '@/shared/data/seed'

const createState = () => structuredClone(initialAppState)

describe('appReducer', () => {
  it('registers, logs in, and logs out', () => {
    const state = createState()

    const registered = appReducer(state, {
      type: 'auth/register',
      payload: {
        id: 'user_new',
        username: 'new_user',
        email: 'new@musiccore.local',
        passwordHash: 'hash',
        avatarUrl: 'https://i.pravatar.cc/96?img=1',
      },
    })

    expect(registered.currentUserId).toBe('user_new')
    expect(registered.users.some((user) => user.id === 'user_new')).toBe(true)

    const loggedIn = appReducer(registered, {
      type: 'auth/login',
      payload: { userId: 'user_1' },
    })

    expect(loggedIn.currentUserId).toBe('user_1')

    const loggedOut = appReducer(loggedIn, {
      type: 'auth/logout',
    })

    expect(loggedOut.currentUserId).toBeNull()
  })

  it('creates listing and keeps newest-first ordering', () => {
    const state = createState()

    const next = appReducer(state, {
      type: 'listing/create',
      payload: {
        title: 'Test Drop C Guitar',
        description: 'Very tight rhythm response and a strong low-end.',
        price: 2100,
        category: 'Creating',
        photos: ['https://picsum.photos/seed/test/1200/900'],
        sellerId: 'user_1',
        status: 'Active',
      },
    })

    expect(next.listings).toHaveLength(state.listings.length + 1)
    expect(next.listings[0].title).toBe('Test Drop C Guitar')
  })

  it('updates an existing listing', () => {
    const state = createState()
    const listingId = state.listings[0].id

    const next = appReducer(state, {
      type: 'listing/update',
      payload: {
        listingId,
        updates: {
          price: 555,
          title: 'Updated title',
        },
      },
    })

    const updated = next.listings.find((listing) => listing.id === listingId)
    expect(updated?.price).toBe(555)
    expect(updated?.title).toBe('Updated title')
  })

  it('deletes listing and cascades related conversations/messages', () => {
    const state = createState()

    const next = appReducer(state, {
      type: 'listing/delete',
      payload: { listingId: 'listing_1' },
    })

    expect(next.listings.some((listing) => listing.id === 'listing_1')).toBe(false)
    expect(next.conversations.some((conversation) => conversation.listingId === 'listing_1')).toBe(
      false,
    )
    expect(next.messages.some((message) => message.conversationId === 'conv_1')).toBe(false)
  })

  it('toggles favourite add/remove for a user listing pair', () => {
    const state = createState()

    const added = appReducer(state, {
      type: 'favourite/toggle',
      payload: {
        userId: 'user_1',
        listingId: 'listing_2',
      },
    })

    expect(
      added.favourites.some(
        (favourite) => favourite.userId === 'user_1' && favourite.listingId === 'listing_2',
      ),
    ).toBe(true)

    const removed = appReducer(added, {
      type: 'favourite/toggle',
      payload: {
        userId: 'user_1',
        listingId: 'listing_2',
      },
    })

    expect(
      removed.favourites.some(
        (favourite) => favourite.userId === 'user_1' && favourite.listingId === 'listing_2',
      ),
    ).toBe(false)
  })

  it('sends a message and creates conversation when needed', () => {
    const state = createState()

    const next = appReducer(state, {
      type: 'message/send',
      payload: {
        listingId: 'listing_2',
        recipientId: 'user_2',
        senderId: 'user_1',
        body: 'Can you lower the price?',
      },
    })

    expect(next.conversations.length).toBe(state.conversations.length + 1)
    expect(next.messages.length).toBe(state.messages.length + 1)
  })

  it('sends a message into existing conversation', () => {
    const state = createState()

    const next = appReducer(state, {
      type: 'message/send',
      payload: {
        listingId: 'listing_1',
        recipientId: 'user_2',
        senderId: 'user_1',
        body: 'Quick follow-up message',
      },
    })

    expect(next.conversations.length).toBe(state.conversations.length)
    expect(next.messages.length).toBe(state.messages.length + 1)
  })

  it('updates listing status to sold', () => {
    const state = createState()

    const next = appReducer(state, {
      type: 'listing/status',
      payload: {
        listingId: 'listing_2',
        status: 'Sold',
      },
    })

    expect(next.listings.find((listing) => listing.id === 'listing_2')?.status).toBe('Sold')
  })

  it('creates, updates, and deletes reviews with timestamps', () => {
    const state = createState()

    const created = appReducer(state, {
      type: 'review/create',
      payload: {
        listingId: 'listing_1',
        userId: 'user_1',
        rating: 5,
        title: 'Great listing',
        body: 'Solid condition and fast shipping.',
      },
    })

    expect(created.reviews[0].title).toBe('Great listing')
    expect(created.reviews[0].createdAt).toBeTruthy()
    expect(created.reviews[0].updatedAt).toBeTruthy()

    const updated = appReducer(created, {
      type: 'review/update',
      payload: {
        reviewId: created.reviews[0].id,
        updates: { title: 'Updated title', rating: 4 },
      },
    })

    expect(updated.reviews[0].title).toBe('Updated title')
    expect(updated.reviews[0].rating).toBe(4)

    const deleted = appReducer(updated, {
      type: 'review/delete',
      payload: { reviewId: updated.reviews[0].id },
    })

    expect(deleted.reviews.find((review) => review.id === updated.reviews[0].id)).toBeUndefined()
  })

  it('tracks recently viewed listings without duplicates', () => {
    const state = createState()

    const once = appReducer(state, {
      type: 'activity/trackViewedListing',
      payload: { listingId: 'listing_1' },
    })
    const twice = appReducer(once, {
      type: 'activity/trackViewedListing',
      payload: { listingId: 'listing_1' },
    })

    expect(twice.activity.recentlyViewedListingIds).toEqual(['listing_1'])
  })

  it('updates activity preferences and recently viewed list', () => {
    const state = createState()

    const withSettings = appReducer(state, {
      type: 'activity/set',
      payload: {
        preferredCategory: 'Creating',
        preferredView: 'statistics',
        lastSearch: 'guitar',
        lastVisitedRoute: '/stats',
        lastActiveAt: '2026-04-07T12:00:00.000Z',
      },
    })

    expect(withSettings.activity.preferredCategory).toBe('Creating')
    expect(withSettings.activity.preferredView).toBe('statistics')
    expect(withSettings.activity.lastSearch).toBe('guitar')
    expect(withSettings.activity.lastVisitedRoute).toBe('/stats')
    expect(withSettings.activity.lastActiveAt).toBe('2026-04-07T12:00:00.000Z')

    const viewed = appReducer(withSettings, {
      type: 'activity/trackViewedListing',
      payload: { listingId: 'listing_2' },
    })

    expect(viewed.activity.recentlyViewedListingIds[0]).toBe('listing_2')
  })

  it('returns previous state for unknown action type', () => {
    const state = createState()
    const next = appReducer(state, { type: 'unknown/action' } as never)
    expect(next).toEqual(state)
  })
})
