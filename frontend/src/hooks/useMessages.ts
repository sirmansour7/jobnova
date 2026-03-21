"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getConversations,
  getConversationMessages,
  markConversationAsRead,
  type Conversation,
  type Message,
} from "@/src/services/messages.service"
import { getSocket } from "@/src/lib/socket"
import type { Socket } from "socket.io-client"

export function useMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [sending, setSending]             = useState(false)
  const [activeConvId, setActiveConvId]   = useState<string | null>(null)
  const [typingUsers, setTypingUsers]     = useState<Record<string, boolean>>({}) // conversationId → isTyping

  const socketRef       = useRef<Socket | null>(null)
  const activeConvIdRef = useRef<string | null>(null)

  // Keep ref in sync with state for use inside socket callbacks
  useEffect(() => {
    activeConvIdRef.current = activeConvId
  }, [activeConvId])

  // ── REST fetch ────────────────────────────────────────────────────────────
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

  // ── Socket.io setup ───────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSocket()
    socketRef.current = s

    const handleNewMessage = (payload: { conversationId: string; message: Message }) => {
      const { conversationId, message } = payload

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c
          // If this conversation is currently open, add message + mark read
          const isActive = activeConvIdRef.current === conversationId
          return {
            ...c,
            messages: [...(c.messages ?? []), message],
            lastMessage: message.content,
            lastMessageTime: new Date(message.createdAt).toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            unreadCount: isActive ? 0 : (c.unreadCount ?? 0) + 1,
          }
        })
      )
    }

    const handleTyping = (payload: {
      userId: string
      conversationId: string
      isTyping: boolean
    }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [payload.conversationId]: payload.isTyping,
      }))
    }

    s.on("newMessage", handleNewMessage)
    s.on("typing", handleTyping)

    return () => {
      s.off("newMessage", handleNewMessage)
      s.off("typing", handleTyping)
    }
  }, [])

  // ── Select conversation ───────────────────────────────────────────────────
  const selectConversation = useCallback(async (id: string) => {
    const prev = activeConvIdRef.current

    // Leave previous room
    if (prev && prev !== id) {
      socketRef.current?.emit("leaveConversation", { conversationId: prev })
    }

    setActiveConvId(id)

    // Join new room
    socketRef.current?.emit("joinConversation", { conversationId: id })

    try {
      const messages = await getConversationMessages(id)
      await markConversationAsRead(id)
      setConversations((convs) =>
        convs.map((c) => (c.id === id ? { ...c, messages, unreadCount: 0 } : c))
      )
    } catch {
      // keep existing messages on error
    }
  }, [])

  // ── Send message via Socket.io ────────────────────────────────────────────
  const sendMessage = useCallback((conversationId: string, content: string) => {
    const s = socketRef.current
    if (!s) {
      setError("الاتصال غير متاح")
      return
    }

    setSending(true)

    s.emit(
      "sendMessage",
      { conversationId, content },
      (ack: { event: string; data: Message | { message: string } }) => {
        setSending(false)
        if (ack?.event === "error") {
          setError((ack.data as { message: string }).message ?? "فشل الإرسال")
        }
        // newMessage event will update state for everyone including sender
      },
    )
  }, [])

  // ── Typing indicator ──────────────────────────────────────────────────────
  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    socketRef.current?.emit("typing", { conversationId, isTyping })
  }, [])

  return {
    conversations,
    loading,
    error,
    sending,
    activeConvId,
    typingUsers,
    selectConversation,
    sendMessage,
    sendTyping,
    refetch: fetchConversations,
  }
}
