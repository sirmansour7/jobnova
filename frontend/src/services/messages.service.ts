import { apiJson } from "@/src/lib/api"

export interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  createdAt: string
  isRead: boolean
}

export interface Conversation {
  id: string
  participantId: string
  participantName: string
  participantAvatar: string
  participantRole: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  messages: Message[]
}

export async function getConversations(): Promise<Conversation[]> {
  return apiJson<Conversation[]>("/v1/conversations")
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  return apiJson<Message[]>(`/v1/conversations/${conversationId}/messages`)
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  return apiJson<Message>(`/v1/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })
}

export async function getOrCreateConversation(otherUserId: string): Promise<{ id: string }> {
  return apiJson<{ id: string }>(`/v1/conversations/with/${otherUserId}`, {
    method: "POST",
  })
}

export async function markConversationAsRead(conversationId: string): Promise<void> {
  await apiJson(`/v1/conversations/${conversationId}/read`, {
    method: "PATCH",
  })
}
