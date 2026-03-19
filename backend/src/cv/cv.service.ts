import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RulesAnalysisProvider } from './analysis/rules-analysis.provider';
import { OpenAiAnalysisProvider } from './analysis/openai-analysis.provider';
import { UpdateCvDto } from './dto/update-cv.dto';
import type {
  CvContentInput,
  CombinedCvAnalysisResult,
} from './analysis/cv-analysis.types';
import { runJobAwareAnalysis } from './analysis/cv-job-analyzer';
import { sanitizeObjectStrings } from '../common/utils/sanitize-input.util';
import { AiProducer } from '../queues/ai/ai.producer';

@Injectable()
export class CvService {
  private readonly logger = new Logger(CvService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly rulesProvider: RulesAnalysisProvider,
    private readonly openAiProvider: OpenAiAnalysisProvider,
    private readonly aiProducer: AiProducer,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async getMyCv(userId: string) {
    return this.prisma.cv.findUnique({ where: { userId } });
  }

  async upsertMyCv(userId: string, body: UpdateCvDto) {
    // Sanitize every string value in the CV JSON before persisting.
    // CV fields can contain arbitrary user text that may later be interpolated
    // into LLM prompts or rendered in HR dashboards.
    const sanitized = sanitizeObjectStrings(body.contentJson);
    const data = sanitized as unknown as Prisma.InputJsonValue;
    return this.prisma.cv.upsert({
      where: { userId },
      create: { userId, data },
      update: { data },
    });
  }

  // ─── Stored analysis retrieval ─────────────────────────────────────────────

  /**
   * Returns the last analysis result persisted in `cv.data.analysis`.
   * Returns null when no CV exists or no analysis has been run yet.
   */
  async getMyAnalysis(userId: string): Promise<CombinedCvAnalysisResult | null> {
    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv) return null;
    const data = cv.data as Record<string, unknown>;
    return (data.analysis as CombinedCvAnalysisResult) ?? null;
  }

  // ─── Background analysis (queue) ───────────────────────────────────────────

  /**
   * Queues a background CV analysis job.
   * The worker (AiProcessor) always runs rules + optionally AI, merges
   * both into CombinedCvAnalysisResult, and writes it back to cv.data.analysis.
   */
  async analyzeMyCv(
    userId: string,
  ): Promise<{ status: string; message: string }> {
    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv)
      throw new BadRequestException('CV not found. Please save your CV first.');

    const providerKey = (
      this.config.get<string>('CV_ANALYSIS_PROVIDER') ?? 'rules'
    ).toLowerCase();
    // Validate provider key before queuing to fail fast on misconfiguration
    this.getProvider(providerKey);

    const version = this.config.get<number>('CV_ANALYSIS_VERSION') ?? 1;
    await this.aiProducer.queueCvAnalysis(userId, providerKey, version);

    return {
      status: 'queued',
      message: 'CV analysis started. Results will be saved to your CV shortly.',
    };
  }

  // ─── Synchronous combined analysis ─────────────────────────────────────────

  /**
   * Runs a synchronous CV analysis combining:
   *   1. Rule-based scoring  — always, fast & deterministic.
   *   2. Job-aware analysis  — keyword matching against the target role.
   *   3. AI enrichment       — optional; tried if CV_ANALYSIS_PROVIDER=openai.
   *
   * All three results are merged into a single CombinedCvAnalysisResult,
   * persisted in cv.data.analysis, and returned to the caller.
   */
  async analyzeMyCvForRole(
    userId: string,
    targetRoleTitle: string,
  ): Promise<CombinedCvAnalysisResult> {
    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv)
      throw new BadRequestException('CV not found. Please save your CV first.');

    const content: CvContentInput | null =
      cv.data && typeof cv.data === 'object' && !Array.isArray(cv.data)
        ? (cv.data as unknown as CvContentInput)
        : null;

    // 1. Rule-based analysis: deterministic score, strengths, keyword gaps
    const rulesResult = await this.rulesProvider.analyze(content);

    // 2. Job-aware analysis: language detection, role keyword matching
    const jobAwareResult = runJobAwareAnalysis(content, targetRoleTitle ?? '');

    // 3. AI enrichment (optional — may be unconfigured or temporarily down)
    let aiImprovements: string[] = [];
    const providerKey = (
      this.config.get<string>('CV_ANALYSIS_PROVIDER') ?? 'rules'
    ).toLowerCase();
    if (providerKey === 'openai') {
      try {
        const aiResult = await this.openAiProvider.analyze(content);
        aiImprovements = aiResult.suggestedImprovements;
      } catch (err) {
        // Non-fatal: log and continue with rules + job-aware data only.
        this.logger.warn(
          `AI enrichment failed, returning rules-only result: ${String(err)}`,
        );
      }
    }

    // 4. Merge into unified result
    const score = rulesResult.score;
    const level: CombinedCvAnalysisResult['level'] =
      score >= 80 ? 'excellent'
      : score >= 60 ? 'good'
      : score >= 40 ? 'fair'
      : 'poor';

    // Deduplicated recommendations: rules improvements → job-aware improvements → AI improvements
    const recommendations = [
      ...rulesResult.suggestedImprovements,
      ...jobAwareResult.improvements,
      ...aiImprovements,
    ]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 8);

    const combined: CombinedCvAnalysisResult = {
      score,
      level,
      language: jobAwareResult.language,
      matchedSkills: jobAwareResult.roleMatch.matchedKeywords,
      missingSkills: jobAwareResult.roleMatch.missingKeywords,
      strengths: rulesResult.strengths,
      recommendations,
      atsNotes: rulesResult.atsNotes,
      aiEnriched: aiImprovements.length > 0,
      targetRole: targetRoleTitle || 'Not specified',
      analysedAt: new Date().toISOString(),
    };

    // Persist so GET /cv/me/analysis always returns the latest result
    const baseData =
      cv.data && typeof cv.data === 'object' && !Array.isArray(cv.data)
        ? (cv.data as Record<string, unknown>)
        : {};
    await this.prisma.cv.update({
      where: { userId },
      data: {
        data: {
          ...baseData,
          analysis: combined,
          analysisMeta: { updatedAt: combined.analysedAt },
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return combined;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

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
