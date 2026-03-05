import { IsString, IsOptional } from 'class-validator';

export class AnalyzeCvDto {
  @IsOptional()
  @IsString()
  targetRoleTitle?: string;
}
