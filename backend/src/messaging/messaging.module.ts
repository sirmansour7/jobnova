import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MessagingController],
  providers: [MessagingService, PrismaService],
})
export class MessagingModule {}
