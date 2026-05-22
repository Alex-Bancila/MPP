import Cookies from 'js-cookie'

import {
  ALL_CATEGORIES_FILTER,
  LISTING_CATEGORIES,
  type ListingCategoryFilter,
} from '@/shared/constants/categories'
import type { ActivityPreferences, AppView, ListingsLayout } from '@/shared/types/domain'

export const ACTIVITY_COOKIE_KEY = 'music-core.activity'
const ACTIVITY_COOKIE_VERSION = 3
const MAX_RECENTLY_VIEWED = 8
const LEGACY_COOKIE_PATHS = [
  '/listings',
  '/stats',
  '/profile',
  '/favourites',
  '/messages',
  '/login',
  '/register',
]

const isAppView = (value: unknown): value is AppView => {
  return value === 'listings' || value === 'statistics'
}

const isListingsLayout = (value: unknown): value is ListingsLayout => {
  return value === 'cards' || value === 'table'
}

const isCategoryFilter = (value: unknown): value is ListingCategoryFilter => {
  return value === ALL_CATEGORIES_FILTER || LISTING_CATEGORIES.includes(value as never)
}

const sanitize = (raw: unknown): ActivityPreferences | undefined => {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }

  const maybe = raw as Partial<ActivityPreferences>

  if (!isCategoryFilter(maybe.preferredCategory)) {
    return undefined
  }

  if (!isAppView(maybe.preferredView)) {
    return undefined
  }

  if (typeof maybe.lastSearch !== 'string') {
    return undefined
  }

  if (typeof maybe.lastVisitedRoute !== 'string') {
    return undefined
  }

  if (typeof maybe.lastActiveAt !== 'string') {
    return undefined
  }

  if (!Array.isArray(maybe.recentlyViewedListingIds)) {
    return undefined
  }

  if (!maybe.recentlyViewedListingIds.every((value) => typeof value === 'string')) {
    return undefined
  }

  return {
    preferredCategory: maybe.preferredCategory,
    preferredView: maybe.preferredView,
    preferredListingsLayout: isListingsLayout(maybe.preferredListingsLayout)
      ? maybe.preferredListingsLayout
      : 'cards',
    lastSearch: maybe.lastSearch.slice(0, 120),
    recentlyViewedListingIds: maybe.recentlyViewedListingIds.slice(0, MAX_RECENTLY_VIEWED),
    lastVisitedRoute: maybe.lastVisitedRoute,
    lastActiveAt: maybe.lastActiveAt,
  }
}

interface LegacyActivityCookie {
  preferredCategory?: unknown
  preferredView?: unknown
  lastSearch?: unknown
  recentlyViewedListingIds?: unknown
}

interface VersionedActivityCookie {
  version?: unknown
  payload?: unknown
}

const isVersionedCookie = (raw: unknown): raw is VersionedActivityCookie => {
  if (!raw || typeof raw !== 'object') {
    return false
  }

  const maybe = raw as VersionedActivityCookie
  return typeof maybe.version === 'number' && 'payload' in maybe
}

const fromLegacy = (raw: LegacyActivityCookie): ActivityPreferences | undefined => {
  if (!isCategoryFilter(raw.preferredCategory)) {
    return undefined
  }

  if (!isAppView(raw.preferredView)) {
    return undefined
  }

  if (typeof raw.lastSearch !== 'string') {
    return undefined
  }

  if (!Array.isArray(raw.recentlyViewedListingIds)) {
    return undefined
  }

  if (!raw.recentlyViewedListingIds.every((value) => typeof value === 'string')) {
    return undefined
  }

  return {
    preferredCategory: raw.preferredCategory,
    preferredView: raw.preferredView,
    preferredListingsLayout: 'cards',
    lastSearch: raw.lastSearch.slice(0, 120),
    recentlyViewedListingIds: raw.recentlyViewedListingIds.slice(0, MAX_RECENTLY_VIEWED),
    lastVisitedRoute: '/listings',
    lastActiveAt: new Date().toISOString(),
  }
}

export const readActivityCookies = (): ActivityPreferences | undefined => {
  const rawCookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith(`${ACTIVITY_COOKIE_KEY}=`))
    .map((entry) => entry.slice(ACTIVITY_COOKIE_KEY.length + 1))
    .pop()

  if (!rawCookie) {
    return undefined
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawCookie))

    if (isVersionedCookie(parsed)) {
      if (parsed.version !== ACTIVITY_COOKIE_VERSION) {
        return undefined
      }

      return sanitize(parsed.payload)
    }

    return fromLegacy(parsed as LegacyActivityCookie)
  } catch {
    return undefined
  }
}

export const clearActivityCookies = (): void => {
  Cookies.remove(ACTIVITY_COOKIE_KEY)
  Cookies.remove(ACTIVITY_COOKIE_KEY, { path: '/' })

  LEGACY_COOKIE_PATHS.forEach((path) => {
    Cookies.remove(ACTIVITY_COOKIE_KEY, { path })
  })
}

export const writeActivityCookies = (value: ActivityPreferences): void => {
  LEGACY_COOKIE_PATHS.forEach((path) => {
    Cookies.remove(ACTIVITY_COOKIE_KEY, { path })
  })

  const payload = {
    version: ACTIVITY_COOKIE_VERSION,
    payload: {
      ...value,
      lastSearch: value.lastSearch.slice(0, 120),
      recentlyViewedListingIds: value.recentlyViewedListingIds.slice(0, MAX_RECENTLY_VIEWED),
    },
  }

  Cookies.set(ACTIVITY_COOKIE_KEY, JSON.stringify(payload), {
    path: '/',
    sameSite: 'strict',
    expires: 30,
    secure: window.location.protocol === 'https:',
  })
}
