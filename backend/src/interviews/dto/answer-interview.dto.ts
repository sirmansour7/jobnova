import { IsString, IsNotEmpty } from 'class-validator';

export class AnswerInterviewDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
