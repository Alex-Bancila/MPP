import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/useAuth'

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />
  }

  return <>{children}</>
}
