import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { LoginPage } from '@/pages/LoginPage'
import { AuthLayout } from '@/shared/components/layout/AuthLayout'
import { initialAppState } from '@/shared/data/seed'
import { verifyPassword } from '@/shared/utils/hash'

vi.mock('@/features/sync/serverClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/sync/serverClient')>()
  return {
    ...actual,
    loginServerUser: vi.fn(async (input) => {
      const user = initialAppState.users.find((u) => u.email === input.email)
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new Error('Invalid email or password.')
      }
      return user
    }),
  }
})

const renderAuthRoutes = (initialPath = '/login') => {
  const router = createMemoryRouter(
    [
      {
        path: '/login',
        element: (
          <AuthLayout showNavigation>
            <LoginPage />
          </AuthLayout>
        ),
      },
      {
        path: '/forgot-password',
        element: (
          <AuthLayout>
            <ForgotPasswordPage />
          </AuthLayout>
        ),
      },
      { path: '/register', element: <h1>Register Route</h1> },
      { path: '/stats', element: <h1>Stats Route</h1> },
      { path: '/listings', element: <h1>Listings Route</h1> },
    ],
    { initialEntries: [initialPath] },
  )

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    window.localStorage.removeItem('music-core.currentUserId')
  })

  it('renders expected fields and controls', () => {
    renderAuthRoutes()

    expect(screen.getByText('MUSIC CORE')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument()
  })

  it('routes to forgot-password page from the link', async () => {
    const user = userEvent.setup()
    renderAuthRoutes()

    await user.click(screen.getByRole('link', { name: 'Forgot password?' }))

    expect(await screen.findByRole('heading', { name: 'Forgot your password?' })).toBeInTheDocument()
  })

  it('routes to register page from footer link', async () => {
    const user = userEvent.setup()
    renderAuthRoutes()

    await user.click(screen.getByRole('link', { name: 'Register' }))

    expect(await screen.findByRole('heading', { name: 'Register Route' })).toBeInTheDocument()
  })

  it('keeps user on login page when clicking login button', async () => {
    const user = userEvent.setup()
    renderAuthRoutes()

    await user.type(screen.getByLabelText('Email'), 'alex@musiccore.local')
    await user.type(screen.getByLabelText('Password'), 'RiffMaster123!')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByRole('heading', { name: 'Listings Route' })).toBeInTheDocument()
  })

  it('shows auth header navigation links', async () => {
    const user = userEvent.setup()
    renderAuthRoutes()

    expect(screen.getByRole('link', { name: 'Music Core' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Statistics' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Browse' }))
    expect(await screen.findByRole('heading', { name: 'Listings Route' })).toBeInTheDocument()
  })
})
