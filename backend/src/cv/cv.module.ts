import { Module } from '@nestjs/common';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { RulesAnalysisProvider } from './analysis/rules-analysis.provider';
import { OpenAiAnalysisProvider } from './analysis/openai-analysis.provider';
@Module({
  controllers: [CvController],
  providers: [
    CvService,
    PrismaService,
    RolesGuard,
    RulesAnalysisProvider,
    OpenAiAnalysisProvider,
  ],
})
export class CvModule {}
