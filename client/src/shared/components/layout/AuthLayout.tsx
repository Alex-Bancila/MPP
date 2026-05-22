import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

interface AuthLayoutProps {
  children: ReactNode
  showNavigation?: boolean
}

const authNavLinkClassName = ({ isActive }: { isActive: boolean }) => {
  return isActive ? 'mc-auth-nav__link mc-auth-nav__link--active' : 'mc-auth-nav__link'
}

export const AuthLayout = ({ children, showNavigation = false }: AuthLayoutProps) => {
  return (
    <div className="mc-auth-shell">
      {showNavigation ? (
        <header className="mc-auth-nav" aria-label="Authentication navigation">
          <NavLink to="/" className="mc-auth-nav__brand" end>
            Music Core
          </NavLink>

          <nav className="mc-auth-nav__links" aria-label="Mock auth quick navigation">
            <NavLink to="/" className={authNavLinkClassName} end>
              Home
            </NavLink>
            <NavLink to="/listings" className={authNavLinkClassName}>
              Browse
            </NavLink>
            <NavLink to="/stats" className={authNavLinkClassName}>
              Statistics
            </NavLink>
          </nav>
        </header>
      ) : null}

      <main className="mc-auth-main">{children}</main>
    </div>
  )
}
