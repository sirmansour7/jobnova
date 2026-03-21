import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
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
import {
  extractPdfText,
  extractProfileFromText,
  extractFeedbackFromText,
  type CvFeedback,
} from './analysis/cv-pdf-groq-analyzer';
import { CvGateway } from './cv.gateway';
import { CvIntelligenceService } from './cv-intelligence.service';

@Injectable()
export class CvService {
  private readonly logger = new Logger(CvService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly rulesProvider: RulesAnalysisProvider,
    private readonly openAiProvider: OpenAiAnalysisProvider,
    private readonly aiProducer: AiProducer,
    @Optional() private readonly cvIntelligenceService: CvIntelligenceService | null = null,
    @Optional() private readonly cvGateway: CvGateway | null = null,
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
    const result = await this.prisma.cv.upsert({
      where: { userId },
      create: { userId, data },
      update: { data },
    });

    // Auto-refresh intelligence in background when CV is manually updated
    if (this.cvIntelligenceService) {
      void this.cvIntelligenceService.analyze(userId).catch(() => {
        /* non-fatal */
      });
    }
    return result;
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

  // ─── PDF Upload ────────────────────────────────────────────────────────────

  /**
   * Saves an uploaded PDF and links it to the candidate's application.
   * Validates ownership and replaces any previously uploaded PDF.
   */
  async uploadCvPdf(
    userId: string,
    applicationId: string,
    file: Express.Multer.File,
    backendBaseUrl: string,
  ): Promise<{ cvUrl: string; cvUploadedAt: Date }> {
    // Verify application belongs to this candidate
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, candidateId: true, cvUrl: true },
    });

    if (!application) {
      await this.deleteUploadedFile(file.path);
      throw new BadRequestException('Application not found');
    }

    if (application.candidateId !== userId) {
      await this.deleteUploadedFile(file.path);
      throw new ForbiddenException('You do not own this application');
    }

    // Remove old PDF from disk if there is one
    if (application.cvUrl) {
      const oldFilename = application.cvUrl.split('/uploads/cv/')[1];
      if (oldFilename) {
        await this.deleteUploadedFile(
          join(process.cwd(), 'uploads', 'cv', oldFilename),
        );
      }
    }

    // Build the public URL for the uploaded file
    const cvUrl = `${backendBaseUrl}/uploads/cv/${file.filename}`;
    const cvUploadedAt = new Date();

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { cvUrl, cvUploadedAt },
    });

    // ── Background AI analysis (fire-and-forget, never blocks the response) ──
    void this.analyzePdfBackground(userId, file.path);

    return { cvUrl, cvUploadedAt };
  }

  // ─── Re-trigger PDF analysis on demand ────────────────────────────────────

  /**
   * POST /cv/re-analyze-pdf
   * Finds the candidate's most recently uploaded PDF (via any Application)
   * and re-runs Groq analysis on it. Returns immediately with a status message.
   */
  async reAnalyzeLatestPdf(
    userId: string,
  ): Promise<{ status: string; message: string }> {
    // Find the latest application that has a PDF uploaded
    const application = await this.prisma.application.findFirst({
      where: { candidateId: userId, cvUrl: { not: null } },
      orderBy: { cvUploadedAt: 'desc' },
      select: { cvUrl: true },
    });

    if (!application?.cvUrl) {
      throw new BadRequestException(
        'No PDF found. Please upload a CV PDF first.',
      );
    }

    // Resolve local file path from the public URL
    // URL pattern: <baseUrl>/uploads/cv/<filename>
    const filename = application.cvUrl.split('/uploads/cv/')[1];
    if (!filename) {
      throw new BadRequestException('Invalid CV URL format.');
    }

    const filePath = join(process.cwd(), 'uploads', 'cv', filename);

    // Fire-and-forget
    void this.analyzePdfBackground(userId, filePath);

    return {
      status: 'queued',
      message: 'CV analysis started. Your job recommendations will update shortly.',
    };
  }

  // ─── Background PDF → Groq Analysis ────────────────────────────────────────

  /**
   * Reads the uploaded PDF, sends the extracted text to Groq, and merges
   * the resulting profile data (skills, yearsOfExperience, specialization,
   * location) into the candidate's `cv.data` JSON blob.
   *
   * Called fire-and-forget from `uploadCvPdf()` so the HTTP response is
   * never delayed. All errors are caught and logged — never propagated.
   */
  private async analyzePdfBackground(
    userId: string,
    filePath: string,
  ): Promise<void> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.warn('[CvService] GROQ_API_KEY not set — skipping PDF analysis');
      return;
    }

    try {
      // ── 1. Extract text once (shared by both Groq calls) ────────────────────
      const text = await extractPdfText(filePath, this.logger);
      if (!text) {
        this.logger.warn(`[CvService] No usable PDF text for user ${userId}`);
        return;
      }

      // ── 2. Run profile extraction + feedback in parallel ─────────────────────
      const [extracted, feedback] = await Promise.all([
        extractProfileFromText(text, apiKey, this.logger),
        extractFeedbackFromText(text, apiKey, this.logger),
      ]);

      const hasProfileData =
        extracted.skills.length > 0 ||
        extracted.yearsOfExperience !== null ||
        extracted.specialization !== null ||
        extracted.location !== null;

      if (!hasProfileData && !feedback) {
        this.logger.warn(`[CvService] Both Groq calls returned empty for user ${userId}`);
        return;
      }

      // ── 3. Merge into cv.data ────────────────────────────────────────────────
      const existing = await this.prisma.cv.findUnique({ where: { userId } });
      const base: Record<string, unknown> =
        existing?.data &&
        typeof existing.data === 'object' &&
        !Array.isArray(existing.data)
          ? { ...(existing.data as Record<string, unknown>) }
          : {};

      const merged: Record<string, unknown> = {
        ...base,
        // Profile fields — only overwrite when extraction produced something
        ...(extracted.skills.length > 0 && { skills: extracted.skills }),
        ...(extracted.yearsOfExperience !== null && {
          experienceYears: extracted.yearsOfExperience,
        }),
        ...(extracted.specialization !== null && { title: extracted.specialization }),
        ...(extracted.seniority       !== null && { seniority: extracted.seniority }),
        ...(extracted.location        !== null && {
          location: extracted.location,
          city:     extracted.location, // job-match service reads 'city'
        }),
        pdfAnalyzedAt: new Date().toISOString(),
        // Career-advisor feedback (stored as a nested object for easy retrieval)
        ...(feedback && { cvFeedback: feedback }),
      };

      await this.prisma.cv.upsert({
        where: { userId },
        create: { userId, data: merged as unknown as Prisma.InputJsonValue },
        update: { data: merged as unknown as Prisma.InputJsonValue },
      });

      // Signal "analyzing" so frontend shows progress spinner
      this.cvGateway?.emitAnalysisProgress(userId, 'analyzing');

      // Auto-chain full intelligence analysis (fire-and-forget)
      // The intelligence service will emit cv:intelligence:ready when done
      if (this.cvIntelligenceService) {
        void this.cvIntelligenceService.analyze(userId).catch((err: unknown) => {
          this.logger.warn(`[CvService] Auto-intelligence failed for ${userId}: ${String(err)}`);
          this.cvGateway?.emitAnalysisProgress(userId, 'error');
        });
      }

      this.logger.log(
        `[CvService] PDF analysis saved for user ${userId}: ` +
          `${extracted.skills.length} skills, ${extracted.yearsOfExperience}yr, ` +
          `"${extracted.seniority}", score=${feedback?.score ?? '—'}`,
      );
    } catch (err) {
      this.logger.warn(
        `[CvService] Background PDF analysis failed for user ${userId}: ${String(err)}`,
      );
    }
  }

  // ─── CV Feedback retrieval ─────────────────────────────────────────────────

  /**
   * GET /cv/me/feedback
   * Returns the stored career-advisor feedback from the last PDF analysis,
   * or null when no PDF has been uploaded / analysed yet.
   */
  async getCvFeedback(userId: string): Promise<CvFeedback | null> {
    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv?.data) return null;
    const data = cv.data as Record<string, unknown>;
    return (data.cvFeedback as CvFeedback | undefined) ?? null;
  }

  private async deleteUploadedFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch {
      // File may not exist — log but don't throw
      this.logger.warn(`Could not delete file: ${filePath}`);
    }
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
