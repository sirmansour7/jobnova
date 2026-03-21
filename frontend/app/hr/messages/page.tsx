"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageSquare } from "lucide-react"
import { useMessages } from "@/src/hooks/useMessages"

export default function HRMessagesPage() {
  const {
    conversations,
    loading,
    activeConvId,
    selectConversation,
    sendMessage,
    sendTyping,
    sending,
    typingUsers,
  } = useMessages()

  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const conversation = conversations.find((c) => c.id === activeConvId)
  const allowedRoles = useMemo(() => ["hr"] as const, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation?.messages])

  const handleSend = () => {
    if (!activeConvId || !newMessage.trim()) return
    sendMessage(activeConvId, newMessage.trim())
    setNewMessage("")
    // Stop typing indicator
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (activeConvId) sendTyping(activeConvId, false)
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)
    if (!activeConvId) return

    sendTyping(activeConvId, true)

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      sendTyping(activeConvId, false)
    }, 2000)
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الرسائل</h1>
            <p className="text-muted-foreground">تواصل مع المرشحين</p>
          </div>

          <Card className="border-border bg-card">
            <div className="grid h-[600px] md:grid-cols-3">
              {/* Conversations list */}
              <div className="border-b border-border md:border-b-0 md:border-e">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-2">
                    {conversations.length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        لا توجد محادثات
                      </p>
                    )}
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => selectConversation(conv.id)}
                        className={`flex w-full items-center gap-3 rounded-lg p-3 text-start transition-colors ${
                          activeConvId === conv.id ? "bg-primary/10" : "hover:bg-secondary"
                        }`}
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {conv.participantAvatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-medium text-foreground">
                              {conv.participantName}
                            </p>
                            {conv.unreadCount > 0 && (
                              <Badge className="h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary p-0 text-xs text-primary-foreground">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{conv.participantRole}</p>
                          {typingUsers[conv.id] ? (
                            <p className="text-xs text-primary italic">يكتب الآن...</p>
                          ) : (
                            <p className="truncate text-xs text-muted-foreground">
                              {conv.lastMessage}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Active conversation */}
              <div className="flex flex-col md:col-span-2">
                {conversation ? (
                  <>
                    <div className="border-b border-border p-4">
                      <p className="font-medium text-foreground">{conversation.participantName}</p>
                      <p className="text-xs text-muted-foreground">{conversation.participantRole}</p>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {(conversation.messages ?? []).map((msg) => (
                          <div key={msg.id} className="flex gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {msg.senderName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="max-w-[70%] rounded-lg bg-secondary p-3 text-foreground">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                {msg.senderName}
                              </p>
                              <p className="text-sm">{msg.content}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Typing indicator */}
                        {typingUsers[conversation.id] && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex gap-1">
                              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                            </span>
                            يكتب...
                          </div>
                        )}

                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="border-t border-border p-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="اكتب رسالة..."
                          value={newMessage}
                          onChange={(e) => handleTyping(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleSend()
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={handleSend}
                          disabled={sending || !newMessage.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="mb-4 h-12 w-12" />
                    <p>اختر محادثة لبدء الدردشة</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
