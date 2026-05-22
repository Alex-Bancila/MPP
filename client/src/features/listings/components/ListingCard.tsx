import { Link } from 'react-router-dom'

import type { Listing, User } from '@/shared/types/domain'
import { toRon } from '@/shared/utils/currency'

interface ListingCardProps {
  listing: Listing
  seller?: User
  showStatus?: boolean
  dimSold?: boolean
  isFavourite?: boolean
  onToggleFavourite?: (listingId: string) => void
}

const PentagramIcon = ({ active }: { active: boolean }) => {
  const fill = active ? '#C0392B' : 'transparent'
  const stroke = active ? '#C0392B' : '#F0F0F0'

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.3" fill="none" stroke={stroke} strokeWidth="1.3" />
      <polygon
        points="12,2.6 14.9,9 21.9,9.8 16.7,14.2 18.4,20.4 12,16.9 5.6,20.4 7.3,14.2 2.1,9.8 9.1,9"
        fill="none"
        stroke={stroke}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M7.6 6.8 L5.8 9.7 L8.9 9.1"
        fill="none"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.4 6.8 L15.1 9.1 L18.2 9.7"
        fill="none"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.6 L9.2 13.2 L10.1 17 L12 18.2 L13.9 17 L14.8 13.2 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M11.4 13.6 L12 15.8 L12.6 13.6"
        fill="none"
        stroke={stroke}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const ListingCard = ({
  listing,
  seller,
  showStatus = false,
  dimSold = false,
  isFavourite = false,
  onToggleFavourite,
}: ListingCardProps) => {
  const statusClassName =
    listing.status === 'Sold' ? 'mc-status-pill mc-status-pill--sold' : 'mc-status-pill mc-status-pill--active'

  const cardClassName = [
    'mc-listing-card',
    'mc-card',
    dimSold && listing.status === 'Sold' ? 'mc-listing-card--sold' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={cardClassName}>
      {dimSold && listing.status === 'Sold' ? <span className="mc-listing-card__sold-ribbon">Sold</span> : null}

      {onToggleFavourite ? (
        <button
          type="button"
          className={isFavourite ? 'mc-listing-card__fav-btn mc-listing-card__fav-btn--active' : 'mc-listing-card__fav-btn'}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onToggleFavourite(listing.id)
          }}
          aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <PentagramIcon active={isFavourite} />
        </button>
      ) : null}

      <Link to={`/listings/${listing.id}`} className="mc-listing-card__link">
        <img className="mc-listing-card__image" src={listing.photos[0]} alt={listing.title} />
        <div className="mc-listing-card__content">
          <h3 className="mc-listing-card__title" title={listing.title}>
            {listing.title}
          </h3>
          <div className="mc-price">{toRon(listing.price)}</div>

          <div className="mc-listing-card__footer">
            <span className="mc-listing-card__badges">
              <span className="mc-tag">{listing.category}</span>
              {showStatus ? <span className={statusClassName}>{listing.status}</span> : null}
            </span>
            {seller ? (
              <span className="mc-listing-card__seller">
                <img className="mc-avatar" src={seller.avatarUrl} alt={seller.username} />
                {seller.username}
              </span>
            ) : (
              <span className="mc-listing-card__seller">Unknown seller</span>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
}
