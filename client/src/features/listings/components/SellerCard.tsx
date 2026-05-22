import type { User } from '@/shared/types/domain'

interface SellerCardProps {
  seller: User
}

export const SellerCard = ({ seller }: SellerCardProps) => {
  return (
    <section className="mc-detail__seller">
      <img className="mc-avatar" src={seller.avatarUrl} alt={seller.username} />
      <div>
        <p>{seller.username}</p>
        <p className="mc-page__subtitle">Seller</p>
      </div>
    </section>
  )
}
