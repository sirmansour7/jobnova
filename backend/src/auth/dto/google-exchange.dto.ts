import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class GoogleExchangeDto {
  @IsNotEmpty()
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]+$/, { message: 'code must be a lowercase hex string' })
  code: string;
}
