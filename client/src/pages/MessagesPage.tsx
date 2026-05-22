import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAppStore } from '@/app/store/useAppStore'
import { getCurrentUser } from '@/app/store/selectors'
import { ConversationPanel } from '@/features/messaging/components/ConversationPanel'
import { useMessaging } from '@/features/messaging/useMessaging'
import { Button } from '@/shared/components/ui/Button'

export const MessagesPage = () => {
  const navigate = useNavigate()
  const { state, dispatch } = useAppStore()
  const currentUser = getCurrentUser(state)
  const { conversations, getConversationMeta } = useMessaging()
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null)

  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedId(null)
      return
    }

    if (!selectedId || !conversations.some((conversation) => conversation.id === selectedId)) {
      setSelectedId(conversations[0].id)
    }
  }, [conversations, selectedId])

  useEffect(() => {
    if (!currentUser || !selectedId) {
      return
    }

    dispatch({
      type: 'message/markAsRead',
      payload: { conversationId: selectedId, userId: currentUser.id },
    })
  }, [currentUser, selectedId, dispatch])

  if (!currentUser) {
    return (
      <section className="mc-page">
        <div className="mc-empty">
          You must be logged in to view messages.
          <button className="mc-button mc-button--primary" style={{ marginTop: '12px' }} onClick={() => navigate('/login', { state: { returnTo: '/messages' } })}>
            Login
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mc-page">
      <header className="mc-page__header">
        <div>
          <h1 className="mc-page__title">Messages</h1>
          <p className="mc-page__subtitle">Private conversations with listing sellers and buyers.</p>
        </div>

        <Button variant="ghost" onClick={() => navigate('/listings')}>
          Back to Listings
        </Button>
      </header>

      {conversations.length === 0 ? (
        <div className="mc-empty">No conversations yet. Contact a seller from listing detail.</div>
      ) : (
        <div className="mc-message-layout">
          <aside className="mc-conversations">
            {conversations.map((conversation) => {
              const meta = getConversationMeta(conversation.id)
              const active = selectedId === conversation.id

              return (
                <button
                  key={conversation.id}
                  className={
                    active
                      ? 'mc-conversation-item mc-conversation-item--active'
                      : 'mc-conversation-item'
                  }
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <p>{meta?.partner?.username ?? 'Unknown user'}</p>
                  <p className="mc-page__subtitle">{meta?.listing?.title ?? 'Unknown listing'}</p>
                </button>
              )
            })}
          </aside>

          {selectedId ? <ConversationPanel conversationId={selectedId} /> : null}
        </div>
      )}
    </section>
  )
}
