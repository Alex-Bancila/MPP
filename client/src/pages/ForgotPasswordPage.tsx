import { Link } from 'react-router-dom'

import { Button } from '@/shared/components/ui/Button'

export const ForgotPasswordPage = () => {
  return (
    <section className="mc-auth-page" aria-labelledby="forgot-password-title">
      <p className="mc-auth-page__brand">MUSIC CORE</p>

      <div className="mc-auth-panel mc-auth-panel--placeholder">
        <header className="mc-auth-panel__header">
          <h1 id="forgot-password-title" className="mc-auth-panel__title">
            Forgot your password?
          </h1>
          <p className="mc-auth-panel__subtitle">
            Password reset is not implemented yet. Please check back later.
          </p>
        </header>

        <div className="mc-auth-panel__actions">
          <Link to="/login" className="mc-auth-panel__link-wrap">
            <Button type="button" fullWidth>
              Back to Login
            </Button>
          </Link>
        </div>

        <p className="mc-auth-panel__footer">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </section>
  )
}
