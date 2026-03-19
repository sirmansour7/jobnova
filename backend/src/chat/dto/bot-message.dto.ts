import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConversationMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(1000)
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
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  conversationHistory?: ConversationMessageDto[];
}
