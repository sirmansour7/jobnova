import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsInt,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { InterviewType } from '@prisma/client';

export class CreateScheduleInterviewDto {
  @IsString()
  applicationId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  durationMins?: number;

  @IsOptional()
  @IsEnum(InterviewType)
  type?: InterviewType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
