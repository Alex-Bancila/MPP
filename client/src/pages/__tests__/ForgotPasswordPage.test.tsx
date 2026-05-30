import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { AuthLayout } from '@/shared/components/layout/AuthLayout'

const renderForgotPasswordRoute = () => {
  const router = createMemoryRouter(
    [
      {
        path: '/forgot-password',
        element: (
          <AuthLayout showNavigation>
            <ForgotPasswordPage />
          </AuthLayout>
        ),
      },
      { path: '/login', element: <h1>Login Route</h1> },
    ],
    { initialEntries: ['/forgot-password'] },
  )

  render(<RouterProvider router={router} />)
}

describe('ForgotPasswordPage', () => {
  it('renders password reset content with auth styling constraints', () => {
    renderForgotPasswordRoute()

    expect(screen.getByText('MUSIC CORE')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toBeInTheDocument()
    expect(
      screen.getByText('Enter your email and we will generate a reset token.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send reset token' })).toBeInTheDocument()
  })

  it('navigates back to login route', async () => {
    const user = userEvent.setup()
    renderForgotPasswordRoute()

    await user.click(screen.getByRole('button', { name: 'Back to Login' }))

    expect(await screen.findByRole('heading', { name: 'Login Route' })).toBeInTheDocument()
  })
})
