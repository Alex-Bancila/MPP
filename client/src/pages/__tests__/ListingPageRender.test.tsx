import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers'
import { useAppStore } from '@/app/store/useAppStore'
import { ListingsPage } from '@/pages/ListingsPage'

const LoginWrapper = ({ children, userId }: { children: React.ReactNode; userId: string }) => {
  const { dispatch } = useAppStore()
  useEffect(() => {
    dispatch({ type: 'auth/login', payload: { userId } })
  }, [dispatch, userId])
  return <>{children}</>
}

describe('ListingsPage', () => {
  it('renders listings in card view with browse controls', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginWrapper userId="user_1">
            <ListingsPage />
          </LoginWrapper>
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: /browse listings/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /statistics/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search for instruments, gear, accessories/i)).toBeInTheDocument()
    expect(screen.getByText(/fortin zuul noise gate/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /remove from favourites/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sold').length).toBeGreaterThan(0)
  })
})
