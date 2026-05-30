import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/useAuth'

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { currentUser, isAdmin } = useAuth()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />
  }

  if (!isAdmin) {
    return <Navigate to="/listings" replace />
  }

  return <>{children}</>
}
