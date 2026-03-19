import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAiAnalysisProvider } from '../../cv/analysis/openai-analysis.provider';
import { RulesAnalysisProvider } from '../../cv/analysis/rules-analysis.provider';
import { InterviewSummaryService } from '../../interviews/interview-summary.service';
import type {
  CvContentInput,
  CombinedCvAnalysisResult,
} from '../../cv/analysis/cv-analysis.types';
import { runJobAwareAnalysis } from '../../cv/analysis/cv-job-analyzer';
import { QUEUE_AI, AiJobName } from '../queues.constants';

type CvAnalysisPayload = { userId: string; providerKey: string; version: number };
type InterviewSummaryPayload = { sessionId: string };

@Processor(QUEUE_AI, { concurrency: 2 })
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiProvider: OpenAiAnalysisProvider,
    private readonly rulesProvider: RulesAnalysisProvider,
    private readonly summaryService: InterviewSummaryService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case AiJobName.ANALYZE_CV:
        await this.processCvAnalysis(job.data as CvAnalysisPayload);
        break;
      case AiJobName.GENERATE_INTERVIEW_SUMMARY:
        await this.summaryService.generate(
          (job.data as InterviewSummaryPayload).sessionId,
        );
        break;
      default:
        this.logger.warn(`[AiProcessor] Unknown job name: ${job.name}`);
    }
  }

  private async processCvAnalysis(data: CvAnalysisPayload): Promise<void> {
    const { userId, providerKey, version } = data;

    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv) throw new Error(`CV not found for user ${userId}`);

    const content: CvContentInput | null =
      cv.data && typeof cv.data === 'object' && !Array.isArray(cv.data)
        ? (cv.data as unknown as CvContentInput)
        : null;

    // 1. Rule-based analysis — always runs (fast, no network dependency)
    const rulesResult = await this.rulesProvider.analyze(content);

    // 2. AI enrichment — only when explicitly requested; non-fatal if it fails
    let aiImprovements: string[] = [];
    let aiEnriched = false;
    if (providerKey === 'openai') {
      try {
        const aiResult = await this.openAiProvider.analyze(content);
        aiImprovements = aiResult.suggestedImprovements;
        aiEnriched = true;
      } catch (err) {
        this.logger.warn(
          `[AiProcessor] AI provider failed for user ${userId}; ` +
            `using rules result only. Error: ${String(err)}`,
        );
      }
    }

    // 3. Job-aware analysis with empty target role for language detection
    const jobAwareResult = runJobAwareAnalysis(content, '');

    // 4. Merge into CombinedCvAnalysisResult
    const score = rulesResult.score;
    const level: CombinedCvAnalysisResult['level'] =
      score >= 80 ? 'excellent'
      : score >= 60 ? 'good'
      : score >= 40 ? 'fair'
      : 'poor';

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
      // Background jobs don't have a target role; matchedSkills are empty.
      // Use missingSkills from rules (generic keyword gaps).
      matchedSkills: [],
      missingSkills: rulesResult.keywordsMissing,
      strengths: rulesResult.strengths,
      recommendations,
      atsNotes: rulesResult.atsNotes,
      aiEnriched,
      targetRole: '',
      analysedAt: new Date().toISOString(),
    };

    // 5. Persist merged result
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
          analysisMeta: {
            providerKey,
            aiEnriched,
            version,
            updatedAt: combined.analysedAt,
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`[ai] ${job.name}#${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `[ai] ${job.name}#${job.id} failed` +
        ` (attempt ${job.attemptsMade}/${job.opts.attempts ?? '?'}): ${error.message}`,
    );
  }
}
