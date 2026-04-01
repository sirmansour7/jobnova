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

export class CvAssistantMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(1000)
  content: string;
}

export class CvAssistantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  userMessage: string;

  @IsString()
  @IsOptional()
  candidateName?: string;

  /** The current step the user is on (0-4) */
  @IsOptional()
  currentStep?: number;

  /** Partial CV context so the bot can give relevant advice */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  cvContext?: string;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CvAssistantMessageDto)
  conversationHistory?: CvAssistantMessageDto[];
}
