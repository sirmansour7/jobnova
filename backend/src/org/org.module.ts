import { Module } from '@nestjs/common';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { OrgAuthService } from './org-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [OrgController],
  providers: [OrgService, OrgAuthService, PrismaService, RolesGuard],
  exports: [OrgService, OrgAuthService],
})
export class OrgModule {}
