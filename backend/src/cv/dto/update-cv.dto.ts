import { IsObject, IsNotEmpty } from 'class-validator';

export class UpdateCvDto {
  @IsObject()
  @IsNotEmpty()
  contentJson: Record<string, unknown>;
}
