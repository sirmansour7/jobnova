import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvIntelligenceService } from './cv-intelligence.service';
import { CvExportService } from './cv-export.service';
import { CvGateway } from './cv.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { RulesAnalysisProvider } from './analysis/rules-analysis.provider';
import { OpenAiAnalysisProvider } from './analysis/openai-analysis.provider';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [CvController],
  providers: [
    CvService,
    CvIntelligenceService,
    CvExportService,
    CvGateway,
    ConfigService,
    PrismaService,
    RolesGuard,
    RulesAnalysisProvider,
    OpenAiAnalysisProvider,
  ],
})
export class CvModule {}
