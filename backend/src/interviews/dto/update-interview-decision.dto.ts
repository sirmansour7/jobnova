import { IsString, IsIn } from 'class-validator';

export class UpdateInterviewDecisionDto {
  @IsString()
  @IsIn(['shortlist', 'reject', 'needs review'])
  decision: string;
}
