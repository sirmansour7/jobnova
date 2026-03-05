import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(userId: string) {
    const participations = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, fullName: true, role: true } },
              },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    const results = await Promise.all(
      participations.map(async ({ conversation }) => {
        const other = conversation.participants.find(
          (p) => p.userId !== userId,
        );
        const lastMsg = conversation.messages[0];
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            isRead: false,
          },
        });
        return {
          id: conversation.id,
          participantId: other?.userId ?? '',
          participantName: other?.user.fullName ?? 'مستخدم',
          participantAvatar: (other?.user.fullName ?? '?')
            .slice(0, 2)
            .toUpperCase(),
          participantRole: other?.user.role === 'hr' ? 'مسؤول توظيف' : 'مرشح',
          lastMessage: lastMsg?.content ?? '',
          lastMessageTime:
            lastMsg?.createdAt.toISOString() ??
            conversation.createdAt.toISOString(),
          unreadCount,
          messages: [],
        };
      }),
    );
    return results;
  }

  async getMessages(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender.fullName,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      isRead: m.isRead,
    }));
  }

  async sendMessage(conversationId: string, userId: string, content: string) {
    await this.assertParticipant(conversationId, userId);
    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, content },
      include: { sender: { select: { id: true, fullName: true } } },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return {
      id: message.id,
      senderId: message.senderId,
      senderName: message.sender.fullName,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      isRead: message.isRead,
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });
    return { message: 'Messages marked as read' };
  }

  async getOrCreateConversation(userId: string, otherUserId: string) {
    const existing = await this.prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversation: { participants: { some: { userId: otherUserId } } },
      },
      select: { conversationId: true },
    });
    if (existing) return { id: existing.conversationId };
    const conversation = await this.prisma.conversation.create({
      data: {
        participants: {
          createMany: { data: [{ userId }, { userId: otherUserId }] },
        },
      },
    });
    return { id: conversation.id };
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const p = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!p)
      throw new ForbiddenException('Not a participant in this conversation');
  }
}
