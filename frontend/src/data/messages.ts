export interface Message {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  timestamp: string
  isRead: boolean
}

export interface Conversation {
  id: string
  participantName: string
  participantAvatar: string
  participantRole: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  messages: Message[]
}

export const candidateConversations: Conversation[] = [
  {
    id: "1",
    participantName: "سارة أحمد - فوري",
    participantAvatar: "SA",
    participantRole: "HR Manager",
    lastMessage: "تم تحديد موعد المقابلة يوم الأحد الساعة 11 صباحًا",
    lastMessageTime: "2026-02-25",
    unreadCount: 1,
    messages: [
      { id: "1", senderId: "2", senderName: "سارة أحمد", senderAvatar: "SA", content: "مرحبًا أحمد، شكرًا لتقديمك على وظيفة مطور واجهات أمامية", timestamp: "2026-02-22T10:00:00", isRead: true },
      { id: "2", senderId: "1", senderName: "أحمد محمد", senderAvatar: "AM", content: "شكرًا لكم، أنا متحمس جدًا لهذه الفرصة", timestamp: "2026-02-22T10:30:00", isRead: true },
      { id: "3", senderId: "2", senderName: "سارة أحمد", senderAvatar: "SA", content: "تم تحديد موعد المقابلة يوم الأحد الساعة 11 صباحًا", timestamp: "2026-02-25T09:00:00", isRead: false },
    ],
  },
  {
    id: "2",
    participantName: "محمد علي - إنستاباي",
    participantAvatar: "MA",
    participantRole: "Tech Lead",
    lastMessage: "سنعود إليك خلال أسبوع",
    lastMessageTime: "2026-02-24",
    unreadCount: 0,
    messages: [
      { id: "1", senderId: "4", senderName: "محمد علي", senderAvatar: "MA", content: "مرحبًا، تم استلام طلبك وسنراجعه قريبًا", timestamp: "2026-02-23T14:00:00", isRead: true },
      { id: "2", senderId: "1", senderName: "أحمد محمد", senderAvatar: "AM", content: "شكرًا لكم، في انتظار ردكم", timestamp: "2026-02-23T15:00:00", isRead: true },
      { id: "3", senderId: "4", senderName: "محمد علي", senderAvatar: "MA", content: "سنعود إليك خلال أسبوع", timestamp: "2026-02-24T11:00:00", isRead: true },
    ],
  },
]

export const hrConversations: Conversation[] = [
  {
    id: "1",
    participantName: "أحمد محمد",
    participantAvatar: "AM",
    participantRole: "مرشح - مطور واجهات أمامية",
    lastMessage: "شكرًا لكم، أنا متحمس جدًا لهذه الفرصة",
    lastMessageTime: "2026-02-22",
    unreadCount: 0,
    messages: [
      { id: "1", senderId: "2", senderName: "سارة أحمد", senderAvatar: "SA", content: "مرحبًا أحمد، شكرًا لتقديمك على وظيفة مطور واجهات أمامية", timestamp: "2026-02-22T10:00:00", isRead: true },
      { id: "2", senderId: "1", senderName: "أحمد محمد", senderAvatar: "AM", content: "شكرًا لكم، أنا متحمس جدًا لهذه الفرصة", timestamp: "2026-02-22T10:30:00", isRead: true },
    ],
  },
  {
    id: "2",
    participantName: "فاطمة حسن",
    participantAvatar: "FH",
    participantRole: "مرشحة - محاسب أول",
    lastMessage: "متى يمكنني البدء؟",
    lastMessageTime: "2026-02-24",
    unreadCount: 2,
    messages: [
      { id: "1", senderId: "2", senderName: "سارة أحمد", senderAvatar: "SA", content: "مرحبًا فاطمة، تمت الموافقة على طلبك مبدئيًا", timestamp: "2026-02-23T09:00:00", isRead: true },
      { id: "2", senderId: "5", senderName: "فاطمة حسن", senderAvatar: "FH", content: "رائع! شكرًا جزيلاً", timestamp: "2026-02-23T10:00:00", isRead: true },
      { id: "3", senderId: "5", senderName: "فاطمة حسن", senderAvatar: "FH", content: "متى يمكنني البدء؟", timestamp: "2026-02-24T08:00:00", isRead: false },
    ],
  },
]
