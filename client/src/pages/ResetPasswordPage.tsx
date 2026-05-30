import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { resetPassword } from '@/features/sync/serverClient'

export const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialToken = searchParams.get('token') ?? ''

  const [token, setToken] = useState(initialToken)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!token.trim()) {
      setError('Reset token is required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const ok = await resetPassword({ token: token.trim(), password })
    setLoading(false)

    if (!ok) {
      setError('Unable to reset password. Check the token and try again.')
      return
    }

    setSuccess('Password reset complete. You can now log in.')
    setTimeout(() => navigate('/login'), 800)
  }

  return (
    <section className="mc-auth-page" aria-labelledby="reset-password-title">
      <p className="mc-auth-page__brand">MUSIC CORE</p>

      <div className="mc-auth-panel">
        <h1 id="reset-password-title" className="mc-visually-hidden">
          Reset Password
        </h1>

        <form className="mc-auth-panel__form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Reset Token"
            placeholder="Paste the token from the console"
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

          {error ? <p className="mc-auth-panel__error">{error}</p> : null}
          {success ? <p className="mc-auth-panel__subtitle">{success}</p> : null}

          <div className="mc-auth-panel__actions">
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>

        <p className="mc-auth-panel__footer">
          Remembered it? <Link to="/login">Back to login</Link>
        </p>
      </div>
    </section>
  )
}
