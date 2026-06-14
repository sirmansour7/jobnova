import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrgModule } from '../org/org.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [OrgModule, JobsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, PrismaService],
})
export class ApplicationsModule {}
