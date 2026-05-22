import { useMemo } from 'react'

import { useAppStore } from '@/app/store/useAppStore'
import {
  getConversationsForUser,
  getConversationPartner,
  getCurrentUser,
  getListingById,
  getMessagesByConversation,
} from '@/app/store/selectors'
import { createId } from '@/shared/utils/id'

export const useMessaging = () => {
  const { state, dispatch } = useAppStore()
  const currentUser = useMemo(() => {
    return getCurrentUser(state) ?? null
  }, [state])

  const conversations = useMemo(() => {
    if (!currentUser) {
      return []
    }
    return getConversationsForUser(state, currentUser.id)
  }, [currentUser, state])

  const sendMessage = async (
    listingId: string,
    recipientId: string,
    body: string,
    senderIdOverride?: string,
  ) => {
    const senderId = senderIdOverride ?? currentUser?.id

    if (!senderId) {
      return { ok: false, message: 'You must be logged in to send messages.' }
    }

    const listing = getListingById(state, listingId)
    if (!listing) {
      return { ok: false, message: 'Listing not found.' }
    }

    if (body.trim().length < 1) {
      return { ok: false, message: 'Message cannot be empty.' }
    }

    const existingConversation = state.conversations.find(
      (conv) =>
        conv.listingId === listingId &&
        conv.participantIds.includes(senderId) &&
        conv.participantIds.includes(recipientId),
    )

    const conversationId = existingConversation?.id ?? createId('conv')

    dispatch({
      type: 'message/send',
      payload: {
        conversationId,
        listingId,
        recipientId,
        senderId,
        body: body.trim(),
        id: createId('msg'),
        createdAt: new Date().toISOString(),
      },
    })

    return { ok: true }
  }

  const getConversationMessages = (conversationId: string) => {
    return getMessagesByConversation(state, conversationId)
  }

  const getConversationMeta = (conversationId: string) => {
    if (!currentUser) {
      return undefined
    }
    const conversation = state.conversations.find((row) => row.id === conversationId)
    if (!conversation) {
      return undefined
    }

    const partner = getConversationPartner(state, conversationId, currentUser.id)
    const listing = getListingById(state, conversation.listingId)

    if (!partner || !listing) {
      return undefined
    }

    return {
      conversation,
      partner,
      listing,
    }
  }

  return {
    currentUser,
    conversations,
    sendMessage,
    getConversationMessages,
    getConversationMeta,
  }
}
