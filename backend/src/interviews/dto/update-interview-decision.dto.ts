import { IsEnum } from 'class-validator';
import { HrDecision } from '@prisma/client';

export class UpdateInterviewDecisionDto {
  @IsEnum(HrDecision)
  decision: HrDecision;
}
