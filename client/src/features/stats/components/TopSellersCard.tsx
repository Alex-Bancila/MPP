import type { TopSellerRow } from '@/app/store/selectors'

interface TopSellersCardProps {
  rows: TopSellerRow[]
}

export const TopSellersCard = ({ rows }: TopSellersCardProps) => {
  return (
    <section className="mc-top-sellers">
      <h2 className="mc-top-sellers__title">Top Sellers</h2>

      {rows.length === 0 ? (
        <div className="mc-empty">Top seller ranking appears after listing activity.</div>
      ) : (
        <div className="mc-top-sellers__list">
          {rows.map((row) => {
            const itemClassName =
              row.rank === 1
                ? 'mc-top-sellers__item mc-top-sellers__item--leader'
                : 'mc-top-sellers__item'

            return (
              <article key={row.seller.id} className={itemClassName}>
                <div className="mc-top-sellers__identity">
                  <span className="mc-top-sellers__rank">#{row.rank}</span>
                  <img
                    className="mc-top-sellers__avatar"
                    src={row.seller.avatarUrl}
                    alt={row.seller.username}
                  />
                  <div className="mc-top-sellers__text">
                    <p className="mc-top-sellers__username">{row.seller.username}</p>
                    <p className="mc-top-sellers__count">{row.listingCount} listings</p>
                  </div>
                </div>

                <p className="mc-top-sellers__rating">
                  <span aria-hidden="true">★</span> {row.rating}
                </p>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
