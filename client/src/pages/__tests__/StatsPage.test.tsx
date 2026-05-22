import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers'
import { StatsPage } from '@/pages/StatsPage'

describe('StatsPage', () => {
  it('renders statistics layout with charts and top sellers', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <StatsPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: /browse listings/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /statistics/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /category breakdown/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /listings by category/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /average price by category/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /top sellers/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start generator/i })).toBeInTheDocument()
    expect(screen.getByText(/alex_riffs/i)).toBeInTheDocument()
  })
})
