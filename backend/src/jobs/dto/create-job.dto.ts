import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  jobType?: string;

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
