import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { BotMessageDto } from './dto/bot-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('bot')
  async getBotResponse(@Body() body: BotMessageDto) {
    const { userMessage, jobTitle, conversationHistory, candidateName } = body;
    const reply = await this.chatService.getBotResponse(
      userMessage,
      jobTitle ?? 'وظيفة',
      conversationHistory ?? [],
      candidateName ?? 'المرشح',
    );
    return { message: reply };
  }
}
