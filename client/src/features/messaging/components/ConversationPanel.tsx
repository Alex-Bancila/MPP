import { useState } from 'react'

import { useAppSelector } from '@/app/store/useAppSelector'
import { useMessaging } from '@/features/messaging/useMessaging'
import { Button } from '@/shared/components/ui/Button'

interface ConversationPanelProps {
  conversationId: string
}

export const ConversationPanel = ({ conversationId }: ConversationPanelProps) => {
  const [message, setMessage] = useState('')
  const { currentUser, getConversationMeta, sendMessage } = useMessaging()
  const meta = getConversationMeta(conversationId)

  const messages = useAppSelector((state) => {
    const rows = state.messages.filter((row) => row.conversationId === conversationId)
    return [...rows].sort(
      (first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
    )
  }, [conversationId])

  if (!currentUser || !meta || !meta.partner || !meta.listing) {
    return <div className="mc-empty">Conversation data not available.</div>
  }

  const partner = meta.partner
  const listing = meta.listing

  return (
    <section className="mc-messages">
      <div className="mc-messages__feed">
        <div>
          <h3>{partner.username}</h3>
          <p className="mc-page__subtitle">About: {listing.title}</p>
        </div>

        {messages.map((item) => {
          const mine = item.senderId === currentUser.id
          return (
            <article key={item.id} className={mine ? 'mc-message mc-message--mine' : 'mc-message'}>
              {item.body}
            </article>
          )
        })}
      </div>

      <form
        className="mc-messages__composer"
        onSubmit={async (event) => {
          event.preventDefault()
          const result = await sendMessage(listing.id, partner.id, message)
          if (result.ok) {
            setMessage('')
          }
        }}
      >
        <input
          className="mc-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type your message"
        />
        <Button type="submit">Send</Button>
      </form>
    </section>
  )
}
