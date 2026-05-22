import type { ReactNode } from 'react'

import { LandingNavbar } from '@/shared/components/layout/LandingNavbar'

interface LandingLayoutProps {
  children: ReactNode
}

export const LandingLayout = ({ children }: LandingLayoutProps) => {
  return (
    <div className="mc-landing-shell">
      <LandingNavbar />
      <main className="mc-landing-main">{children}</main>
    </div>
  )
}
