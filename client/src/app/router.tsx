import { createBrowserRouter } from 'react-router-dom'

import { FavouritesPage } from '@/pages/FavouritesPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { LandingPage } from '@/pages/LandingPage'
import { ListingDetailPage } from '@/pages/ListingDetailPage'
import { ListingFormPage } from '@/pages/ListingFormPage'
import { ListingsPage } from '@/pages/ListingsPage'
import { LoginPage } from '@/pages/LoginPage'
import { MessagesPage } from '@/pages/MessagesPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RegisterPage } from '@/pages/RegisterPage'
import { StatsPage } from '@/pages/StatsPage'
import { AppLayout } from '@/shared/components/layout/AppLayout'
import { AuthLayout } from '@/shared/components/layout/AuthLayout'
import { LandingLayout } from '@/shared/components/layout/LandingLayout'
import { AdminPage } from '@/pages/AdminPage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: (
      <LandingLayout>
        <LandingPage />
      </LandingLayout>
    ),
  },
  {
    path: '/login',
    element: (
      <AuthLayout showNavigation>
        <LoginPage />
      </AuthLayout>
    ),
  },
  {
  path: '/admin',
  element: (
    <AppLayout>
      <AdminPage />
    </AppLayout>
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
  {
    path: '/register',
    element: (
      <AuthLayout showNavigation>
        <RegisterPage />
      </AuthLayout>
    ),
  },
  {
    path: '/listings',
    element: (
      <AppLayout wide>
        <ListingsPage />
      </AppLayout>
    ),
  },
  {
    path: '/listings/new',
    element: (
      <AppLayout>
        <ListingFormPage />
      </AppLayout>
    ),
  },
  {
    path: '/listings/:listingId',
    element: (
      <AppLayout>
        <ListingDetailPage />
      </AppLayout>
    ),
  },
  {
    path: '/listings/:listingId/edit',
    element: (
      <AppLayout>
        <ListingFormPage />
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
  {
    path: '/messages',
    element: (
      <AppLayout>
        <MessagesPage />
      </AppLayout>
    ),
  },
  {
    path: '/profile/:username',
    element: (
      <AppLayout>
        <ProfilePage />
      </AppLayout>
    ),
  },
  {
    path: '/stats',
    element: (
      <AppLayout>
        <StatsPage />
      </AppLayout>
    ),
  },
  {
    path: '*',
    element: (
      <AppLayout>
        <NotFoundPage />
      </AppLayout>
    ),
  },
])
