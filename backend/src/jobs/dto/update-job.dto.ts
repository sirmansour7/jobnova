import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

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
