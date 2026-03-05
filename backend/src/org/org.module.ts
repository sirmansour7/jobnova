import { Module } from '@nestjs/common';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { OrgAuthService } from './org-auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [OrgController],
  providers: [OrgService, OrgAuthService, PrismaService],
  exports: [OrgService, OrgAuthService],
})
export class OrgModule {}
