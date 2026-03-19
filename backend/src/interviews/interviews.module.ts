import { Module } from '@nestjs/common';
import {
  InterviewsController,
  HrInterviewsController,
} from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgModule } from '../org/org.module';

@Module({
  imports: [OrgModule],
  controllers: [InterviewsController, HrInterviewsController],
  providers: [InterviewsService, PrismaService, RolesGuard],
  exports: [InterviewsService],
})
export class InterviewsModule {}
