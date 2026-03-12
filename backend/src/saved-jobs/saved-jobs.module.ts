import { Module } from '@nestjs/common';
import { SavedJobsController } from './saved-jobs.controller';
import { SavedJobsService } from './saved-jobs.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SavedJobsController],
  providers: [SavedJobsService, PrismaService],
})
export class SavedJobsModule {}
