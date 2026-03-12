import { Module } from '@nestjs/common';
import { GovernoratesController } from './governorates.controller';
import { GovernoratesService } from './governorates.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [GovernoratesController],
  providers: [GovernoratesService, PrismaService],
  exports: [GovernoratesService],
})
export class GovernoratesModule {}
