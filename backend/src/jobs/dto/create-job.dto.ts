import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { JobCategory, JobType } from '@prisma/client';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  partnerName: string;

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

  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  /** Required skills for the role (e.g. ["React", "Node.js"]). Max 30 entries. */
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  skills?: string[];

  /** Minimum years of experience required for this role. */
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
