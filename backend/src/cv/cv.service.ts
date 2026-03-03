import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RulesAnalysisProvider } from './analysis/rules-analysis.provider';
import { OpenAiAnalysisProvider } from './analysis/openai-analysis.provider';
import type {
  CvAnalysisResult,
  CvContentInput,
} from './analysis/cv-analysis.types';
@Injectable()
export class CvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly rulesProvider: RulesAnalysisProvider,
    private readonly openAiProvider: OpenAiAnalysisProvider,
  ) {}
  async getMyCv(userId: string) {
    return this.prisma.cv.findUnique({ where: { userId } });
  }
  async upsertMyCv(userId: string, body: unknown) {
    const contentJson = this.normalizeContent(body) as Prisma.InputJsonValue;
    return this.prisma.cv.upsert({
      where: { userId },
      create: { userId, contentJson },
      update: { contentJson },
    });
  }
  async analyzeMyCv(userId: string): Promise<CvAnalysisResult> {
    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv)
      throw new BadRequestException('CV not found. Please save your CV first.');
    const providerKey = (
      this.config.get<string>('CV_ANALYSIS_PROVIDER') ?? 'rules'
    ).toLowerCase();
    const version = this.config.get<number>('CV_ANALYSIS_VERSION') ?? 1;
    const provider = this.getProvider(providerKey);
    const analysis = await provider.analyze(
      cv.contentJson as CvContentInput | null,
    );
    const analysisJson: Prisma.InputJsonValue = {
      score: analysis.score,
      strengths: analysis.strengths,
      gaps: analysis.gaps,
      keywordsMissing: analysis.keywordsMissing,
      suggestedImprovements: analysis.suggestedImprovements,
      atsNotes: analysis.atsNotes,
    };
    await this.prisma.cv.update({
      where: { userId },
      data: {
        analysisJson,
        analysisProvider: provider.name,
        analysisVersion: version,
        analysisUpdatedAt: new Date(),
      },
    });
    return analysis;
  }
  private normalizeContent(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Body must be an object.');
    const obj = body as Record<string, unknown>;
    if ('contentJson' in obj) {
      const value = obj.contentJson;
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new BadRequestException('contentJson must be a non-null object.');
      return value as Record<string, unknown>;
    }
    return obj;
  }
  private getProvider(providerKey: string) {
    if (providerKey === 'openai') {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (!apiKey)
        throw new InternalServerErrorException(
          'OPENAI_API_KEY required for openai provider.',
        );
      return this.openAiProvider;
    }
    if (providerKey !== 'rules')
      throw new InternalServerErrorException(
        `Unsupported provider "${providerKey}".`,
      );
    return this.rulesProvider;
  }
}
