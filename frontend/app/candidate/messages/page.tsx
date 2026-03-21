"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Search, Send, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiJson } from "@/src/lib/api"
import { getSocket } from "@/src/lib/socket"
import {
  getConversations,
  getConversationMessages,
  markConversationAsRead,
  type Conversation as ApiConversation,
  type Message as ApiMessage,
} from "@/src/services/messages.service"
import type { Socket } from "socket.io-client"

// ─── Bot chat types ───────────────────────────────────────────────────────────
interface BotMessage {
  id: string
  sender: "candidate" | "bot"
  text: string
  time: string
}

interface BotConversation {
  id: "bot"
  type: "bot"
  name: string
  initials: string
  color: string
  unreadCount: number
  lastMessage: string
  lastMessageTime: string
  messages: BotMessage[]
}

// ─── HR conversation (from DB) ────────────────────────────────────────────────
interface HrConversation extends ApiConversation {
  type: "hr"
  typing?: boolean
}

type AnyConversation = BotConversation | HrConversation

const BOT_QUESTIONS = [
  { id: "intro", text: "أهلاً! 👋 أنا مساعد JobNova. سأساعدك في الإجابة على أسئلتك المهنية. كيف يمكنني مساعدتك اليوم؟" },
]

function parseBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

function decodeHtml(text: string) {
  if (typeof window === "undefined") return text
  const el = document.createElement("textarea")
  el.innerHTML = text
  return el.value
}

export default function CandidateMessagesPage() {
  const allowedRoles = useMemo(() => ["candidate"] as const, [])
  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const socketRef       = useRef<Socket | null>(null)
  const typingTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeIdRef     = useRef<string | null>(null)

  const [search, setSearch]           = useState("")
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [inputValue, setInputValue]   = useState("")
  const [isBotTyping, setIsBotTyping] = useState(false)
  const [sending, setSending]         = useState(false)
  const [candidateName, setCandidateName] = useState("المرشح")

  // Bot conversation state
  const [botConv, setBotConv] = useState<BotConversation>({
    id: "bot",
    type: "bot",
    name: "JobNova Assistant",
    initials: "JA",
    color: "bg-primary",
    unreadCount: 0,
    lastMessage: BOT_QUESTIONS[0].text,
    lastMessageTime: "الآن",
    messages: [{ id: "bot-q-0", sender: "bot", text: BOT_QUESTIONS[0].text, time: "الآن" }],
  })

  // HR conversations from DB
  const [hrConvs, setHrConvs]         = useState<HrConversation[]>([])
  const [convLoading, setConvLoading] = useState(true)

  // ── Fetch HR conversations ────────────────────────────────────────────────
  useEffect(() => {
    getConversations()
      .then((data) =>
        setHrConvs(
          data.map((c) => ({ ...c, type: "hr" as const, messages: c.messages ?? [] }))
        )
      )
      .catch(() => {})
      .finally(() => setConvLoading(false))
  }, [])

  // ── Fetch current user's name ─────────────────────────────────────────────
  useEffect(() => {
    apiJson<{ name?: string; fullName?: string }>("/v1/auth/me")
      .then((u) => {
        if (u?.fullName) setCandidateName(u.fullName)
        else if (u?.name) setCandidateName(u.name)
      })
      .catch(() => {})
  }, [])

  // ── Socket.io setup ───────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSocket()
    socketRef.current = s

    const handleNewMessage = (payload: { conversationId: string; message: ApiMessage }) => {
      const { conversationId, message } = payload
      const isActive = activeIdRef.current === conversationId

      setHrConvs((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c
          return {
            ...c,
            messages: [...(c.messages ?? []), message],
            lastMessage: message.content,
            lastMessageTime: new Date(message.createdAt).toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            unreadCount: isActive ? 0 : (c.unreadCount ?? 0) + 1,
            typing: false,
          }
        })
      )
    }

    const handleTyping = (payload: {
      userId: string
      conversationId: string
      isTyping: boolean
    }) => {
      setHrConvs((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId ? { ...c, typing: payload.isTyping } : c
        )
      )
    }

    s.on("newMessage", handleNewMessage)
    s.on("typing", handleTyping)

    return () => {
      s.off("newMessage", handleNewMessage)
      s.off("typing", handleTyping)
    }
  }, [])

  // ── Keep activeIdRef in sync ──────────────────────────────────────────────
  useEffect(() => {
    activeIdRef.current = selectedId
  }, [selectedId])

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedId, botConv.messages, hrConvs])

  // ── All conversations merged for sidebar ──────────────────────────────────
  const allConversations: AnyConversation[] = useMemo(() => {
    const hrList: AnyConversation[] = hrConvs.map((c) => ({
      ...c,
      type: "hr" as const,
    }))
    return [botConv, ...hrList]
  }, [botConv, hrConvs])

  const filtered = allConversations.filter((c) => {
    const name = c.type === "bot" ? c.name : c.participantName
    return name.toLowerCase().includes(search.trim().toLowerCase())
  })

  const selectedConv = selectedId
    ? allConversations.find((c) => c.id === selectedId) ?? null
    : null

  // ── Select conversation ───────────────────────────────────────────────────
  const handleSelect = useCallback(
    async (id: string) => {
      const prev = activeIdRef.current
      if (prev && prev !== id && prev !== "bot") {
        socketRef.current?.emit("leaveConversation", { conversationId: prev })
      }

      setSelectedId(id)

      if (id === "bot") return

      // Join room
      socketRef.current?.emit("joinConversation", { conversationId: id })

      // Load messages + mark read
      try {
        const messages = await getConversationMessages(id)
        await markConversationAsRead(id)
        setHrConvs((prev) =>
          prev.map((c) => (c.id === id ? { ...c, messages, unreadCount: 0 } : c))
        )
      } catch {
        // keep existing messages
      }
    },
    []
  )

  // ── Send for HR conversations via Socket.io ───────────────────────────────
  const handleSendHr = useCallback(
    (conversationId: string, content: string) => {
      const s = socketRef.current
      if (!s) return

      setSending(true)
      s.emit(
        "sendMessage",
        { conversationId, content },
        () => setSending(false),
      )

      // Stop typing indicator
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      s.emit("typing", { conversationId, isTyping: false })
    },
    []
  )

  // ── Typing for HR ─────────────────────────────────────────────────────────
  const handleHrTyping = useCallback(
    (conversationId: string, value: string) => {
      setInputValue(value)
      socketRef.current?.emit("typing", { conversationId, isTyping: true })
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit("typing", { conversationId, isTyping: false })
      }, 2000)
    },
    []
  )

  // ── Bot answer via REST ───────────────────────────────────────────────────
  const handleBotAnswer = useCallback(
    async (answer: string) => {
      const time = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      const userMsg: BotMessage = { id: `u-${Date.now()}`, sender: "candidate", text: answer, time }

      setBotConv((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        lastMessage: answer,
        lastMessageTime: "الآن",
      }))

      const history = botConv.messages.map((m) => ({
        role: m.sender === "candidate" ? "user" as const : "assistant" as const,
        content: m.text,
      }))

      setIsBotTyping(true)

      try {
        const data = await apiJson<{ message?: string; text?: string; reply?: string }>(
          "/v1/chat/bot",
          {
            method: "POST",
            body: JSON.stringify({ userMessage: answer, conversationHistory: history, candidateName }),
          }
        )
        const botText =
          data?.message ?? data?.text ?? data?.reply ?? "شكرًا على رسالتك! كيف يمكنني مساعدتك أكثر؟"

        const botMsg: BotMessage = {
          id: `b-${Date.now()}`,
          sender: "bot",
          text: botText,
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        }
        setBotConv((prev) => ({
          ...prev,
          messages: [...prev.messages, botMsg],
          lastMessage: botText,
          lastMessageTime: "الآن",
        }))
      } catch {
        const fallback: BotMessage = {
          id: `b-${Date.now()}`,
          sender: "bot",
          text: "آسف، لم أتمكن من الرد الآن. حاول مجدداً.",
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        }
        setBotConv((prev) => ({ ...prev, messages: [...prev.messages, fallback] }))
      } finally {
        setIsBotTyping(false)
      }
    },
    [botConv.messages, candidateName]
  )

  // ── Main send handler ─────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !selectedConv) return

    if (selectedConv.type === "bot") {
      void handleBotAnswer(inputValue.trim())
      setInputValue("")
      return
    }

    // HR conversation
    handleSendHr(selectedConv.id, inputValue.trim())
    setInputValue("")
  }, [inputValue, selectedConv, handleBotAnswer, handleSendHr])

  // ─── Render helpers ────────────────────────────────────────────────────────
  function getConvName(c: AnyConversation) {
    return c.type === "bot" ? c.name : c.participantName
  }
  function getConvInitials(c: AnyConversation) {
    return c.type === "bot" ? c.initials : c.participantAvatar
  }
  function getConvColor(c: AnyConversation) {
    return c.type === "bot" ? c.color : "bg-green-600"
  }
  function getConvLastMsg(c: AnyConversation) {
    return c.type === "bot" ? c.lastMessage : c.lastMessage
  }
  function getConvLastTime(c: AnyConversation) {
    return c.type === "bot" ? c.lastMessageTime : c.lastMessageTime
  }
  function getConvUnread(c: AnyConversation) {
    return c.unreadCount
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div
          className="flex h-[calc(100vh-64px)] w-full overflow-hidden rounded-lg border border-border bg-card"
          dir="rtl"
        >
          {/* ── Right panel: chat area ─────────────────────────────── */}
          <main
            className={cn(
              "flex flex-1 flex-col min-w-0",
              !selectedId && "max-md:hidden"
            )}
          >
            {selectedConv ? (
              <>
                {/* Header */}
                <header className="flex shrink-0 items-center gap-3 border-b border-border p-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="md:hidden flex items-center justify-center rounded-md p-2 hover:bg-muted"
                    aria-label="العودة"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback
                      className={cn(
                        "text-xs text-primary-foreground",
                        getConvColor(selectedConv)
                      )}
                    >
                      {getConvInitials(selectedConv)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{getConvName(selectedConv)}</p>
                    {selectedConv.type === "bot" ? (
                      <p className="text-xs text-primary">🤖 مساعد ذكي</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{selectedConv.participantRole}</p>
                    )}
                  </div>
                  {selectedConv.type === "hr" && selectedConv.typing && (
                    <Badge variant="secondary" className="shrink-0 text-xs">يكتب...</Badge>
                  )}
                </header>

                {/* Messages */}
                <ScrollArea className="flex-1 p-3">
                  <div className="flex flex-col gap-4">
                    {/* Bot messages */}
                    {selectedConv.type === "bot" &&
                      selectedConv.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex flex-col gap-0.5 max-w-[85%]",
                            msg.sender === "candidate"
                              ? "self-end items-end"
                              : "self-start items-start"
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2",
                              msg.sender === "candidate"
                                ? "rounded-tr-sm bg-primary text-primary-foreground"
                                : "rounded-tl-sm bg-primary/10 text-foreground"
                            )}
                          >
                            {msg.sender === "bot" && (
                              <span className="shrink-0" aria-hidden>🤖</span>
                            )}
                            <span>
                              {msg.sender === "bot"
                                ? parseBold(decodeHtml(msg.text))
                                : msg.text}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                        </div>
                      ))}

                    {/* Bot typing */}
                    {isBotTyping && selectedConv.type === "bot" && (
                      <div className="self-start flex items-center gap-1 bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}

                    {/* HR messages */}
                    {selectedConv.type === "hr" &&
                      (selectedConv.messages ?? []).map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex flex-col gap-0.5 max-w-[85%]",
                            msg.senderId === selectedConv.participantId
                              ? "self-start items-start"
                              : "self-end items-end"
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2.5 text-sm",
                              msg.senderId === selectedConv.participantId
                                ? "rounded-tl-sm bg-muted text-foreground"
                                : "rounded-tr-sm bg-primary text-primary-foreground"
                            )}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))}

                    {/* HR typing indicator */}
                    {selectedConv.type === "hr" && selectedConv.typing && (
                      <div className="self-start flex items-center gap-1 bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="shrink-0 border-t border-border p-3">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="اكتب رسالتك..."
                      value={inputValue}
                      onChange={(e) => {
                        if (selectedConv.type === "hr") {
                          handleHrTyping(selectedConv.id, e.target.value)
                        } else {
                          setInputValue(e.target.value)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      rows={2}
                      className="min-h-[44px] resize-none"
                    />
                    <Button
                      size="icon"
                      className="h-[44px] w-11 shrink-0"
                      onClick={handleSend}
                      disabled={!inputValue.trim() || sending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                <MessageSquare className="h-14 w-14 opacity-40" />
                <p className="text-sm font-medium">اختر محادثة للبدء</p>
              </div>
            )}
          </main>

          {/* ── Left panel: conversations sidebar ──────────────────── */}
          <aside
            className={cn(
              "flex w-80 shrink-0 flex-col border-r border-border bg-card",
              "max-md:absolute max-md:inset-0 max-md:z-10 max-md:w-full",
              selectedId && "max-md:hidden"
            )}
          >
            <div className="flex flex-col gap-2 border-b border-border p-3">
              <h1 className="text-lg font-bold text-foreground">المحادثات</h1>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث في المحادثات..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9 pl-3"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {convLoading && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">جاري التحميل...</p>
                )}
                {!convLoading && filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 opacity-50" />
                    <p className="text-sm">لا توجد محادثات</p>
                  </div>
                )}
                {filtered.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleSelect(conv.id)}
                    className={cn(
                      "flex w-full gap-3 border-b border-border p-3 text-right transition-colors hover:bg-muted/50",
                      selectedId === conv.id && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback
                          className={cn(
                            "text-xs font-medium text-primary-foreground",
                            getConvColor(conv)
                          )}
                        >
                          {getConvInitials(conv)}
                        </AvatarFallback>
                      </Avatar>
                      {getConvUnread(conv) > 0 && (
                        <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                          {getConvUnread(conv) > 9 ? "9+" : getConvUnread(conv)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <span className="truncate font-semibold text-foreground">
                          {getConvName(conv)}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {getConvLastTime(conv)}
                        </span>
                      </div>
                      {conv.type === "bot" && (
                        <span className="text-xs text-primary font-medium">🤖 مساعد ذكي</span>
                      )}
                      {conv.type === "hr" && (
                        <span className="text-xs text-muted-foreground">💬 محادثة HR</span>
                      )}
                      {conv.type === "hr" && conv.typing ? (
                        <p className="text-xs text-primary italic">يكتب الآن...</p>
                      ) : (
                        <p className="truncate text-sm text-muted-foreground">
                          {getConvLastMsg(conv)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
