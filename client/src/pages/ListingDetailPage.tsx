import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAppStore } from '@/app/store/useAppStore'
import {
  getCurrentUser,
  getListingById,
  getReviewSummaryForListing,
  getReviewsForListing,
  getUserById,
} from '@/app/store/selectors'
import { DeleteListingModal } from '@/features/listings/components/DeleteListingModal'
import { ListingGallery } from '@/features/listings/components/ListingGallery'
import { SellerCard } from '@/features/listings/components/SellerCard'
import { useListings } from '@/features/listings/useListings'
import { ReviewForm } from '@/features/reviews/components/ReviewForm'
import { GearDnaCard } from '@/features/stats/components/GearDnaCard'
import { computeGearDna } from '@/features/stats/gearDna'
import { useAuth } from '@/features/auth/useAuth'
import { useMessaging } from '@/features/messaging/useMessaging'
import { Button } from '@/shared/components/ui/Button'
import { toRon } from '@/shared/utils/currency'
import { toDisplayDate } from '@/shared/utils/date'

export const ListingDetailPage = () => {
  const navigate = useNavigate()
  const params = useParams<{ listingId: string }>()
  const { state, dispatch } = useAppStore()
  const { deleteListing, isFavourite, toggleFavourite, createReview, updateReview, deleteReview } = useListings()
  const { sendMessage } = useMessaging()
  const { hasPermission, isAdmin } = useAuth()

  const [showDelete, setShowDelete] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const listing = useMemo(() => {
    if (!params.listingId) {
      return undefined
    }
    return getListingById(state, params.listingId)
  }, [params.listingId, state])

  useEffect(() => {
    if (!listing) {
      return
    }

    dispatch({
      type: 'activity/trackViewedListing',
      payload: { listingId: listing.id },
    })
  }, [dispatch, listing])

  const currentUser = getCurrentUser(state)
  const seller = listing ? getUserById(state, listing.sellerId) : undefined
  const ownedByCurrentUser = currentUser && listing ? currentUser.id === listing.sellerId : false
  const favourite = listing ? isFavourite(listing.id) : false
  const reviews = listing ? getReviewsForListing(state, listing.id) : []
  const reviewSummary = listing ? getReviewSummaryForListing(state, listing.id) : { count: 0, averageRating: 0 }
  const sellerListings = useMemo(() => {
    if (!listing) {
      return []
    }
    return state.listings.filter((row) => row.sellerId === listing.sellerId)
  }, [listing, state.listings])
  const gearDnaSignals = useMemo(() => computeGearDna(sellerListings), [sellerListings])

  if (!listing) {
    return (
      <section className="mc-page">
        <div className="mc-empty">Listing not found.</div>
      </section>
    )
  }

  if (!seller) {
    return (
      <section className="mc-page">
        <div className="mc-empty">Seller data is still syncing. Please try again in a moment.</div>
      </section>
    )
  }

  const requireAuth = (): boolean => {
    if (!currentUser) {
      navigate('/login', { state: { returnTo: `/listings/${listing.id}` } })
      return false
    }
    return true
  }

  const sendQuickMessage = async () => {
    if (!requireAuth() || !currentUser) return

    if (currentUser.id === seller.id) {
      setActionMessage('You cannot message your own listing.')
      return
    }

    const result = await sendMessage(
      listing.id,
      seller.id,
      `Hey ${seller.username}, I am interested in ${listing.title}. Is it still available?`,
      currentUser.id,
    )

    if (result.ok) {
      setActionMessage(null)
      navigate('/messages')
      return
    }

    setActionMessage(result.message ?? 'Unable to send message.')
  }

  const handleToggleFavourite = () => {
    if (!requireAuth()) return
    toggleFavourite(listing.id)
  }

  return (
    <section className="mc-page">
      <header className="mc-page__header">
        <div>
          <h1 className="mc-page__title">Listing detail</h1>
          <p className="mc-page__subtitle">Posted on {toDisplayDate(listing.datePosted)}</p>
        </div>
        <Link to="/listings">
          <Button variant="ghost">Back to Listings</Button>
        </Link>
      </header>

      <div className="mc-detail">
        <ListingGallery photos={listing.photos} title={listing.title} />

        <aside className="mc-detail__panel">
          <div className="mc-tag">{listing.category}</div>
          <h2 className="mc-detail__title">{listing.title}</h2>
          <p className="mc-detail__price">{toRon(listing.price)}</p>
          <p className="mc-detail__description">{listing.description}</p>

          {actionMessage ? <p className="mc-auth-panel__error">{actionMessage}</p> : null}

          <SellerCard seller={seller} />

          <GearDnaCard data={gearDnaSignals} />

          <div className="mc-detail__actions">
            {!ownedByCurrentUser && listing.status === 'Active' ? (
              <>
                {hasPermission('chat:send') && (
                  <Button variant="primary" onClick={sendQuickMessage}>
                    Contact Seller
                  </Button>
                )}
                {hasPermission('favourite:toggle') && (
                  <Button variant="ghost" onClick={handleToggleFavourite}>
                    {favourite ? 'Remove Favourite' : 'Add to Favourites'}
                  </Button>
                )}
                {currentUser && (
                  <Button variant="ghost" onClick={() => navigate('/favourites')}>
                    View Favourites
                  </Button>
                )}
              </>
            ) : (ownedByCurrentUser || isAdmin) ? (
              <>
                {hasPermission('listing:update') && (
                  <Button variant="primary" onClick={() => navigate(`/listings/${listing.id}/edit`)}>
                    Edit Listing
                  </Button>
                )}
                {hasPermission('listing:delete') && (
                  <Button variant="secondary" onClick={() => setShowDelete(true)}>
                    Delete Listing
                  </Button>
                )}
              </>
            ) : (
              <div className="mc-tag">Sold</div>
            )}
          </div>
        </aside>
      </div>

      <section className="mc-detail__reviews">
        <header className="mc-page__header">
          <div>
            <h2 className="mc-page__title">Reviews</h2>
            <p className="mc-page__subtitle">
              {reviewSummary.count} reviews, average rating {reviewSummary.averageRating}
            </p>
          </div>
        </header>

        <div className="mc-grid mc-grid--cards">
          {reviews.length > 0 ? (
            reviews.map((review) => {
              const reviewer = getUserById(state, review.userId)

              return (
                <article key={review.id} className="mc-card" style={{ padding: '20px' }}>
                  <p className="mc-tag">{review.rating} / 5</p>
                  <h3 className="mc-listing-card__title" style={{ marginTop: '12px' }}>{review.title}</h3>
                  <p className="mc-page__subtitle" style={{ marginBottom: '12px' }}>
                    {reviewer?.username ?? 'Unknown user'}
                  </p>
                  <p>{review.body}</p>
                  {currentUser && review.userId === currentUser.id ? (
                    <div className="mc-form__actions" style={{ marginTop: '16px' }}>
                      {hasPermission('review:update') && (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setEditingReviewId(review.id)}
                        >
                          Edit
                        </Button>
                      )}
                      {hasPermission('review:delete') && (
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => {
                            if (requireAuth()) deleteReview(review.id)
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  ) : null}
                </article>
              )
            })
          ) : (
            <div className="mc-empty">No reviews yet.</div>
          )}
        </div>

        {currentUser && (hasPermission('review:create') || editingReviewId) && !ownedByCurrentUser ? (
          <article className="mc-card" style={{ padding: '24px', marginTop: '24px' }}>
            <h3 className="mc-page__title" style={{ fontSize: '20px' }}>
              {editingReviewId ? 'Edit your review' : 'Add a review'}
            </h3>
            <ReviewForm
              submitLabel={editingReviewId ? 'Save Review' : 'Add Review'}
              initialValues={
                editingReviewId
                  ? (() => {
                      const review = reviews.find((row) => row.id === editingReviewId)
                      return review
                        ? { rating: review.rating, title: review.title, body: review.body }
                        : undefined
                    })()
                  : undefined
              }
              onSubmit={(values) => {
                if (!requireAuth()) return
                if (editingReviewId) {
                  updateReview(editingReviewId, values)
                  setEditingReviewId(null)
                  return
                }
                createReview(listing.id, values)
              }}
            />
          </article>
        ) : null}
      </section>

      <DeleteListingModal
        isOpen={showDelete}
        title={listing.title}
        onCancel={() => setShowDelete(false)}
        onConfirm={() => {
          if (!requireAuth()) return
          const result = deleteListing(listing.id)
          if (result.ok) {
            setShowDelete(false)
            navigate('/listings')
          }
        }}
      />
    </section>
  )
}
