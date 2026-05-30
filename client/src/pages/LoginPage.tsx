import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { loginSchema } from '@/features/auth/authSchema'
import { useAuth } from '@/features/auth/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'

const MailIcon = () => {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 1v.2L12 13l8-5.8V7H4Zm16 10V8l-7.4 5.4a1 1 0 0 1-1.2 0L4 8v9h16Z"
        fill="currentColor"
      />
    </svg>
  )
}

const LockIcon = () => {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M12 2a5 5 0 0 1 5 5v2h1a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-8a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5Zm6 8H6a1 1 0 0 0-1 1v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a1 1 0 0 0-1-1Zm-6-7a4 4 0 0 0-4 4v2h8V7a4 4 0 0 0-4-4Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const LoginPage = () => {
  const navigate = useNavigate()
  const { currentUser, login, loginWithMagic, requestMagic } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'email' | 'password', string>>>({})
  const [formError, setFormError] = useState('')
  const [activeTab, setActiveTab] = useState<'password' | 'magic'>('password')
  const [magicEmail, setMagicEmail] = useState('')
  const [magicToken, setMagicToken] = useState('')
  const [magicMessage, setMagicMessage] = useState('')

  useEffect(() => {
    if (currentUser) {
      navigate('/listings', { replace: true })
    }
  }, [currentUser, navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setFieldErrors({})

    const parsed = loginSchema.safeParse({
      email,
      password,
    })

    if (!parsed.success) {
      const nextErrors: Partial<Record<'email' | 'password', string>> = {}

      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (field === 'email' || field === 'password') {
          nextErrors[field] = nextErrors[field] ?? issue.message
        }
      })

      setFieldErrors(nextErrors)
      return
    }

    const result = await login(parsed.data)
    if (!result.ok) {
      setFormError(result.message ?? 'Unable to login right now.')
      return
    }

    navigate('/listings')
  }

  const handleMagicRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMagicMessage('')
    if (!magicEmail.trim()) {
      setMagicMessage('Enter your email to request a magic link.')
      return
    }
    const result = await requestMagic(magicEmail.trim())
    if (!result.ok) {
      setMagicMessage(result.message ?? 'Unable to request magic link.')
      return
    }
    setMagicMessage('Magic link sent. Check the server console for the token.')
  }

  const handleMagicVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMagicMessage('')
    if (!magicToken.trim()) {
      setMagicMessage('Paste the magic token from the console.')
      return
    }
    const result = await loginWithMagic(magicToken.trim())
    if (!result.ok) {
      setMagicMessage(result.message ?? 'Magic login failed.')
      return
    }
    navigate('/listings')
  }

  return (
    <section className="mc-auth-page" aria-labelledby="login-title">
      <p className="mc-auth-page__brand">MUSIC CORE</p>

      <div className="mc-auth-panel">
        <h1 id="login-title" className="mc-visually-hidden">
          Login
        </h1>

        <div className="mc-tabs" role="tablist" aria-label="Login methods">
          <button
            type="button"
            className={`mc-tab ${activeTab === 'password' ? 'mc-tab--active' : ''}`}
            onClick={() => setActiveTab('password')}
            role="tab"
            aria-selected={activeTab === 'password'}
          >
            Password
          </button>
          <button
            type="button"
            className={`mc-tab ${activeTab === 'magic' ? 'mc-tab--active' : ''}`}
            onClick={() => setActiveTab('magic')}
            role="tab"
            aria-selected={activeTab === 'magic'}
          >
            Magic Link
          </button>
        </div>

        {activeTab === 'password' ? (
          <form
            className="mc-auth-panel__form"
            onSubmit={handleSubmit}
            noValidate
          >
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              icon={<MailIcon />}
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldErrors.email}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              icon={<LockIcon />}
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
            />

            {formError ? <p className="mc-auth-panel__error">{formError}</p> : null}

            <p className="mc-auth-panel__forgot-wrap">
              <Link to="/forgot-password" className="mc-auth-panel__forgot-link">
                Forgot password?
              </Link>
            </p>

            <div className="mc-auth-panel__actions">
              <Button type="submit" fullWidth className="mc-auth-panel__submit">
                Login
              </Button>
            </div>
          </form>
        ) : (
          <div className="mc-auth-panel__form">
            <form onSubmit={handleMagicRequest} noValidate>
              <Input
                label="Email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                icon={<MailIcon />}
                name="magicEmail"
                value={magicEmail}
                onChange={(event) => setMagicEmail(event.target.value)}
              />
              <div className="mc-auth-panel__actions">
                <Button type="submit" fullWidth>
                  Send magic link
                </Button>
              </div>
            </form>

            <form onSubmit={handleMagicVerify} noValidate style={{ marginTop: '16px' }}>
              <Input
                label="Magic token"
                placeholder="Paste the token from the console"
                name="magicToken"
                value={magicToken}
                onChange={(event) => setMagicToken(event.target.value)}
              />
              <div className="mc-auth-panel__actions">
                <Button type="submit" fullWidth>
                  Verify token
                </Button>
              </div>
            </form>

            {magicMessage ? <p className="mc-auth-panel__subtitle">{magicMessage}</p> : null}
          </div>
        )}

        <p className="mc-auth-panel__footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>

        <div className="mc-auth-panel__actions" style={{ marginTop: '12px' }}>
          <Button
            type="button"
            fullWidth
            variant="secondary"
            onClick={() => {
              window.location.href = '/auth/github'
            }}
          >
            Continue with GitHub
          </Button>
        </div>
      </div>
    </section>
  )
}
