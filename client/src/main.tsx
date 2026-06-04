import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { appRouter } from '@/app/router'
import { AppProviders } from '@/app/providers'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import '@/styles/global.css'
import '@/styles/tokens.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={appRouter} />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>,
)
