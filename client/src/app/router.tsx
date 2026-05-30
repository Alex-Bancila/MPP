import { createBrowserRouter } from 'react-router-dom'

import { FavouritesPage } from '@/pages/FavouritesPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
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
import { ProtectedRoute } from '@/shared/components/routing/ProtectedRoute'
import { AdminRoute } from '@/shared/components/routing/AdminRoute'

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
      <AdminRoute>
        <AppLayout>
          <AdminPage />
        </AppLayout>
      </AdminRoute>
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
    path: '/reset-password',
    element: (
      <AuthLayout>
        <ResetPasswordPage />
      </AuthLayout>
    ),
  },
  {
    path: '/auth/callback',
    element: (
      <AuthLayout>
        <AuthCallbackPage />
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
      <ProtectedRoute>
        <AppLayout>
          <ListingFormPage />
        </AppLayout>
      </ProtectedRoute>
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
      <ProtectedRoute>
        <AppLayout>
          <ListingFormPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/favourites',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <FavouritesPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/messages',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <MessagesPage />
        </AppLayout>
      </ProtectedRoute>
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
