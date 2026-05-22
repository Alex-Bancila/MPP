import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers'
import { useAppStore } from '@/app/store/useAppStore'
import { ProfilePage } from '@/pages/ProfilePage'

const LoginWrapper = ({ children, userId }: { children: React.ReactNode; userId: string }) => {
  const { dispatch } = useAppStore()
  useEffect(() => {
    dispatch({ type: 'auth/login', payload: { userId } })
  }, [dispatch, userId])
  return <>{children}</>
}

describe('ProfilePage', () => {
  it('shows sold ribbon and favourite pentagram on profile cards', async () => {
    render(
      <MemoryRouter initialEntries={['/profile/alex_riffs']}>
        <AppProviders>
          <LoginWrapper userId="user_1">
            <Routes>
              <Route path="/profile/:username" element={<ProfilePage />} />
            </Routes>
          </LoginWrapper>
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByText(/sold items are dimmed/i)).toBeInTheDocument()
    expect(screen.getAllByText('Sold').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /remove from favourites/i })).toBeInTheDocument()
  })
})
