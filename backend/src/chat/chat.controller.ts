import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ChatService } from './chat.service';
import { BotMessageDto } from './dto/bot-message.dto';
import { CvAssistantDto } from './dto/cv-assistant.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.candidate, Role.hr)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('bot')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getBotResponse(
    @Body() body: BotMessageDto,
    @Req() req: Request & { user: { sub: string; role: Role } },
  ) {
    const { userMessage, jobTitle, conversationHistory, candidateName } = body;
    const reply = await this.chatService.getBotResponse(
      userMessage,
      jobTitle ?? 'وظيفة',
      conversationHistory ?? [],
      candidateName ?? 'المرشح',
    );
    return { message: reply };
  }

  @Post('cv-assistant')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getCvAssistantResponse(
    @Body() body: CvAssistantDto,
    @Req() req: Request & { user: { sub: string; role: Role } },
  ) {
    const { userMessage, conversationHistory, candidateName, currentStep, cvContext } = body;
    const reply = await this.chatService.getCvAssistantResponse(
      userMessage,
      conversationHistory ?? [],
      candidateName ?? 'المرشح',
      currentStep,
      cvContext,
    );
    return { message: reply };
  }
}
