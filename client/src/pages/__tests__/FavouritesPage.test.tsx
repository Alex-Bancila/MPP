import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers'
import { useAppStore } from '@/app/store/useAppStore'
import { FavouritesPage } from '@/pages/FavouritesPage'
import { ListingsPage } from '@/pages/ListingsPage'
import { AppLayout } from '@/shared/components/layout/AppLayout'

const LoginWrapper = ({ children, userId }: { children: React.ReactNode; userId: string }) => {
  const { dispatch } = useAppStore()
  useEffect(() => {
    dispatch({ type: 'auth/login', payload: { userId } })
  }, [dispatch, userId])
  return <>{children}</>
}

const renderRoutes = (initialPath = '/favourites', loggedInUserId?: string) => {
  const router = createMemoryRouter(
    [
      {
        path: '/listings',
        element: (
          <AppLayout wide>
            <ListingsPage />
          </AppLayout>
        ),
      },
      {
        path: '/favourites',
        element: (
          <AppLayout>
            <FavouritesPage />
          </AppLayout>
        ),
      },
    ],
    { initialEntries: [initialPath] },
  )

  render(
    <AppProviders>
      {loggedInUserId ? (
        <LoginWrapper userId={loggedInUserId}>
          <RouterProvider router={router} />
        </LoginWrapper>
      ) : (
        <RouterProvider router={router} />
      )}
    </AppProviders>,
  )
}

describe('FavouritesPage', () => {
  it('shows seeded favourite listings', () => {
    renderRoutes('/favourites', 'user_1')

    expect(screen.getByRole('heading', { name: /favourites/i })).toBeInTheDocument()
    expect(screen.getByText(/architects - holy hell vinyl/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /remove from favourites/i }).length).toBeGreaterThan(0)
  })

  it('opens favourites page from navbar action', async () => {
    const user = userEvent.setup()
    renderRoutes('/listings', 'user_1')

    await user.click(screen.getByRole('button', { name: /^favourites$/i }))

    expect(await screen.findByRole('heading', { name: /favourites/i })).toBeInTheDocument()
  })
})
