import Cookies from 'js-cookie'
import { afterEach, describe, expect, it } from 'vitest'

import {
  ACTIVITY_COOKIE_KEY,
  clearActivityCookies,
  readActivityCookies,
  writeActivityCookies,
} from '@/features/activity/cookies'
import { initialAppState } from '@/shared/data/seed'

describe('activity cookies', () => {
  afterEach(() => {
    clearActivityCookies()
  })

  it('writes and reads a versioned cookie payload', () => {
    const activity = {
      ...initialAppState.activity,
      preferredCategory: 'Creating' as const,
      lastSearch: 'guitar case',
      recentlyViewedListingIds: ['listing_2', 'listing_5'],
      lastVisitedRoute: '/listings?query=guitar',
      lastActiveAt: new Date('2026-04-07T10:30:00.000Z').toISOString(),
    }

    writeActivityCookies(activity)
    const hydrated = readActivityCookies()

    expect(hydrated).toEqual(activity)
  })

  it('migrates legacy cookie format to defaults for new fields', () => {
    Cookies.set(
      ACTIVITY_COOKIE_KEY,
      JSON.stringify({
        preferredCategory: 'Listening',
        preferredView: 'listings',
        lastSearch: 'vinyl',
        recentlyViewedListingIds: ['listing_3'],
      }),
      { path: '/' },
    )

    const hydrated = readActivityCookies()

    expect(hydrated?.preferredCategory).toBe('Listening')
    expect(hydrated?.preferredListingsLayout).toBe('cards')
    expect(hydrated?.lastSearch).toBe('vinyl')
    expect(hydrated?.lastVisitedRoute).toBe('/listings')
    expect(hydrated?.lastActiveAt).toBeTruthy()
  })

  it('rejects invalid cookie payload and removes cookie', () => {
    Cookies.set(ACTIVITY_COOKIE_KEY, 'not-json', { path: '/' })

    expect(readActivityCookies()).toBeUndefined()

    clearActivityCookies()
    expect(Cookies.get(ACTIVITY_COOKIE_KEY)).toBeUndefined()
  })
})
