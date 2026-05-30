import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { AuthLayout } from '@/shared/components/layout/AuthLayout'

const renderResetRoute = () => {
  const router = createMemoryRouter(
    [
      {
        path: '/reset-password',
        element: (
          <AuthLayout>
            <ResetPasswordPage />
          </AuthLayout>
        ),
      },
    ],
    { initialEntries: ['/reset-password'] },
  )

  render(<RouterProvider router={router} />)
}

describe('ResetPasswordPage', () => {
  it('renders reset form fields', () => {
    renderResetRoute()

    expect(screen.getByText('MUSIC CORE')).toBeInTheDocument()
    expect(screen.getByLabelText('Reset Token')).toBeInTheDocument()
    expect(screen.getByLabelText('New Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument()
  })
})
