import { useNavigate } from 'react-router-dom'

import type { Listing } from '@/shared/types/domain'
import { toRon } from '@/shared/utils/currency'
import { toRelativeTime } from '@/shared/utils/date'

interface ListingsTableProps {
  listings: Listing[]
}

export const ListingsTable = ({ listings }: ListingsTableProps) => {
  const navigate = useNavigate()

  if (listings.length === 0) {
    return <div className="mc-empty">No listings match your filters yet.</div>
  }

  return (
    <table className="mc-listing-table">
      <thead>
        <tr>
          <th>Listing</th>
          <th>Category</th>
          <th>Price</th>
          <th>Status</th>
          <th>Posted</th>
          <th aria-label="Actions"></th>
        </tr>
      </thead>
      <tbody>
        {listings.map((listing) => {
          return (
            <tr key={listing.id}>
              <td>
                <div className="mc-listing-table__title">{listing.title}</div>
              </td>
              <td>{listing.category}</td>
              <td>{toRon(listing.price)}</td>
              <td>
                <span
                  className={
                    listing.status === 'Active'
                      ? 'mc-status-pill mc-status-pill--active'
                      : 'mc-status-pill mc-status-pill--sold'
                  }
                >
                  {listing.status}
                </span>
              </td>
              <td>{toRelativeTime(listing.datePosted)}</td>
              <td>
                <button
                  className="mc-button mc-button--ghost"
                  onClick={() => navigate(`/listings/${listing.id}`)}
                >
                  View
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
