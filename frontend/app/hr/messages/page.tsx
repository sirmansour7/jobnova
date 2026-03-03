"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageSquare } from "lucide-react"
import { hrConversations } from "@/src/data/messages"

export default function HRMessagesPage() {
  const [selectedConv, setSelectedConv] = useState<string>(hrConversations[0]?.id ?? "")
  const [newMessage, setNewMessage] = useState("")

  const conversation = hrConversations.find((c) => c.id === selectedConv)

  return (
    <ProtectedRoute allowedRoles={["hr"]}>
      <DashboardLayout>
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الرسائل</h1>
            <p className="text-muted-foreground">تواصل مع المرشحين</p>
          </div>

          <Card className="border-border bg-card">
            <div className="grid h-[600px] md:grid-cols-3">
              <div className="border-b border-border md:border-b-0 md:border-e">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-2">
                    {hrConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConv(conv.id)}
                        className={`flex w-full items-center gap-3 rounded-lg p-3 text-start transition-colors ${
                          selectedConv === conv.id ? "bg-primary/10" : "hover:bg-secondary"
                        }`}
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">{conv.participantAvatar}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground truncate">{conv.participantName}</p>
                            {conv.unreadCount > 0 && (
                              <Badge className="h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary p-0 text-xs text-primary-foreground">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{conv.participantRole}</p>
                          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex flex-col md:col-span-2">
                {conversation ? (
                  <>
                    <div className="border-b border-border p-4">
                      <p className="font-medium text-foreground">{conversation.participantName}</p>
                      <p className="text-xs text-muted-foreground">{conversation.participantRole}</p>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {conversation.messages.map((msg) => (
                          <div key={msg.id} className={`flex gap-3 ${msg.senderId === "2" ? "flex-row-reverse" : ""}`}>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">{msg.senderAvatar}</AvatarFallback>
                            </Avatar>
                            <div className={`max-w-[70%] rounded-lg p-3 ${msg.senderId === "2" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                              <p className="text-sm">{msg.content}</p>
                              <p className={`mt-1 text-xs ${msg.senderId === "2" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {new Date(msg.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="border-t border-border p-4">
                      <div className="flex gap-2">
                        <Input placeholder="اكتب رسالة..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                        <Button size="icon" onClick={() => setNewMessage("")}><Send className="h-4 w-4" /></Button>
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
