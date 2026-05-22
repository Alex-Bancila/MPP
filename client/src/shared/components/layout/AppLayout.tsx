import type { ReactNode } from 'react'

import { Navbar } from '@/shared/components/layout/Navbar'

interface AppLayoutProps {
  children: ReactNode
  wide?: boolean
}

export const AppLayout = ({ children, wide = false }: AppLayoutProps) => {
  const mainClassName = wide ? 'mc-main mc-main--wide' : 'mc-main'

  return (
    <div className="mc-app-shell">
      <Navbar />
      <main className={mainClassName}>{children}</main>
    </div>
  )
}
