import { useNavigate } from 'react-router-dom'

import { Hero } from '@/shared/components/branding/Hero'

export const LandingPage = () => {
  const navigate = useNavigate()

  return (
    <section className="mc-landing-page">
      <Hero onBrowseListings={() => navigate('/listings')} />
    </section>
  )
}
