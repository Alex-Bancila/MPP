import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers'
import { RegisterPage } from '@/pages/RegisterPage'
import { AuthLayout } from '@/shared/components/layout/AuthLayout'
vi.mock('@/features/sync/serverClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/sync/serverClient')>()
  return {
    ...actual,
    registerServerUser: vi.fn(async (input) => {
      return {
        id: 'user_mock',
        username: input.username,
        email: input.email,
        passwordHash: input.password,
        avatarUrl: `https://i.pravatar.cc/96?u=${input.email}`,
        createdAt: new Date().toISOString(),
        role: 'user' as const,
        permissions: ['listing:create', 'listing:update', 'listing:delete', 'review:create', 'review:update', 'review:delete', 'favourite:toggle', 'chat:send'],
      }
    }),
  }
})

const renderRegisterRoute = () => {
  const router = createMemoryRouter(
    [
      {
        path: '/register',
        element: (
          <AuthLayout showNavigation>
            <RegisterPage />
          </AuthLayout>
        ),
      },
      { path: '/login', element: <h1>Login Route</h1> },
      { path: '/listings', element: <h1>Listings Route</h1> },
    ],
    { initialEntries: ['/register'] },
  )

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('RegisterPage', () => {
  it('renders register mockup fields and controls', () => {
    renderRegisterRoute()

    expect(screen.getByText('MUSIC CORE')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
  })

  it('registers and routes to listings', async () => {
    const user = userEvent.setup()
    renderRegisterRoute()

    await user.type(screen.getByLabelText('Username'), 'mock_user')
    await user.type(screen.getByLabelText('Email'), 'mock@musiccore.local')
    await user.type(screen.getByLabelText('Password'), 'MockPass123!')
    await user.type(screen.getByLabelText('Confirm Password'), 'MockPass123!')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByRole('heading', { name: 'Listings Route' })).toBeInTheDocument()
  })

  it('routes to login from footer link', async () => {
    const user = userEvent.setup()
    renderRegisterRoute()

    await user.click(screen.getByRole('link', { name: 'Login' }))

    expect(await screen.findByRole('heading', { name: 'Login Route' })).toBeInTheDocument()
  })
})
