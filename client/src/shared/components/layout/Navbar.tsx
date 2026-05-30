import { useNavigate } from 'react-router-dom'

import { useAppSelector } from '@/app/store/useAppSelector'
import { getCurrentUser } from '@/app/store/selectors'
import { useAuth } from '@/features/auth/useAuth'

export const Navbar = () => {
  const navigate = useNavigate()
  const sync = useAppSelector((state) => state.sync)
  const favourites = useAppSelector((state) => state.favourites)
  const messages = useAppSelector((state) => state.messages)
  const currentUser = useAppSelector((state) => getCurrentUser(state))
  const { logout, hasPermission, isAdmin } = useAuth()
  const favouriteCount = currentUser
    ? favourites.filter((row) => row.userId === currentUser.id).length
    : 0
  const unreadMessageCount = currentUser
    ? messages.filter((msg) => msg.recipientId === currentUser.id && !msg.readAt).length
    : 0

  return (
    <header className="mc-navbar">
      <div className="mc-navbar__brand" role="img" aria-label="Music Core logo">
        Music Core
      </div>

      <div className="mc-navbar__actions">
        <span className="mc-tag" aria-label="Connection status">
          {sync.mode === 'offline' ? 'Offline' : sync.mode === 'syncing' ? 'Syncing' : 'Online'}
        </span>
        <button
          className="mc-button mc-button--ghost mc-navbar__favourites"
          onClick={() => {
            if (!currentUser) {
              navigate('/login', { state: { returnTo: '/favourites' } })
              return
            }
            navigate('/favourites')
          }}
          aria-label="Favourites"
        >
          <span className="mc-navbar__favourites-full">Favourites</span>
          <span className="mc-navbar__favourites-short">Favs</span>
          {favouriteCount > 0 ? <span className="mc-navbar__badge">{favouriteCount}</span> : null}
        </button>
        {hasPermission('chat:send') && (
          <button
            className="mc-button mc-button--ghost mc-navbar__chat"
            onClick={() => navigate('/messages')}
            aria-label="Chat"
          >
            <span className="mc-navbar__chat-full">Chat</span>
            <span className="mc-navbar__chat-short">Chat</span>
            {unreadMessageCount > 0 ? <span className="mc-navbar__badge">{unreadMessageCount}</span> : null}
          </button>
        )}
        {isAdmin && (
          <button
            className="mc-button mc-button--ghost"
            onClick={() => navigate('/admin')}
            aria-label="Admin Dashboard"
          >
            Admin
          </button>
        )}
        {hasPermission('listing:create') && (
          <button
            className="mc-button mc-button--primary mc-navbar__sell"
            onClick={() => navigate('/listings/new')}
          >
            Sell
          </button>
        )}
        {currentUser ? (
          <button
            className="mc-button mc-button--ghost mc-navbar__logout"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Logout
          </button>
        ) : (
          <button className="mc-button mc-button--ghost mc-navbar__logout" onClick={() => navigate('/login')}>
            Login
          </button>
        )}
        <button
          className="mc-navbar__avatar"
          onClick={() => {
            if (!currentUser) {
              navigate('/login')
              return
            }
            navigate(`/profile/${currentUser.username}`)
          }}
          aria-label={currentUser ? `${currentUser.username} profile` : 'Login'}
        >
          {currentUser?.username.charAt(0).toUpperCase() ?? 'U'}
        </button>
      </div>
    </header>
  )
}