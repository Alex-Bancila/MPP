/* eslint-disable react-refresh/only-export-components -- this is the route table, not a
   component module; the lazy() page bindings here aren't Fast-Refresh boundaries. */
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/shared/components/layout/AppLayout'
import { AuthLayout } from '@/shared/components/layout/AuthLayout'
import { LandingLayout } from '@/shared/components/layout/LandingLayout'
import { ProtectedRoute } from '@/shared/components/routing/ProtectedRoute'
import { AdminRoute } from '@/shared/components/routing/AdminRoute'

// Pages are lazy-loaded so each route ships as its own chunk instead of one large bundle.
const FavouritesPage = lazy(() => import('@/pages/FavouritesPage').then((m) => ({ default: m.FavouritesPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })))
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const ListingDetailPage = lazy(() => import('@/pages/ListingDetailPage').then((m) => ({ default: m.ListingDetailPage })))
const ListingFormPage = lazy(() => import('@/pages/ListingFormPage').then((m) => ({ default: m.ListingFormPage })))
const ListingsPage = lazy(() => import('@/pages/ListingsPage').then((m) => ({ default: m.ListingsPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const MessagesPage = lazy(() => import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })))
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })))

const PageFallback = () => <div className="mc-page__loading">Loading…</div>

// Wrap a lazy page so the surrounding layout (navbar) renders immediately while the
// page chunk loads.
const suspend = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <LandingLayout>{suspend(<LandingPage />)}</LandingLayout>,
  },
  {
    path: '/login',
    element: <AuthLayout showNavigation>{suspend(<LoginPage />)}</AuthLayout>,
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AppLayout>{suspend(<AdminPage />)}</AppLayout>
      </AdminRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: <AuthLayout>{suspend(<ForgotPasswordPage />)}</AuthLayout>,
  },
  {
    path: '/reset-password',
    element: <AuthLayout>{suspend(<ResetPasswordPage />)}</AuthLayout>,
  },
  {
    path: '/auth/callback',
    element: <AuthLayout>{suspend(<AuthCallbackPage />)}</AuthLayout>,
  },
  {
    path: '/register',
    element: <AuthLayout showNavigation>{suspend(<RegisterPage />)}</AuthLayout>,
  },
  {
    path: '/listings',
    element: <AppLayout wide>{suspend(<ListingsPage />)}</AppLayout>,
  },
  {
    path: '/listings/new',
    element: (
      <ProtectedRoute>
        <AppLayout>{suspend(<ListingFormPage />)}</AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/listings/:listingId',
    element: <AppLayout>{suspend(<ListingDetailPage />)}</AppLayout>,
  },
  {
    path: '/listings/:listingId/edit',
    element: (
      <ProtectedRoute>
        <AppLayout>{suspend(<ListingFormPage />)}</AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/favourites',
    element: (
      <ProtectedRoute>
        <AppLayout>{suspend(<FavouritesPage />)}</AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/messages',
    element: (
      <ProtectedRoute>
        <AppLayout>{suspend(<MessagesPage />)}</AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile/:username',
    element: <AppLayout>{suspend(<ProfilePage />)}</AppLayout>,
  },
  {
    path: '/stats',
    element: <AppLayout>{suspend(<StatsPage />)}</AppLayout>,
  },
  {
    path: '*',
    element: <AppLayout>{suspend(<NotFoundPage />)}</AppLayout>,
  },
])
