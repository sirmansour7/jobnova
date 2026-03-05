import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConversationMessageDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class BotMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  userMessage: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsString()
  @IsOptional()
  candidateName?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  conversationHistory?: ConversationMessageDto[];
}
