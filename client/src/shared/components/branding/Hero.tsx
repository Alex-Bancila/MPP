import { Button } from '@/shared/components/ui/Button'

interface HeroProps {
  onBrowseListings: () => void
}

export const Hero = ({ onBrowseListings }: HeroProps) => {
  return (
    <section className="mc-landing-hero" aria-labelledby="landing-title">
      <h1 id="landing-title" className="mc-landing-hero__brand">
        MUSIC CORE
      </h1>
      <p className="mc-landing-hero__tagline">A chug for your breakdown</p>
      <p className="mc-landing-hero__description">
        The underground marketplace for musicians, buy and sell instruments, gear,
        vinyls and more.
      </p>

      <Button
        variant="primary"
        onClick={onBrowseListings}
        className="mc-landing-hero__browse"
      >
        Browse Listings
      </Button>
    </section>
  )
}
