import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobMatchService } from './job-match.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgModule } from '../org/org.module';

@Module({
  imports: [OrgModule],
  controllers: [JobsController],
  providers: [JobsService, JobMatchService, PrismaService, RolesGuard],
  exports: [JobsService],
})
export class JobsModule {}
