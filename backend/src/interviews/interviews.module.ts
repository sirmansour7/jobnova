import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  InterviewsController,
  HrInterviewsController,
} from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgModule } from '../org/org.module';

@Module({
  imports: [OrgModule, ConfigModule],
  controllers: [InterviewsController, HrInterviewsController],
  providers: [InterviewsService, PrismaService, RolesGuard, ConfigService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
