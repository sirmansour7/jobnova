import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { JobCategory, JobType } from '@prisma/client';

export class UpdateJobDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  partnerName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  governorate?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsEnum(JobCategory)
  @IsOptional()
  category?: JobCategory;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  skills?: string[];

  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  @IsInt()
  @IsOptional()
  @Min(0)
  minExperience?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  salaryMin?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  salaryMax?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
