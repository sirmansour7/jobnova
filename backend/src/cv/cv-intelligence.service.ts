import {
  BadRequestException,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CvGateway } from './cv.gateway';

// ===========================================================================
// ─── Result types ───────────────────────────────────────────────────────────
// ===========================================================================

export interface CvIntelligenceResult {
  structuredData: {
    skills: string[];
    yearsOfExperience: number | null;
    specialization: string | null;
    seniority: 'junior' | 'mid' | 'senior' | null;
    location: string | null;
  };
  gapAnalysis: {
    /** Skills found in target jobs that the candidate lacks */
    missingSkills: string[];
    /** Plain-text description of experience or qualification gaps */
    missingExperience: string;
    /** Actionable improvements to the candidate's profile */
    improvements: string[];
    /** Most-demanded skills across all jobs in the market scan */
    marketDemandSkills: string[];
  };
  careerRecommendations: Array<{
    /** Real DB job ID (populated after matching) */
    jobId: string;
    jobTitle: string;
    company: string;
    matchScore: number;
    recommendedSkills: string[];
    reason: string;
  }>;
  improvedCv: {
    /** 2–3 sentence ATS-optimised professional summary */
    professionalSummary: string;
    /** Skills list reordered / completed for ATS */
    optimizedSkills: string[];
    /** Specific tips to improve experience bullet points */
    achievementTips: string[];
    /** Full ATS-formatted CV text (ready to copy) */
    fullText: string;
  };
  marketSkillAnalytics: {
    /** Top 10 skills demanded in the candidate's specialization across all jobs */
    topSkills: Array<{ skill: string; alreadyHas: boolean }>;
  };
  /** ISO timestamp */
  analyzedAt: string;
}

// ===========================================================================
// ─── Internal DB job shape ──────────────────────────────────────────────────
// ===========================================================================

interface JobRow {
  id: string;
  title: string;
  partnerName: string;
  skills: string[];
  minExperience: number | null;
  category: string | null;
  cityRel: { name: string } | null;
  governorateRel: { name: string } | null;
}

// ===========================================================================
// ─── Service ────────────────────────────────────────────────────────────────
// ===========================================================================

@Injectable()
export class CvIntelligenceService {
  private readonly logger = new Logger(CvIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly cvGateway: CvGateway | null = null,
  ) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Runs the full CV intelligence pipeline:
   *   1. Loads the candidate's cv.data from DB
   *   2. Fetches the 20 most recent active jobs
   *   3. Sends a unified prompt to Groq
   *   4. Parses + enriches the response
   *   5. Persists in cv.data.intelligence
   *
   * Synchronous — the caller waits for the result (~10–15 s).
   */
  async analyze(userId: string): Promise<CvIntelligenceResult> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('Groq API key not configured.');
    }

    // ── 1. Load CV ────────────────────────────────────────────────────────────
    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv?.data) {
      throw new BadRequestException(
        'No CV data found. Please upload a PDF or build your CV first.',
      );
    }

    const cvData = cv.data as Record<string, unknown>;
    const cvContext = this.buildCvContextText(cvData);

    // ── 2. Load jobs ──────────────────────────────────────────────────────────
    const jobs = await this.prisma.job.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        title: true,
        partnerName: true,
        skills: true,
        minExperience: true,
        category: true,
        cityRel:        { select: { name: true } },
        governorateRel: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }) as JobRow[];

    if (!jobs.length) {
      throw new BadRequestException(
        'No active jobs in the database to analyse against.',
      );
    }

    const { jobListText, indexedJobs } = this.buildJobListText(jobs);

    // ── 3. Groq call ──────────────────────────────────────────────────────────
    const prompt = this.buildPrompt(cvContext, jobListText, jobs.length);

    const rawContent = await this.callGroq(apiKey, prompt);
    if (!rawContent) {
      throw new ServiceUnavailableException(
        'Groq did not return a response. Please try again later.',
      );
    }

    // ── 4. Parse ──────────────────────────────────────────────────────────────
    const parsed = this.parseGroqResponse(rawContent);
    if (!parsed) {
      this.logger.warn(`[CvIntelligence] Could not parse Groq response for user ${userId}`);
      throw new ServiceUnavailableException(
        'Could not parse AI response. Please try again.',
      );
    }

    // ── 5. Enrich with real job IDs ───────────────────────────────────────────
    const result = this.enrichWithJobIds(parsed, indexedJobs);
    result.analyzedAt = new Date().toISOString();

    // ── 6. Persist ────────────────────────────────────────────────────────────
    const baseData =
      typeof cvData === 'object' && !Array.isArray(cvData) ? cvData : {};

    await this.prisma.cv.update({
      where: { userId },
      data: {
        data: {
          ...baseData,
          intelligence: result,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `[CvIntelligence] Analysis complete for user ${userId}: ` +
        `${result.careerRecommendations.length} job matches, ` +
        `${result.gapAnalysis.missingSkills.length} skill gaps`,
    );

    this.cvGateway?.emitIntelligenceReady(userId, result);

    return result;
  }

  /**
   * Returns the stored intelligence result from the last analysis,
   * or null if no analysis has been run yet.
   */
  async getStored(userId: string): Promise<CvIntelligenceResult | null> {
    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv?.data) return null;
    const data = cv.data as Record<string, unknown>;
    return (data.intelligence as CvIntelligenceResult | undefined) ?? null;
  }

  // ─── Text builders ─────────────────────────────────────────────────────────

  private buildCvContextText(cvData: Record<string, unknown>): string {
    const lines: string[] = [];

    if (typeof cvData.fullName === 'string') lines.push(`Name: ${cvData.fullName}`);
    if (typeof cvData.title === 'string')    lines.push(`Title: ${cvData.title}`);
    if (typeof cvData.location === 'string') lines.push(`Location: ${cvData.location}`);

    const exp = typeof cvData.experienceYears === 'number' ? cvData.experienceYears : null;
    const sen = typeof cvData.seniority       === 'string' ? cvData.seniority       : null;
    if (exp !== null) lines.push(`Experience: ${exp} years`);
    if (sen !== null) lines.push(`Seniority: ${sen}`);

    // Summary / bio
    const summary =
      (cvData.profile as Record<string, unknown> | undefined)?.summary ??
      cvData.summary ??
      cvData.objective;
    if (typeof summary === 'string' && summary.trim()) {
      lines.push(`Summary: ${summary.trim().slice(0, 400)}`);
    }

    // Skills
    if (Array.isArray(cvData.skills) && (cvData.skills as string[]).length > 0) {
      lines.push(`Skills: ${(cvData.skills as string[]).join(', ')}`);
    }

    // Experience entries
    const expEntries = Array.isArray(cvData.experience)
      ? cvData.experience
      : Array.isArray(cvData.experiences)
        ? cvData.experiences
        : null;

    if (expEntries?.length) {
      lines.push('Work Experience:');
      for (const e of (expEntries as Record<string, unknown>[]).slice(0, 4)) {
        const title   = typeof e.title === 'string' ? e.title : '';
        const company = typeof e.company === 'string' ? e.company : '';
        const from    = typeof e.from === 'string' ? e.from : '';
        const to      = typeof e.to === 'string' ? e.to : 'Present';
        const desc    = typeof e.description === 'string' ? e.description.slice(0, 200) : '';
        lines.push(`- ${title} at ${company} (${from}–${to})${desc ? ': ' + desc : ''}`);
      }
    }

    // Education
    if (Array.isArray(cvData.education) && (cvData.education as unknown[]).length > 0) {
      lines.push('Education:');
      for (const edu of (cvData.education as Record<string, unknown>[]).slice(0, 3)) {
        const degree = typeof edu.degree === 'string' ? edu.degree : '';
        const inst   = typeof edu.institution === 'string' ? edu.institution : '';
        const year   = typeof edu.year === 'string' ? edu.year : '';
        lines.push(`- ${degree} | ${inst} ${year}`);
      }
    }

    return lines.join('\n').slice(0, 3500);
  }

  private buildJobListText(jobs: JobRow[]): {
    jobListText: string;
    indexedJobs: JobRow[];
  } {
    const lines = jobs.map((j, i) => {
      const loc =
        j.cityRel?.name ?? j.governorateRel?.name ?? '';
      const skills = j.skills.slice(0, 8).join(', ') || 'general';
      const exp    = j.minExperience ? `${j.minExperience}yr+` : 'any';
      return `#${i + 1} | ${j.title} | ${j.partnerName} | Skills: ${skills} | Exp: ${exp} | ${j.category ?? ''} | ${loc}`;
    });

    return { jobListText: lines.join('\n'), indexedJobs: jobs };
  }

  // ─── Prompt builder ────────────────────────────────────────────────────────

  private buildPrompt(cvContext: string, jobList: string, jobCount: number): string {
    return `You are an expert ATS recruiter, career coach, and CV specialist.

CANDIDATE PROFILE:
${cvContext}

JOBS IN MARKET (${jobCount} positions):
${jobList}

Analyze this candidate against the jobs above and return ONLY valid JSON — no markdown, no explanation:
{
  "structuredData": {
    "skills": ["<normalized skill>"],
    "yearsOfExperience": <integer or null>,
    "specialization": "<primary field or null>",
    "seniority": "junior" | "mid" | "senior" | null,
    "location": "<city/governorate or null>"
  },
  "gapAnalysis": {
    "missingSkills": ["<skill found in jobs but not in CV — top 6>"],
    "missingExperience": "<1 sentence describing key experience gaps>",
    "improvements": ["<actionable profile improvement — 4-5 items>"],
    "marketDemandSkills": ["<most demanded skills across jobs — top 8>"]
  },
  "careerRecommendations": [
    {
      "jobIndex": <1-based index from job list>,
      "jobTitle": "<exact title from job list>",
      "company": "<exact company from job list>",
      "matchScore": <0-100>,
      "recommendedSkills": ["<skill to learn to get this job>"],
      "reason": "<1 sentence why this job fits>"
    }
  ],
  "improvedCv": {
    "professionalSummary": "<2–3 sentence ATS-optimised summary>",
    "optimizedSkills": ["<complete, ATS-optimised skills list>"],
    "achievementTips": ["<specific tip to improve achievement bullet points — 4 items>"],
    "fullText": "<Complete ATS-formatted CV as plain text, ~250 words>"
  },
  "marketSkillAnalytics": {
    "topSkills": [
      { "skill": "<skill>", "alreadyHas": true }
    ]
  }
}

Rules:
- careerRecommendations: include exactly 5 best-matching jobs ranked by matchScore DESC
- missingSkills: skills that appear in at least 2 jobs but are absent from the candidate's profile
- marketDemandSkills: aggregate from all jobs, return 8 most frequent
- improvedCv.fullText: structured plain text with clear sections, ATS-friendly keywords
- marketSkillAnalytics.topSkills: exactly 10 skills most demanded across all jobs for the candidate's specialization; alreadyHas=true if the skill appears in the candidate's skills list
- IMPORTANT: Respond in the SAME LANGUAGE as the CV (Arabic if primarily Arabic)
- Return ONLY the JSON object`;
  }

  // ─── Groq call ─────────────────────────────────────────────────────────────

  private async callGroq(apiKey: string, prompt: string): Promise<string | null> {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 3500,
          temperature: 0.2,
          stream: false,
          messages: [
            {
              role: 'system',
              content:
                'You are a world-class ATS recruiter and career coach. Always return valid JSON only.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        this.logger.warn(`[CvIntelligence] Groq HTTP ${res.status}: ${res.statusText}`);
        return null;
      }

      const body = (await res.json()) as {
        choices?: [{ message?: { content?: string } }];
      };

      return (body.choices?.[0]?.message?.content ?? '').trim() || null;
    } catch (err) {
      this.logger.warn(`[CvIntelligence] Groq fetch error: ${String(err)}`);
      return null;
    }
  }

  // ─── Response parsing ──────────────────────────────────────────────────────

  private parseGroqResponse(content: string): Omit<CvIntelligenceResult, 'analyzedAt'> | null {
    // Extract JSON object from potential surrounding text
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return null;

    let raw = m[0]
      .replace(/,\s*([\]}])/g, '$1')        // trailing commas
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');

    try {
      const p = JSON.parse(raw) as {
        structuredData?: Record<string, unknown>;
        gapAnalysis?: Record<string, unknown>;
        careerRecommendations?: unknown[];
        improvedCv?: Record<string, unknown>;
        marketSkillAnalytics?: Record<string, unknown>;
      };

      const toArr = (v: unknown, max = 10): string[] =>
        Array.isArray(v)
          ? (v as unknown[])
              .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
              .map((s) => s.trim())
              .slice(0, max)
          : [];

      const toStr = (v: unknown, fb = ''): string =>
        typeof v === 'string' && v.trim() ? v.trim() : fb;

      const sd = p.structuredData       ?? {};
      const ga = p.gapAnalysis          ?? {};
      const ic = p.improvedCv           ?? {};
      const ma = p.marketSkillAnalytics ?? {};

      const rawSen = toStr(sd.seniority);
      const seniority =
        rawSen === 'junior' || rawSen === 'mid' || rawSen === 'senior' ? rawSen : null;

      return {
        structuredData: {
          skills:            toArr(sd.skills, 30),
          yearsOfExperience:
            typeof sd.yearsOfExperience === 'number' ? Math.round(sd.yearsOfExperience) : null,
          specialization:    toStr(sd.specialization) || null,
          seniority,
          location:          toStr(sd.location) || null,
        },
        gapAnalysis: {
          missingSkills:      toArr(ga.missingSkills, 10),
          missingExperience:  toStr(ga.missingExperience, 'لا توجد ثغرات واضحة'),
          improvements:       toArr(ga.improvements, 6),
          marketDemandSkills: toArr(ga.marketDemandSkills, 10),
        },
        careerRecommendations: Array.isArray(p.careerRecommendations)
          ? (p.careerRecommendations as Record<string, unknown>[])
              .filter((r) => typeof r === 'object' && r !== null)
              .slice(0, 5)
              .map((r) => ({
                jobId: '',   // filled in by enrichWithJobIds
                jobTitle:           toStr(r.jobTitle),
                company:            toStr(r.company),
                matchScore:
                  typeof r.matchScore === 'number'
                    ? Math.min(100, Math.max(0, Math.round(r.matchScore)))
                    : 50,
                recommendedSkills:  toArr(r.recommendedSkills, 5),
                reason:             toStr(r.reason),
                _jobIndex:
                  typeof r.jobIndex === 'number' ? r.jobIndex : null,
              }))
          : [],
        improvedCv: {
          professionalSummary: toStr(ic.professionalSummary),
          optimizedSkills:     toArr(ic.optimizedSkills, 25),
          achievementTips:     toArr(ic.achievementTips, 6),
          fullText:            toStr(ic.fullText),
        },
        marketSkillAnalytics: {
          topSkills: Array.isArray((ma as Record<string, unknown>).topSkills)
            ? ((ma as Record<string, unknown>).topSkills as unknown[])
                .filter(
                  (item): item is Record<string, unknown> =>
                    typeof item === 'object' && item !== null,
                )
                .slice(0, 12)
                .map((item) => ({
                  skill: toStr(item.skill),
                  alreadyHas: item.alreadyHas === true,
                }))
                .filter((item) => item.skill.length > 0)
            : [],
        },
      } as Omit<CvIntelligenceResult, 'analyzedAt'>;
    } catch (err) {
      this.logger.warn(`[CvIntelligence] JSON.parse failed: ${String(err)}`);
      return null;
    }
  }

  /** Replaces temporary _jobIndex references with real DB jobIds */
  private enrichWithJobIds(
    result: Omit<CvIntelligenceResult, 'analyzedAt'>,
    indexedJobs: JobRow[],
  ): CvIntelligenceResult {
    return {
      ...result,
      analyzedAt: '',
      careerRecommendations: result.careerRecommendations.map((rec) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const idx = (rec as any)._jobIndex as number | null;
        const job = idx && idx >= 1 && idx <= indexedJobs.length
          ? indexedJobs[idx - 1]
          : indexedJobs.find(
              (j) =>
                j.title.toLowerCase() === rec.jobTitle.toLowerCase() ||
                j.partnerName.toLowerCase() === rec.company.toLowerCase(),
            );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { _jobIndex: _drop, ...clean } = rec as any;
        void _drop;

        return { ...clean, jobId: job?.id ?? '' };
      }),
    };
  }
}
