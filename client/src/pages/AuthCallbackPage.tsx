import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { setAuthToken, setRefreshToken, restoreServerSession } from '@/features/sync/serverClient'
import { useAppStore } from '@/app/store/useAppStore'

export const AuthCallbackPage = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { dispatch } = useAppStore()

  useEffect(() => {
    const token = params.get('token')
    const refreshToken = params.get('refreshToken')

    if (token) {
      setAuthToken(token)
    }
    if (refreshToken) {
      setRefreshToken(refreshToken)
    }

    void (async () => {
      const user = await restoreServerSession()
      if (user) {
        dispatch({ type: 'auth/login', payload: { userId: user.id, user } })
      }
      navigate('/listings', { replace: true })
    })()
  }, [dispatch, navigate, params])

  return (
    <section className="mc-auth-page" aria-labelledby="auth-callback-title">
      <p className="mc-auth-page__brand">MUSIC CORE</p>
      <div className="mc-auth-panel">
        <h1 id="auth-callback-title" className="mc-auth-panel__title">
          Signing you in...
        </h1>
        <p className="mc-auth-panel__subtitle">
          Completing your authentication. You will be redirected shortly.
        </p>
      </div>
    </section>
  )
}
