import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrgModule } from '../org/org.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [OrgModule, AuditModule],
  controllers: [FilesController],
  providers: [FilesService, PrismaService],
})
export class FilesModule {}
