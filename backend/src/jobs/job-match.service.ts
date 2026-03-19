import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  JobMatchResult,
  RecommendedJob,
  RecommendedJobsResult,
} from './dto/job-match.dto';

// ---------------------------------------------------------------------------
// Skill normalization
// ---------------------------------------------------------------------------

/**
 * Canonical alias table (lowercase keys).
 * Any input whose lowercase form is found here resolves to its canonical token.
 * Add new aliases here — the rest of the matching logic needs no changes.
 */
const SKILL_ALIASES: Record<string, string> = {
  // JavaScript
  js:             'javascript',
  javascript:     'javascript',
  // TypeScript
  ts:             'typescript',
  typescript:     'typescript',
  // React family
  react:          'react',
  reactjs:        'react',
  'react.js':     'react',
  // Next.js
  next:           'next.js',
  nextjs:         'next.js',
  'next.js':      'next.js',
  // Node
  node:           'node.js',
  nodejs:         'node.js',
  'node.js':      'node.js',
  // Vue
  vue:            'vue',
  vuejs:          'vue',
  'vue.js':       'vue',
  // Angular
  angular:        'angular',
  angularjs:      'angular',
  'angular.js':   'angular',
  // Express
  express:        'express',
  expressjs:      'express',
  'express.js':   'express',
  // Databases
  postgres:       'postgresql',
  postgresql:     'postgresql',
  mongo:          'mongodb',
  mongodb:        'mongodb',
  // CSS
  tailwind:       'tailwind',
  tailwindcss:    'tailwind',
};

/**
 * Normalizes a single skill string:
 *   1. Lowercases and trims whitespace.
 *   2. Resolves known aliases to their canonical form.
 *
 * Examples:
 *   normalizeSkill('ReactJS')  → 'react'
 *   normalizeSkill('nodejs')   → 'node.js'
 *   normalizeSkill('ts')       → 'typescript'
 *   normalizeSkill('REST API') → 'rest api'  (no alias — returned as-is)
 */
export function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();
  return SKILL_ALIASES[lower] ?? lower;
}

/**
 * Returns true when two normalized skills are considered equivalent.
 *
 * Match conditions (evaluated in order):
 *   1. Exact:    "react"         === "react"
 *   2. Partial:  "react native"  ⊇   "react"   → true
 *                "node backend"  ⊇   "node.js" → false (correct — no false positive)
 *
 * The minimum token length of 3 prevents very short tokens from triggering
 * spurious substring matches (e.g. "go" ≠ "mongo").
 */
export function isSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3) {
    return a.includes(b) || b.includes(a);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Skill extraction helpers
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'في', 'من', 'على', 'مع', 'أو', 'و',
  'the', 'a', 'an', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'of',
  'to', 'is', 'are', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must', 'shall',
]);

function extractKeywords(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s+#.]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .filter((v, i, a) => a.indexOf(v) === i);
}

/**
 * Builds a deduplicated, normalized skill array from the CV data blob.
 *
 * Primary source: cv.data.skills[] (explicit, structured).
 * Fallback: keyword extraction from summary, title, objective, and experience
 *           entries — used only when the skills array is absent or empty.
 */
function getCvSkills(cvData: Record<string, unknown>): string[] {
  const skills = new Set<string>();

  if (Array.isArray(cvData.skills)) {
    for (const s of cvData.skills as string[]) {
      if (typeof s === 'string' && s.trim()) {
        skills.add(normalizeSkill(s));
      }
    }
  }

  // Fallback: extract from unstructured text
  if (skills.size === 0) {
    const parts: string[] = [];
    if (cvData.summary) parts.push(String(cvData.summary));
    if (cvData.title) parts.push(String(cvData.title));
    if (cvData.objective) parts.push(String(cvData.objective));
    if (Array.isArray(cvData.experience)) {
      for (const e of cvData.experience as Record<string, unknown>[]) {
        if (e.title) parts.push(String(e.title));
        if (e.description) parts.push(String(e.description));
      }
    }
    for (const kw of extractKeywords(parts.join(' '))) {
      skills.add(normalizeSkill(kw));
    }
  }

  return Array.from(skills);
}

/**
 * Builds a deduplicated, normalized skill array for a job.
 *
 * Primary source: job.skills[] (explicit).
 * Fallback: keyword extraction from title + description + category.
 */
function getJobSkills(job: {
  skills: string[];
  title: string;
  description: string | null;
  category: string | null;
}): string[] {
  const skills = new Set<string>();

  if (job.skills.length > 0) {
    for (const s of job.skills) {
      if (s.trim()) skills.add(normalizeSkill(s));
    }
    return Array.from(skills);
  }

  // Fallback when no explicit skills are configured
  const text = [job.title, job.description ?? '', job.category ?? ''].join(' ');
  for (const kw of extractKeywords(text)) {
    skills.add(normalizeSkill(kw));
  }
  return Array.from(skills);
}

// ---------------------------------------------------------------------------
// Important skills
// ---------------------------------------------------------------------------

/**
 * High-value, in-demand skills that warrant a score boost when matched.
 * All entries are pre-normalized so they can be compared directly against
 * the output of normalizeSkill() without an extra call.
 */
const IMPORTANT_SKILLS: ReadonlySet<string> = new Set([
  'react',
  'node.js',     // 'node' normalizes → 'node.js'
  'typescript',  // 'ts'  normalizes → 'typescript'
  'python',
  'java',
  'docker',
  'aws',
]);

/**
 * Filters an already-normalized matchedSkills array down to the skills that
 * appear in IMPORTANT_SKILLS.
 */
function getImportantMatched(matchedSkills: string[]): string[] {
  return matchedSkills.filter((skill) => IMPORTANT_SKILLS.has(skill));
}

// ---------------------------------------------------------------------------
// Weighted scoring
// ---------------------------------------------------------------------------

interface ScoreBreakdown {
  /** Final weighted score, 0–100 */
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  importantMatchedSkills: string[];
}

/**
 * Computes a weighted match score between a CV and a job.
 *
 * Weight breakdown:
 *   Skills      60%  — matchedSkills / totalJobSkills
 *   Experience  25%  — 1 if cv.experienceYears >= job.minExperience, else 0
 *   Location    15%  — 1 if cv.city matches job.city (case-insensitive), else 0
 *
 * Missing data handling (avoids unfair penalty):
 *   • No job.minExperience set → experienceScore = 1 (no requirement)
 *   • CV has no experienceYears but job has a requirement → 0.5 (benefit of doubt)
 *   • Either city is absent → locationScore = 0 (cannot confirm a match)
 *   • No job skills defined → skillsRatio = 0.5 (neutral)
 *
 * Complexity: O(j × c) where j = job skill count, c = CV skill count.
 * Both arrays are typically < 20 items, so this is effectively O(1).
 */
function computeScore(
  cvSkills: string[],
  cvExperienceYears: number | null,
  cvCity: string,
  jobSkills: string[],
  jobMinExperience: number | null,
  jobCity: string | null,
): ScoreBreakdown {
  // ── Skills (60%) ───────────────────────────────────────────────────────────
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const jobSkill of jobSkills) {
    const matched = cvSkills.some((cvSkill) => isSimilar(jobSkill, cvSkill));
    if (matched) {
      matchedSkills.push(jobSkill);
    } else {
      missingSkills.push(jobSkill);
    }
  }

  const skillsRatio =
    jobSkills.length > 0
      ? matchedSkills.length / jobSkills.length
      : 0.5;

  // ── Experience (25%) ───────────────────────────────────────────────────────
  let experienceRatio: number;
  if (jobMinExperience === null || jobMinExperience === 0) {
    // No minimum requirement — all candidates pass
    experienceRatio = 1;
  } else if (cvExperienceYears === null) {
    // Requirement exists but CV doesn't state years — partial credit
    experienceRatio = 0.5;
  } else {
    experienceRatio = cvExperienceYears >= jobMinExperience ? 1 : 0;
  }

  // ── Location (15%) ─────────────────────────────────────────────────────────
  const jCity = (jobCity ?? '').toLowerCase().trim();
  const locationRatio =
    cvCity.length > 0 &&
    jCity.length > 0 &&
    (jCity.includes(cvCity) || cvCity.includes(jCity))
      ? 1
      : 0;

  // ── Important skills bonus (up to +10) ─────────────────────────────────────
  const importantMatchedSkills = getImportantMatched(matchedSkills);
  const importantBonus = importantMatchedSkills.length > 0 ? 10 : 0;

  // ── Weighted final score (capped at 100) ────────────────────────────────────
  const score = Math.min(
    100,
    Math.round(
      skillsRatio * 60 +
        experienceRatio * 25 +
        locationRatio * 15 +
        importantBonus,
    ),
  );

  return { score, matchedSkills, missingSkills, importantMatchedSkills };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class JobMatchService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Single-job CV match ─────────────────────────────────────────────────

  async matchCvToJob(userId: string, jobId: string): Promise<JobMatchResult> {
    const [cv, job] = await Promise.all([
      this.prisma.cv.findUnique({ where: { userId } }),
      this.prisma.job.findUnique({
        where: { id: jobId },
        include: {
          governorateRel: { select: { name: true } },
          cityRel: { select: { name: true } },
        },
      }),
    ]);

    if (!cv || !job) {
      return {
        matchScore: 0,
        matchedSkills: [],
        missingSkills: [],
        recommendation:
          'لم يتم العثور على السيرة الذاتية أو الوظيفة. أنشئ سيرتك الذاتية أولاً.',
        level: 'low',
      };
    }

    const cvData = cv.data as Record<string, unknown>;
    const cvSkills = getCvSkills(cvData);
    const cvExperienceYears =
      typeof cvData.experienceYears === 'number' ? cvData.experienceYears : null;
    const cvCity = String((cvData.city ?? cvData.location ?? '') as unknown)
      .toLowerCase()
      .trim();

    const jobSkills = getJobSkills({
      skills: job.skills,
      title: job.title,
      description: job.description,
      category: job.category,
    });

    const { score, matchedSkills, missingSkills, importantMatchedSkills } =
      computeScore(
        cvSkills,
        cvExperienceYears,
        cvCity,
        jobSkills,
        job.minExperience,
        job.cityRel?.name ?? null,
      );

    void importantMatchedSkills; // available for future use in recommendation text

    let level: JobMatchResult['level'];
    let recommendation: string;

    if (score >= 80) {
      level = 'excellent';
      recommendation =
        'مؤهل ممتاز لهذه الوظيفة! مهاراتك تتطابق بشكل كبير مع متطلبات الوظيفة.';
    } else if (score >= 60) {
      level = 'good';
      recommendation = `مؤهل جيد. يُنصح بإضافة: ${missingSkills.slice(0, 3).join('، ')} لتقوية طلبك.`;
    } else if (score >= 40) {
      level = 'fair';
      recommendation = `مؤهل جزئياً. تحتاج لتطوير مهارات مثل: ${missingSkills.slice(0, 3).join('، ')}.`;
    } else {
      level = 'low';
      recommendation = `هذه الوظيفة تتطلب مهارات مختلفة. فكّر في تطوير: ${missingSkills.slice(0, 3).join('، ')}.`;
    }

    return { matchScore: score, matchedSkills, missingSkills, recommendation, level };
  }

  // ─── Recommended jobs list ───────────────────────────────────────────────

  /**
   * Scores the 100 most-recent active jobs against the user's CV and returns
   * the top `limit` results sorted by score DESC, createdAt DESC (tie-breaker).
   *
   * All scoring is done in-memory after a single DB query — no extra DB calls
   * are made inside the scoring loop.
   */
  async getRecommendedJobs(
    userId: string,
    limit = 10,
    filters?: {
      /** Case-insensitive governorate name filter (e.g. "القاهرة") */
      governorate?: string;
      /** Case-insensitive city name filter (e.g. "مدينة نصر") */
      city?: string;
    },
  ): Promise<RecommendedJobsResult> {
    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv) return { jobs: [], total: 0 };

    const cvData = cv.data as Record<string, unknown>;

    // Compute CV context once — reused for every job in the loop
    const cvSkills = getCvSkills(cvData);
    const cvExperienceYears =
      typeof cvData.experienceYears === 'number' ? cvData.experienceYears : null;
    const cvCity = String((cvData.city ?? cvData.location ?? '') as unknown)
      .toLowerCase()
      .trim();

    const now = new Date();
    const candidates = await this.prisma.job.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        // Optional location filters — Prisma `mode: insensitive` handles casing.
        // Omitted entirely when not provided so the index is not unnecessarily scanned.
        ...(filters?.governorate && {
          governorateRel: {
            name: { equals: filters.governorate, mode: 'insensitive' },
          },
        }),
        ...(filters?.city && {
          cityRel: {
            name: { equals: filters.city, mode: 'insensitive' },
          },
        }),
      },
      select: {
        id: true,
        title: true,
        partnerName: true,
        description: true,
        category: true,
        jobType: true,
        skills: true,
        minExperience: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        createdAt: true,
        governorateRel: { select: { name: true } },
        cityRel: { select: { name: true } },
        organization: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const safeLimit = Math.min(50, Math.max(1, limit));

    const scored: RecommendedJob[] = candidates
      .map((job) => {
        const jobSkills = getJobSkills({
          skills: job.skills,
          title: job.title,
          description: job.description,
          category: job.category,
        });

        const { score, matchedSkills, missingSkills, importantMatchedSkills } =
          computeScore(
            cvSkills,
            cvExperienceYears,
            cvCity,
            jobSkills,
            job.minExperience,
            job.cityRel?.name ?? null,
          );

        return {
          id: job.id,
          title: job.title,
          partnerName: job.partnerName,
          category: job.category,
          jobType: job.jobType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency,
          governorate: job.governorateRel?.name ?? null,
          city: job.cityRel?.name ?? null,
          organization: job.organization,
          score,
          matchedSkills,
          missingSkills,
          importantMatchedSkills,
          createdAt: job.createdAt,
        };
      })
      // Primary: score DESC  Secondary: recency DESC (stable tie-breaker)
      .sort(
        (a, b) =>
          b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime(),
      )
      .slice(0, safeLimit);

    return { jobs: scored, total: scored.length };
  }
}
