"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getConversations,
  getConversationMessages,
  sendMessage as sendMessageService,
  markConversationAsRead,
  type Conversation,
  type Message,
} from "@/src/services/messages.service"

export function useMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [sending, setSending]             = useState(false)
  const [activeConvId, setActiveConvId]   = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getConversations()
      setConversations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المحادثات")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchConversations() }, [fetchConversations])

  const selectConversation = useCallback(async (id: string) => {
    setActiveConvId(id)
    try {
      const messages = await getConversationMessages(id)
      await markConversationAsRead(id)
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, messages, unreadCount: 0 } : c))
      )
    } catch {
      // keep existing messages
    }
  }, [])

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    setSending(true)
    try {
      const msg = await sendMessageService(conversationId, content)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...(c.messages as Message[]), msg], lastMessage: msg.content }
            : c
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إرسال الرسالة")
    } finally {
      setSending(false)
    }
  }, [])

  return {
    conversations,
    loading,
    error,
    sending,
    activeConvId,
    selectConversation,
    sendMessage,
    refetch: fetchConversations,
  }
}
