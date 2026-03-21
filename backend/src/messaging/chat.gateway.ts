import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers?.authorization as string | undefined)
          ?.replace('Bearer ', '')
          .trim();

      if (!token) throw new Error('No token provided');

      const secret = this.config.get<string>('JWT_ACCESS_SECRET');
      const payload = this.jwtService.verify<{ sub: string }>(token, { secret });
      socket.userId = payload.sub;
      this.logger.log(`Connected: ${socket.id} (user: ${socket.userId})`);
    } catch {
      this.logger.warn(`Unauthorized WS connection: ${socket.id}`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    this.logger.log(`Disconnected: ${socket.id}`);
  }

  /**
   * Client emits: { conversationId: string }
   * Server joins socket to room `conversation_<id>`
   */
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!socket.userId) return;
    const room = `conversation_${data.conversationId}`;
    await socket.join(room);
    this.logger.log(`${socket.userId} joined room ${room}`);
    return { event: 'joinedConversation', data: { conversationId: data.conversationId } };
  }

  /**
   * Client emits: { conversationId: string }
   */
  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const room = `conversation_${data.conversationId}`;
    await socket.leave(room);
  }

  /**
   * Client emits: { conversationId: string; content: string }
   * Server saves to DB via MessagingService and broadcasts `newMessage` to room.
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    if (!socket.userId) {
      socket.disconnect(true);
      return;
    }

    try {
      const message = await this.messagingService.sendMessage(
        data.conversationId,
        socket.userId,
        data.content,
      );

      const room = `conversation_${data.conversationId}`;
      // Broadcast to everyone in the room (including sender via acknowledgement)
      this.server.to(room).emit('newMessage', {
        conversationId: data.conversationId,
        message,
      });

      return { event: 'messageSent', data: message };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      return { event: 'error', data: { message: msg } };
    }
  }

  /**
   * Client emits: { conversationId: string; isTyping: boolean }
   * Broadcasts typing indicator to others in the room.
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    if (!socket.userId) return;
    const room = `conversation_${data.conversationId}`;
    socket.to(room).emit('typing', {
      userId: socket.userId,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  /**
   * Utility: emit `newMessage` from REST controller when HR sends via HTTP.
   * Called by MessagingController when needed.
   */
  emitNewMessage(conversationId: string, message: unknown) {
    const room = `conversation_${conversationId}`;
    this.server.to(room).emit('newMessage', { conversationId, message });
  }
}
