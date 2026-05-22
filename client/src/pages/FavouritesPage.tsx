import { useNavigate } from 'react-router-dom'

import { useAppStore } from '@/app/store/useAppStore'
import { getCurrentUser, getUserById } from '@/app/store/selectors'
import { ListingCard } from '@/features/listings/components/ListingCard'
import { useFavourites } from '@/features/favourites/useFavourites'
import { Button } from '@/shared/components/ui/Button'

export const FavouritesPage = () => {
  const navigate = useNavigate()
  const { state } = useAppStore()
  const currentUser = getCurrentUser(state)
  const { rows, toggle } = useFavourites()

  if (!currentUser) {
    return (
      <section className="mc-page">
        <div className="mc-empty">
          You must be logged in to view favourites.
          <button className="mc-button mc-button--primary" style={{ marginTop: '12px' }} onClick={() => navigate('/login', { state: { returnTo: '/favourites' } })}>
            Login
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mc-page">
      <header className="mc-page__header">
        <div>
          <h1 className="mc-page__title">Favourites</h1>
          <p className="mc-page__subtitle">Your saved listings in one place.</p>
        </div>

        <Button variant="ghost" onClick={() => navigate('/listings')}>
          Back to Listings
        </Button>
      </header>

      {rows.length === 0 ? (
        <div className="mc-empty">No favourites yet. Add listings from the detail page.</div>
      ) : (
        <div className="mc-grid mc-grid--cards">
          {rows.map((listing) => {
            return (
              <ListingCard
                key={listing.id}
                listing={listing}
                seller={getUserById(state, listing.sellerId)}
                showStatus
                dimSold
                isFavourite
                onToggleFavourite={toggle}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
