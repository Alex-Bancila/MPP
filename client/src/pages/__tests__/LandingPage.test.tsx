import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { LandingPage } from '@/pages/LandingPage'
import { LandingLayout } from '@/shared/components/layout/LandingLayout'

const renderLandingRoute = () => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <LandingLayout>
            <LandingPage />
          </LandingLayout>
        ),
      },
      { path: '/login', element: <h1>Login Route</h1> },
      { path: '/register', element: <h1>Register Route</h1> },
      { path: '/listings', element: <h1>Listings Route</h1> },
    ],
    { initialEntries: ['/'] },
  )

  render(<RouterProvider router={router} />)
}

describe('LandingPage', () => {
  it('renders the landing page copy and primary actions', () => {
    renderLandingRoute()

    expect(screen.getByRole('heading', { name: 'MUSIC CORE' })).toBeInTheDocument()
    expect(screen.getByText('A chug for your breakdown')).toBeInTheDocument()
    expect(
      screen.getByText(
        /The underground marketplace for musicians, buy and sell instruments, gear, vinyls and more\./i,
      ),
    ).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Browse Listings' })).toBeInTheDocument()
  })

  it('navigates to login from the navbar action', async () => {
    const user = userEvent.setup()
    renderLandingRoute()

    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByRole('heading', { name: 'Login Route' })).toBeInTheDocument()
  })

  it('navigates to register from the navbar action', async () => {
    const user = userEvent.setup()
    renderLandingRoute()

    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByRole('heading', { name: 'Register Route' })).toBeInTheDocument()
  })

  it('navigates to listings from the hero action', async () => {
    const user = userEvent.setup()
    renderLandingRoute()

    await user.click(screen.getByRole('button', { name: 'Browse Listings' }))

    expect(await screen.findByRole('heading', { name: 'Listings Route' })).toBeInTheDocument()
  })
})
