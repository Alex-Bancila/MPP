import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { requestPasswordReset, resetPassword } from '@/features/sync/serverClient'

export const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [tokenSent, setTokenSent] = useState(false)
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  const handleRequestToken = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    const ok = await requestPasswordReset({ email: email.trim() })
    setLoading(false)
    if (!ok) {
      setError('Unable to request a password reset. Try again.')
      return
    }
    setTokenSent(true)
  }

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResetError(null)
    if (!token.trim()) {
      setResetError('Paste the token from the server console.')
      return
    }
    if (password.length < 8) {
      setResetError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setResetError('Passwords do not match.')
      return
    }
    setResetLoading(true)
    const ok = await resetPassword({ token: token.trim(), password })
    setResetLoading(false)
    if (!ok) {
      setResetError('Invalid or expired token. Request a new one.')
      return
    }
    navigate('/login')
  }

  return (
    <section className="mc-auth-page" aria-labelledby="forgot-password-title">
      <p className="mc-auth-page__brand">MUSIC CORE</p>

      <div className="mc-auth-panel">
        <header className="mc-auth-panel__header">
          <h1 id="forgot-password-title" className="mc-auth-panel__title">
            Forgot your password?
          </h1>
          <p className="mc-auth-panel__subtitle">
            {tokenSent
              ? 'Token sent. Check the server console, then enter it below.'
              : 'Enter your email and we will generate a reset token.'}
          </p>
        </header>

        {!tokenSent ? (
          <form className="mc-auth-panel__form" onSubmit={handleRequestToken} noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {error ? <p className="mc-auth-panel__error">{error}</p> : null}
            <div className="mc-auth-panel__actions">
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Sending...' : 'Send reset token'}
              </Button>
            </div>
          </form>
        ) : (
          <form className="mc-auth-panel__form" onSubmit={handleReset} noValidate>
            <Input
              label="Reset Token"
              placeholder="Paste the token from the server console"
              name="token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Enter your new password"
              autoComplete="new-password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your new password"
              autoComplete="new-password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {resetError ? <p className="mc-auth-panel__error">{resetError}</p> : null}
            <div className="mc-auth-panel__actions">
              <Button type="submit" fullWidth disabled={resetLoading}>
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
            <div className="mc-auth-panel__actions" style={{ marginTop: '8px' }}>
              <Button type="button" fullWidth variant="ghost" onClick={() => setTokenSent(false)}>
                Use a different email
              </Button>
            </div>
          </form>
        )}

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
