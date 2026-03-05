import { IsObject, IsNotEmpty } from 'class-validator';

export class ScreeningAnswersDto {
  @IsObject()
  @IsNotEmpty()
  screeningAnswers: Record<string, unknown>;
}
