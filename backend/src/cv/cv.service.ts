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
import { UpdateCvDto } from './dto/update-cv.dto';
import type {
  CvAnalysisResult,
  CvContentInput,
  CvAnalysisApiResponse,
} from './analysis/cv-analysis.types';
import { runJobAwareAnalysis } from './analysis/cv-job-analyzer';
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
  async upsertMyCv(userId: string, body: UpdateCvDto) {
    const data = body.contentJson as unknown as Prisma.InputJsonValue;
    return this.prisma.cv.upsert({
      where: { userId },
      create: { userId, data },
      update: { data },
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

    const content =
      cv.data && typeof cv.data === 'object' && !Array.isArray(cv.data)
        ? (cv.data as unknown as CvContentInput)
        : null;

    const analysis = await provider.analyze(content);

    const baseData =
      cv.data && typeof cv.data === 'object' && !Array.isArray(cv.data)
        ? (cv.data as Record<string, unknown>)
        : {};
    const nextData: Record<string, unknown> = {
      ...baseData,
      analysis,
      analysisMeta: {
        provider: provider.name,
        version,
        updatedAt: new Date().toISOString(),
      },
    };

    await this.prisma.cv.update({
      where: { userId },
      data: {
        data: nextData as unknown as Prisma.InputJsonValue,
      },
    });
    return analysis;
  }

  /** Job-title aware analysis: bilingual, returns structured API response. */
  async analyzeMyCvForRole(
    userId: string,
    targetRoleTitle: string,
  ): Promise<CvAnalysisApiResponse> {
    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv)
      throw new BadRequestException('CV not found. Please save your CV first.');
    const content: CvContentInput | null =
      cv.data && typeof cv.data === 'object' && !Array.isArray(cv.data)
        ? (cv.data as unknown as CvContentInput)
        : null;
    const result = runJobAwareAnalysis(content, targetRoleTitle ?? '');
    const baseData =
      cv.data && typeof cv.data === 'object' && !Array.isArray(cv.data)
        ? (cv.data as Record<string, unknown>)
        : {};
    await this.prisma.cv.update({
      where: { userId },
      data: {
        data: {
          ...baseData,
          analysis: result,
          analysisMeta: { updatedAt: new Date().toISOString() },
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return result;
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
