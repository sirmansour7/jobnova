import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { InterviewsModule } from '../interviews/interviews.module';

@Module({
  imports: [InterviewsModule],
  controllers: [HrController],
  providers: [PrismaService, RolesGuard],
})
export class HrModule {}
