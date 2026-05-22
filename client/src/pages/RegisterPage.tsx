import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { registerSchema } from '@/features/auth/authSchema'
import { useAuth } from '@/features/auth/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'

const UserIcon = () => {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M12 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 10c4.96 0 9 2.24 9 5v1h-1v-1c0-2.02-3.36-4-8-4s-8 1.98-8 4v1H3v-1c0-2.76 4.04-5 9-5Z"
        fill="currentColor"
      />
    </svg>
  )
}

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

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { currentUser, register } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'username' | 'email' | 'password' | 'confirmPassword', string>>
  >({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (currentUser) {
      navigate('/listings', { replace: true })
    }
  }, [currentUser, navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setFieldErrors({})

    const parsed = registerSchema.safeParse({
      username,
      email,
      password,
    })

    const nextErrors: Partial<Record<'username' | 'email' | 'password' | 'confirmPassword', string>> = {}

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (field === 'username' || field === 'email' || field === 'password') {
          nextErrors[field] = nextErrors[field] ?? issue.message
        }
      })
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    const result = await register({
      username: username.trim(),
      email: email.trim(),
      password,
    })

    if (!result.ok) {
      setFormError(result.message ?? 'Unable to register right now.')
      return
    }

    navigate('/listings')
  }

  return (
    <section className="mc-auth-page" aria-labelledby="register-title">
      <p className="mc-auth-page__brand">MUSIC CORE</p>

      <div className="mc-auth-panel">
        <h1 id="register-title" className="mc-visually-hidden">
          Register
        </h1>

        <form
          className="mc-auth-panel__form mc-auth-panel__form--register"
          onSubmit={handleSubmit}
          noValidate
        >
          <Input
            label="Username"
            placeholder="Enter your username"
            autoComplete="username"
            icon={<UserIcon />}
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={fieldErrors.username}
          />

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
            autoComplete="new-password"
            icon={<LockIcon />}
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            icon={<LockIcon />}
            name="confirmPassword"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={fieldErrors.confirmPassword}
          />

          {formError ? <p className="mc-auth-panel__error">{formError}</p> : null}

          <div className="mc-auth-panel__actions mc-auth-panel__actions--register">
            <Button type="submit" fullWidth className="mc-auth-panel__submit">
              Register
            </Button>
          </div>
        </form>

        <p className="mc-auth-panel__footer mc-auth-panel__footer--register">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </section>
  )
}
