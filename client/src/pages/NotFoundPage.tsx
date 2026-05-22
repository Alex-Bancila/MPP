import { Link } from 'react-router-dom'

import { Button } from '@/shared/components/ui/Button'

export const NotFoundPage = () => {
  return (
    <section className="mc-page">
      <header className="mc-page__header">
        <div>
          <h1 className="mc-page__title">Route not found</h1>
          <p className="mc-page__subtitle">The page you requested does not exist.</p>
        </div>
      </header>

      <div className="mc-empty">
        <p>Try returning to your listings dashboard.</p>
        <br />
        <Link to="/listings">
          <Button>Go to Listings</Button>
        </Link>
      </div>
    </section>
  )
}
