import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [JobsController],
  providers: [JobsService, PrismaService, RolesGuard],
  exports: [JobsService],
})
export class JobsModule {}
