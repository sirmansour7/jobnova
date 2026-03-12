import { IsString, IsDateString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateScheduleInterviewDto {
  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  durationMins?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}
