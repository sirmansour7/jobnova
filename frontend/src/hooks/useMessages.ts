"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getConversations,
  getConversationMessages,
  markConversationAsRead,
  sendMessage as sendMessageREST,
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
          // Deduplicate: remove optimistic (temp-*) messages with same content
          const existing = c.messages ?? []
          const withoutOptimistic = existing.filter(
            (m) => !(m.id.startsWith("temp-") && m.content === message.content)
          )
          // Skip if real message already exists
          if (withoutOptimistic.some((m) => m.id === message.id)) return c
          const isActive = activeConvIdRef.current === conversationId
          return {
            ...c,
            messages: [...withoutOptimistic, message],
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

  // ── Send message (Socket primary, REST fallback) ──────────────────────
  const sendMessage = useCallback((conversationId: string, content: string) => {
    const s = socketRef.current
    setSending(true)

    // ── Optimistic update: show the message in UI immediately ──────────────
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId,
      senderId: "__self__",
      senderName: "",
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== conversationId
          ? c
          : {
              ...c,
              messages: [...(c.messages ?? []), optimisticMsg],
              lastMessage: content,
              lastMessageTime: new Date().toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
      )
    )

    // ── Primary: use socket when connected ─────────────────────────────
    if (s?.connected) {
      s.emit(
        "sendMessage",
        { conversationId, content },
        (ack: { event: string; data: Message | { message: string } }) => {
          setSending(false)
          if (ack?.event === "error") {
            setError((ack.data as { message: string }).message ?? "فشل الإرسال")
            // Rollback optimistic message
            setConversations((prev) =>
              prev.map((c) =>
                c.id !== conversationId
                  ? c
                  : { ...c, messages: (c.messages ?? []).filter((m) => m.id !== tempId) }
              )
            )
          }
          // newMessage event will replace the temp message for everyone
        },
      )
      return
    }

    // ── Fallback: REST when socket is not connected ─────────────────────
    void (async () => {
      try {
        const message = await sendMessageREST(conversationId, content)
        // Replace optimistic message with the real one from server
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: (c.messages ?? []).map((m) => m.id === tempId ? message : m),
              lastMessage: message.content,
              lastMessageTime: new Date(message.createdAt).toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          })
        )
      } catch {
        setError("فشل الإرسال")
        // Rollback optimistic message
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== conversationId
              ? c
              : { ...c, messages: (c.messages ?? []).filter((m) => m.id !== tempId) }
          )
        )
      } finally {
        setSending(false)
      }
    })()
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
