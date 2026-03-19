import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MessagingService } from './messaging.service';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import type { Request } from 'express';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get()
  getConversations(@Req() req: Request & { user: { sub: string } }) {
    return this.messagingService.getConversations(req.user.sub);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.messagingService.markAsRead(id, req.user.sub);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.messagingService.getMessages(id, req.user.sub);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id', ParseCuidPipe) id: string,
    @Body('content') content: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.messagingService.sendMessage(id, req.user.sub, content);
  }

  @Post('with/:otherUserId')
  getOrCreate(
    @Param('otherUserId', ParseCuidPipe) otherUserId: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.messagingService.getOrCreateConversation(
      req.user.sub,
      otherUserId,
    );
  }
}
