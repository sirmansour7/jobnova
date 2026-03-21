import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/cv',
})
export class CvGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(CvGateway.name);

  constructor(
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
      if (!token) throw new Error('No token');
      const secret = this.config.get<string>('JWT_ACCESS_SECRET');
      const payload = this.jwtService.verify<{ sub: string }>(token, { secret });
      socket.userId = payload.sub;
      await socket.join(`cv_${payload.sub}`);
      this.logger.log(`[CvGateway] Connected: ${socket.id} user=${payload.sub}`);
    } catch {
      this.logger.warn(`[CvGateway] Unauthorized: ${socket.id}`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    this.logger.log(`[CvGateway] Disconnected: ${socket.id}`);
  }

  emitIntelligenceReady(userId: string, result: unknown): void {
    this.server.to(`cv_${userId}`).emit('cv:intelligence:ready', result);
  }

  emitAnalysisProgress(userId: string, status: 'analyzing' | 'done' | 'error'): void {
    this.server.to(`cv_${userId}`).emit('cv:analysis:progress', { status });
  }
}
