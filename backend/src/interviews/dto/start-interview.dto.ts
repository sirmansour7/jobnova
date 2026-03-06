import { IsString, IsNotEmpty } from 'class-validator';

export class StartInterviewDto {
  @IsString()
  @IsNotEmpty()
  applicationId: string;
}
