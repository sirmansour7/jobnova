"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Search, Send, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiJson } from "@/src/lib/api"

interface Message {
  id: string
  sender: "candidate" | "hr" | "bot"
  text: string
  time: string
  isTyping?: boolean
}

interface Conversation {
  id: string
  type: "bot" | "hr"
  companyName: string
  companyInitials: string
  companyColor: string
  jobTitle: string
  status: string
  unreadCount: number
  lastMessage: string
  lastMessageTime: string
  messages: Message[]
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "bot-1",
    type: "bot",
    companyName: "JobNova Assistant",
    companyInitials: "JA",
    companyColor: "bg-primary",
    jobTitle: "مطور React - خبرة",
    status: "قيد المراجعة",
    unreadCount: 2,
    lastMessage: "أهلاً! سنبدأ مقابلة سريعة لتقديمك للوظيفة.",
    lastMessageTime: "الآن",
    messages: [],
  },
  {
    id: "hr-1",
    type: "hr",
    companyName: "JobNova HR",
    companyInitials: "HR",
    companyColor: "bg-green-600",
    jobTitle: "مهندس اتصالات",
    status: "مقبول للمقابلة",
    unreadCount: 0,
    lastMessage: "مرحباً، موعد المقابلة الثلاثاء القادم.",
    lastMessageTime: "أمس",
    messages: [
      { id: "m1", sender: "hr", text: "مرحباً بك في فودافون مصر!", time: "10:00 ص" },
      { id: "m2", sender: "candidate", text: "شكراً جزيلاً، سعيد بالتواصل معكم.", time: "10:05 ص" },
      { id: "m3", sender: "hr", text: "موعد المقابلة الثلاثاء القادم الساعة 11 صباحاً.", time: "10:10 ص" },
    ],
  },
  {
    id: "hr-2",
    type: "hr",
    companyName: "JobNova HR",
    companyInitials: "HR",
    companyColor: "bg-green-600",
    jobTitle: "محلل بيانات",
    status: "قيد المراجعة",
    unreadCount: 1,
    lastMessage: "هل يمكنك إرسال سيرتك الذاتية؟",
    lastMessageTime: "منذ يومين",
    messages: [
      { id: "m4", sender: "hr", text: "مرحباً، شكراً على تقديمك.", time: "أمس" },
      { id: "m5", sender: "hr", text: "هل يمكنك إرسال سيرتك الذاتية المحدثة؟", time: "أمس" },
    ],
  },
]

const BOT_QUESTIONS = [
  { id: "intro", text: "أهلاً! 👋 أنا مساعد JobNova. سأساعدك في إكمال طلبك لوظيفة **مطور React**. هل أنت مستعد للبدء؟", type: "confirm" as const },
  { id: "about", text: "ممتاز! 🎯 أخبرنا عن نفسك بإيجاز — من أنت وما خلفيتك المهنية؟", type: "text" as const },
  { id: "experience", text: "كم سنة خبرتك في مجال تطوير الواجهات الأمامية؟", type: "text" as const },
  { id: "skills", text: "ما هي أهم 3 مهارات تقنية تمتلكها؟", type: "text" as const },
  { id: "salary", text: "ما هو الراتب المتوقع؟ (بالجنيه المصري شهرياً)", type: "text" as const },
  { id: "availability", text: "متى يمكنك البدء في العمل؟", type: "text" as const },
  { id: "done", text: "شكراً! ✅ تم حفظ إجاباتك وسيتم إرسالها لمسؤول التوظيف. سيتواصل معك قريباً.", type: "done" as const },
]

const decodeHtml = (text: string) => {
  if (typeof window === "undefined") return text
  const txt = document.createElement("textarea")
  txt.innerHTML = text
  return txt.value
}

function parseBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)
}

export default function CandidateMessagesPage() {
  const allowedRoles = useMemo(() => ["candidate"] as const, [])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [botStep, setBotStep] = useState(0)
  const [botAnswers, setBotAnswers] = useState<Record<string, string>>({})
  const [isBotTyping, setIsBotTyping] = useState(false)
  const [candidateName, setCandidateName] = useState("المرشح")
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    MOCK_CONVERSATIONS.map((c) =>
      c.id === "bot-1"
        ? {
            ...c,
            messages: [
              { id: "bot-q-0", sender: "bot", text: BOT_QUESTIONS[0].text, time: "الآن" },
            ],
          }
        : { ...c, messages: [...c.messages] }
    )
  )

  const filteredConversations = conversations.filter(
    (c) =>
      c.companyName.toLowerCase().includes(search.trim().toLowerCase()) ||
      c.jobTitle.toLowerCase().includes(search.trim().toLowerCase())
  )
  const selectedConv = selectedId ? conversations.find((c) => c.id === selectedId) : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedConv?.messages])

  useEffect(() => {
    apiJson<{ name?: string; fullName?: string; firstName?: string; lastName?: string }>("/v1/auth/me")
      .then((user) => {
        if (user?.name) setCandidateName(user.name)
        else if (user?.fullName) setCandidateName(user.fullName)
        else if (user?.firstName) {
          setCandidateName(`${user.firstName} ${user.lastName ?? ""}`.trim())
        }
      })
      .catch(() => {})
  }, [])

  const handleBotAnswer = async (answer: string, convId: string) => {
    const currentQ = BOT_QUESTIONS[botStep]
    if (!currentQ || currentQ.type === "done") return

    const candidateMsg: Message = {
      id: `ans-${botStep}`,
      sender: "candidate",
      text: answer,
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    }

    setBotAnswers((prev) => ({ ...prev, [currentQ.id]: answer }))
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, candidateMsg] } : c))
    )

    const conv = conversations.find((c) => c.id === convId)
    const history =
      conv?.messages.map((m) => ({
        role: m.sender === "candidate" ? "user" as const : "assistant" as const,
        content: m.text,
      })) ?? []

    const nextStep = botStep + 1
    setBotStep(nextStep)
    setIsBotTyping(true)

    try {
      const data = await apiJson<{ message?: string; text?: string; reply?: string }>(
        "/v1/chat/bot",
        {
          method: "POST",
          body: JSON.stringify({
            userMessage: answer,
            jobTitle: conv?.jobTitle,
            conversationHistory: history,
            candidateName,
          }),
        }
      )
      const botText =
        data?.message ??
        data?.text ??
        data?.reply ??
        "شكرًا على إجابتك! 🎯 أخبرني المزيد عن خبرتك ومهاراتك المرتبطة بالوظيفة."

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: botText,
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: [...c.messages, botMsg],
                lastMessage: botMsg.text,
                lastMessageTime: "الآن",
              }
            : c
        )
      )
    } catch {
      const nextQ = BOT_QUESTIONS[nextStep]
      if (nextQ) {
        const botMsg: Message = {
          id: `bot-q-${nextStep}`,
          sender: "bot",
          text: nextQ.text,
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        }
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, botMsg],
                  lastMessage: nextQ.text,
                  lastMessageTime: "الآن",
                }
              : c
          )
        )
      }
    } finally {
      setIsBotTyping(false)
    }
  }

  const handleSend = () => {
    if (!inputValue.trim() || !selectedConv) return

    if (selectedConv.type === "bot" && BOT_QUESTIONS[botStep]?.type !== "done") {
      void handleBotAnswer(inputValue.trim(), selectedConv.id)
      setInputValue("")
      return
    }

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: "candidate",
      text: inputValue.trim(),
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConv.id
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessage: newMsg.text,
              lastMessageTime: "الآن",
            }
          : c
      )
    )
    setInputValue("")
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div
          className="flex h-[calc(100vh-64px)] w-full overflow-hidden rounded-lg border border-border bg-card"
          dir="rtl"
        >
          {/* Right panel — chat (first in DOM so in RTL it appears on the right) */}
          <main
            className={cn(
              "flex flex-1 flex-col min-w-0",
              !selectedId && "max-md:hidden"
            )}
          >
            {selectedConv ? (
              <>
                <header className="flex shrink-0 items-center gap-3 border-b border-border p-3 max-md:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="md:hidden flex items-center justify-center rounded-md p-2 hover:bg-muted"
                    aria-label="العودة للمحادثات"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={cn("text-xs text-primary-foreground", selectedConv.companyColor)}>
                      {selectedConv.companyInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{selectedConv.companyName}</p>
                    <p className="text-xs text-muted-foreground">{selectedConv.jobTitle}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {selectedConv.status}
                  </Badge>
                </header>

                <ScrollArea className="flex-1 p-3">
                  <div className="flex flex-col gap-4">
                    {selectedConv.messages.map((msg) => (
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
                              : msg.sender === "bot"
                                ? "rounded-tl-sm bg-primary/10 text-foreground"
                                : "rounded-tl-sm bg-muted text-foreground"
                          )}
                        >
                          {msg.sender === "bot" && <span className="shrink-0" aria-hidden>🤖</span>}
                          <span>
                            {msg.sender === "bot" ? parseBold(decodeHtml(msg.text)) : msg.text}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                      </div>
                    ))}
                    {isBotTyping && selectedConv?.type === "bot" && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="shrink-0 border-t border-border p-3">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="اكتب رسالتك..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
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
                      disabled={!inputValue.trim()}
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

          {/* Left panel — conversations list (second in DOM so in RTL it appears on the left) */}
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
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                    <MessageSquare className="h-10 w-10 opacity-50" />
                    <p className="text-sm">لا توجد محادثات</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedId(conv.id)}
                      className={cn(
                        "flex w-full gap-3 border-b border-border p-3 text-right transition-colors hover:bg-muted/50",
                        selectedId === conv.id && "bg-accent text-accent-foreground"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarFallback className={cn("text-xs font-medium text-primary-foreground", conv.companyColor)}>
                            {conv.companyInitials}
                          </AvatarFallback>
                        </Avatar>
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <span className="truncate font-semibold text-foreground">{conv.companyName}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {conv.lastMessageTime}
                          </span>
                        </div>
                        {conv.type === "bot" && (
                          <span className="text-xs text-primary font-medium">🤖 مقابلة ذكية</span>
                        )}
                        {conv.type === "hr" && (
                          <span className="text-xs text-muted-foreground">💬 محادثة HR</span>
                        )}
                        <p className="truncate text-sm text-muted-foreground">{conv.lastMessage}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
