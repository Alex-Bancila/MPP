import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAppStore } from '@/app/store/useAppStore'
import { getCurrentUser, isListingFavouriteForUser } from '@/app/store/selectors'
import { clearActivityCookies } from '@/features/activity/cookies'
import { ListingCard } from '@/features/listings/components/ListingCard'
import { useProfile } from '@/features/profile/useProfile'
import { Button } from '@/shared/components/ui/Button'
import { ALL_CATEGORIES_FILTER } from '@/shared/constants/categories'

export const ProfilePage = () => {
  const navigate = useNavigate()
  const params = useParams<{ username: string }>()
  const { state, dispatch } = useAppStore()
  const { user, listings } = useProfile(params.username)
  const actor = getCurrentUser(state)
  const [activityResetMessage, setActivityResetMessage] = useState('')
  const hasAnySoldListings = listings.some((listing) => listing.status === 'Sold')

  const resetPreferences = () => {
    if (!actor) {
      return
    }
    clearActivityCookies()

    dispatch({
      type: 'activity/set',
      payload: {
        preferredCategory: ALL_CATEGORIES_FILTER,
        preferredView: 'listings',
        lastSearch: '',
        recentlyViewedListingIds: [],
        lastVisitedRoute: '/listings',
        lastActiveAt: new Date().toISOString(),
      },
    })

    setActivityResetMessage('Preferences reset. Reload to verify default cookie values.')
  }

  const toggleFavourite = (listingId: string) => {
    if (!actor) {
      navigate('/login', { state: { returnTo: `/profile/${params.username}` } })
      return
    }

    dispatch({
      type: 'favourite/toggle',
      payload: {
        userId: actor.id,
        listingId,
      },
    })
  }

  if (!user) {
    return (
      <section className="mc-page">
        <div className="mc-empty">User profile not found.</div>
      </section>
    )
  }

  return (
    <section className="mc-page">
      <header className="mc-page__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={user.avatarUrl} alt={user.username} style={{ width: 64, borderRadius: '9999px' }} />
          <div>
            <h1 className="mc-page__title">{user.username}</h1>
            <p className="mc-page__subtitle">Public profile and marketplace listings from this user.</p>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button variant="ghost" onClick={resetPreferences}>
                Reset Preferences Cookie
              </Button>
              {activityResetMessage ? <span className="mc-page__subtitle">{activityResetMessage}</span> : null}
            </div>
          </div>
        </div>

        <Button variant="ghost" onClick={() => navigate('/listings')}>
          Back to Listings
        </Button>
      </header>

      {hasAnySoldListings ? (
        <p className="mc-page__subtitle">
          Sold items are dimmed and marked with an orange ribbon for quick visibility.
        </p>
      ) : null}

      {listings.length === 0 ? (
        <div className="mc-empty">No listings from this user yet.</div>
      ) : (
        <div className="mc-grid mc-grid--cards">
          {listings.map((listing) => {
            return (
              <ListingCard
                key={listing.id}
                listing={listing}
                seller={state.users.find((row) => row.id === listing.sellerId)}
                showStatus
                dimSold
                isFavourite={actor ? isListingFavouriteForUser(state, actor.id, listing.id) : false}
                onToggleFavourite={toggleFavourite}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
