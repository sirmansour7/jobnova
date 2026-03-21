import { Injectable } from '@nestjs/common';
import { JobCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  JobMatchResult,
  RecommendedJob,
  RecommendedJobsResult,
} from './dto/job-match.dto';

/** Minimum weighted score (0–100) for a job to be labelled "مناسب لك" */
const RECOMMENDED_THRESHOLD = 60;

// ===========================================================================
// ─── Skill normalization ────────────────────────────────────────────────────
// ===========================================================================

/**
 * Canonical alias table (all keys lowercase-trimmed).
 * Any input resolved here is compared against its canonical token.
 * Growing this table improves matching accuracy without touching scoring logic.
 */
const SKILL_ALIASES: Record<string, string> = {
  // JavaScript / TypeScript
  js:                   'javascript',
  javascript:           'javascript',
  'vanilla js':         'javascript',
  es6:                  'javascript',
  es2015:               'javascript',
  ts:                   'typescript',
  typescript:           'typescript',

  // React ecosystem
  react:                'react',
  reactjs:              'react',
  'react.js':           'react',
  'react js':           'react',
  'react native':       'react-native',
  'react-native':       'react-native',

  // Next.js
  next:                 'next.js',
  nextjs:               'next.js',
  'next.js':            'next.js',
  nuxt:                 'nuxt.js',
  nuxtjs:               'nuxt.js',
  'nuxt.js':            'nuxt.js',

  // Vue
  vue:                  'vue',
  vuejs:                'vue',
  'vue.js':             'vue',
  'vue 3':              'vue',
  'vue 2':              'vue',

  // Angular
  angular:              'angular',
  angularjs:            'angular',
  'angular.js':         'angular',

  // Svelte / Astro / Remix (emerging)
  svelte:               'svelte',
  sveltekit:            'svelte',
  astro:                'astro',
  remix:                'remix',

  // Node.js
  node:                 'nodejs',
  nodejs:               'nodejs',
  'node.js':            'nodejs',
  'node js':            'nodejs',

  // Express
  express:              'express',
  expressjs:            'express',
  'express.js':         'express',

  // NestJS
  nestjs:               'nestjs',
  'nest.js':            'nestjs',
  nest:                 'nestjs',

  // Python
  python:               'python',
  python3:              'python',
  'python 3':           'python',
  py:                   'python',

  // Python web frameworks
  django:               'django',
  'django rest':        'django',
  drf:                  'django',
  fastapi:              'fastapi',
  'fast api':           'fastapi',
  flask:                'flask',

  // PHP
  php:                  'php',
  php7:                 'php',
  php8:                 'php',
  laravel:              'laravel',
  symfony:              'symfony',

  // Java
  java:                 'java',
  'java 8':             'java',
  'java 11':            'java',
  'java 17':            'java',
  spring:               'spring',
  'spring boot':        'spring-boot',
  springboot:           'spring-boot',
  hibernate:            'hibernate',

  // C# / .NET
  'c#':                 'csharp',
  csharp:               'csharp',
  dotnet:               'dotnet',
  '.net':               'dotnet',
  'asp.net':            'dotnet',
  'asp.net core':       'dotnet',

  // Go
  go:                   'go',
  golang:               'go',

  // Rust
  rust:                 'rust',

  // Databases
  mysql:                'mysql',
  mariadb:              'mysql',
  postgres:             'postgresql',
  postgresql:           'postgresql',
  mongo:                'mongodb',
  mongodb:              'mongodb',
  redis:                'redis',
  sqlite:               'sqlite',
  oracle:               'oracle',
  'sql server':         'sql-server',
  mssql:                'sql-server',
  elasticsearch:        'elasticsearch',
  elastic:              'elasticsearch',
  cassandra:            'cassandra',

  // General SQL
  sql:                  'sql',
  nosql:                'nosql',

  // Cloud
  aws:                  'aws',
  'amazon web services':'aws',
  gcp:                  'gcp',
  'google cloud':       'gcp',
  azure:                'azure',
  'microsoft azure':    'azure',
  'aws lambda':         'aws',
  ec2:                  'aws',
  's3':                 'aws',

  // DevOps / Infra
  docker:               'docker',
  kubernetes:           'kubernetes',
  k8s:                  'kubernetes',
  terraform:            'terraform',
  ansible:              'ansible',
  jenkins:              'jenkins',
  'github actions':     'github-actions',
  'gitlab ci':          'gitlab',
  'ci/cd':              'ci-cd',
  cicd:                 'ci-cd',
  nginx:                'nginx',
  apache:               'apache',
  linux:                'linux',
  bash:                 'bash',
  shell:                'bash',

  // CSS / UI
  css:                  'css',
  css3:                 'css',
  sass:                 'sass',
  scss:                 'sass',
  tailwind:             'tailwind',
  tailwindcss:          'tailwind',
  bootstrap:            'bootstrap',
  'material ui':        'material-ui',
  mui:                  'material-ui',

  // HTML
  html:                 'html',
  html5:                'html',

  // Git / VCS
  git:                  'git',
  github:               'github',
  gitlab:               'gitlab',
  bitbucket:            'bitbucket',

  // API
  'rest api':           'rest-api',
  restful:              'rest-api',
  'restful api':        'rest-api',
  graphql:              'graphql',
  grpc:                 'grpc',
  websocket:            'websocket',
  'web socket':         'websocket',

  // State management
  redux:                'redux',
  mobx:                 'mobx',
  zustand:              'zustand',
  pinia:                'pinia',
  recoil:               'recoil',

  // Testing
  jest:                 'jest',
  mocha:                'mocha',
  cypress:              'cypress',
  playwright:           'playwright',
  selenium:             'selenium',
  pytest:               'pytest',
  junit:                'junit',

  // Mobile
  flutter:              'flutter',
  dart:                 'dart',
  kotlin:               'kotlin',
  swift:                'swift',
  android:              'android',
  ios:                  'ios',
  xamarin:              'xamarin',

  // Data / ML
  'machine learning':   'machine-learning',
  ml:                   'machine-learning',
  'deep learning':      'deep-learning',
  ai:                   'ai',
  tensorflow:           'tensorflow',
  pytorch:              'pytorch',
  keras:                'keras',
  pandas:               'pandas',
  numpy:                'numpy',
  'scikit-learn':       'scikit-learn',
  scikit:               'scikit-learn',
  spark:                'spark',
  hadoop:               'hadoop',
  kafka:                'kafka',
  tableau:              'tableau',
  'power bi':           'power-bi',
  powerbi:              'power-bi',

  // Design
  figma:                'figma',
  photoshop:            'photoshop',
  illustrator:          'illustrator',
  xd:                   'adobe-xd',
  'adobe xd':           'adobe-xd',
  sketch:               'sketch',
  'ui/ux':              'ui-ux',
  'ui ux':              'ui-ux',

  // Messaging / Queue
  rabbitmq:             'rabbitmq',
  celery:               'celery',

  // Architecture
  microservices:        'microservices',
  'micro services':     'microservices',
  'clean architecture': 'clean-architecture',
  'domain driven':      'ddd',
  ddd:                  'ddd',
};

/**
 * Normalizes a skill string to its canonical form.
 * Steps: lowercase → trim → alias lookup → return as-is if no alias.
 *
 * Examples:
 *   "ReactJS"  → "react"
 *   "nodejs"   → "nodejs"
 *   "ts"       → "typescript"
 */
export function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();
  return SKILL_ALIASES[lower] ?? lower;
}

/**
 * True when two normalized skills are semantically equivalent.
 * Guards against very short tokens to avoid false positives ("go" ≠ "mongo").
 */
export function isSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3) {
    return a.includes(b) || b.includes(a);
  }
  return false;
}

// ===========================================================================
// ─── Skill extraction ───────────────────────────────────────────────────────
// ===========================================================================

const STOP_WORDS = new Set([
  // Arabic
  'في', 'من', 'على', 'مع', 'أو', 'و', 'هذا', 'التي', 'الذي', 'إلى',
  // English
  'the', 'a', 'an', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'of',
  'to', 'is', 'are', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must',
  'this', 'that', 'our', 'your', 'their', 'we', 'you', 'they', 'it',
  'not', 'but', 'also', 'work', 'team', 'good', 'well', 'time', 'able',
]);

function extractKeywords(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s+#./-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .filter((v, i, a) => a.indexOf(v) === i);
}

/** Builds a deduplicated, normalized skill list from cv.data JSON. */
function getCvSkills(cvData: Record<string, unknown>): string[] {
  const skills = new Set<string>();

  if (Array.isArray(cvData.skills)) {
    for (const s of cvData.skills as string[]) {
      if (typeof s === 'string' && s.trim()) skills.add(normalizeSkill(s));
    }
  }

  // Keyword-extraction fallback when no structured skills list exists
  if (skills.size === 0) {
    const parts: string[] = [];
    if (cvData.summary)   parts.push(String(cvData.summary));
    if (cvData.title)     parts.push(String(cvData.title));
    if (cvData.objective) parts.push(String(cvData.objective));
    if (Array.isArray(cvData.experience)) {
      for (const e of cvData.experience as Record<string, unknown>[]) {
        if (e.title)       parts.push(String(e.title));
        if (e.description) parts.push(String(e.description));
      }
    }
    for (const kw of extractKeywords(parts.join(' '))) {
      skills.add(normalizeSkill(kw));
    }
  }

  return Array.from(skills);
}

/** Builds a deduplicated, normalized skill list for a job. */
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

  // Fallback: extract keywords from title + description + category
  const text = [job.title, job.description ?? '', job.category ?? ''].join(' ');
  for (const kw of extractKeywords(text)) {
    skills.add(normalizeSkill(kw));
  }
  return Array.from(skills);
}

// ===========================================================================
// ─── Specialization matching ────────────────────────────────────────────────
// ===========================================================================

/**
 * Keywords associated with each job category.
 * Used to compare the candidate's title/specialization against the job's domain.
 * Both English and Arabic are included to handle bilingual CVs.
 */
const SPECIALIZATION_KEYWORDS: Partial<Record<JobCategory, string[]>> = {
  TECHNOLOGY: [
    'software', 'developer', 'engineer', 'programming', 'backend', 'frontend',
    'fullstack', 'full stack', 'web', 'mobile', 'devops', 'data', 'cloud',
    'مطور', 'مبرمج', 'هندسة برمجيات', 'برمجة', 'تقنية',
  ],
  MARKETING: [
    'marketing', 'digital marketing', 'seo', 'sem', 'social media', 'content',
    'brand', 'campaign', 'تسويق', 'رقمي', 'محتوى', 'إعلام',
  ],
  FINANCE: [
    'finance', 'accounting', 'financial', 'audit', 'treasury', 'cpa', 'cfa',
    'محاسب', 'مالي', 'تمويل', 'محاسبة', 'مراجعة',
  ],
  HEALTHCARE: [
    'medical', 'health', 'clinical', 'nurse', 'pharmacy', 'physician', 'doctor',
    'طبيب', 'طبية', 'صحة', 'صيدلاني', 'تمريض', 'سريري',
  ],
  EDUCATION: [
    'teacher', 'instructor', 'training', 'education', 'academic', 'curriculum',
    'معلم', 'مدرس', 'تدريب', 'تعليم', 'أكاديمي',
  ],
  ENGINEERING: [
    'mechanical', 'civil', 'electrical', 'structural', 'chemical', 'industrial',
    'مهندس', 'ميكانيكا', 'كهرباء', 'مدني', 'كيمياء',
  ],
  SALES: [
    'sales', 'business development', 'account', 'revenue', 'b2b', 'b2c',
    'مبيعات', 'تطوير أعمال', 'بيع',
  ],
  DESIGN: [
    'design', 'ui', 'ux', 'graphic', 'creative', 'visual', 'motion',
    'مصمم', 'تصميم', 'جرافيك', 'واجهات',
  ],
  OPERATIONS: [
    'operations', 'logistics', 'supply chain', 'procurement', 'warehouse',
    'عمليات', 'لوجستيات', 'سلاسل التوريد', 'مشتريات',
  ],
  LEGAL: [
    'legal', 'law', 'compliance', 'contract', 'litigation', 'attorney',
    'قانون', 'محامي', 'قانوني', 'عقود', 'امتثال',
  ],
  HR: [
    'hr', 'human resources', 'recruitment', 'talent', 'payroll', 'people',
    'موارد بشرية', 'توظيف', 'تطوير موارد',
  ],
  CUSTOMER_SERVICE: [
    'customer service', 'support', 'help desk', 'client', 'satisfaction',
    'خدمة عملاء', 'دعم', 'دعم فني',
  ],
};

/**
 * Returns 0.0–1.0 representing how well the candidate's specialization
 * and skills align with the job's category.
 *
 * Missing data handling:
 *   • jobCategory absent or OTHER  → 0.5 (neutral, no penalty)
 *   • candidate has no spec data   → 0.5 (neutral)
 *   • ≥ 3 keyword matches          → 1.0 (strong match)
 *   • 2 keyword matches            → 0.8
 *   • 1 keyword match              → 0.5
 *   • 0 keyword matches            → 0.1 (different field)
 */
function computeSpecializationRatio(
  candidateSpec: string | null,
  candidateSkills: string[],
  jobCategory: string | null,
): number {
  if (!jobCategory || jobCategory === 'OTHER') return 0.5;

  const keywords = SPECIALIZATION_KEYWORDS[jobCategory as JobCategory] ?? [];
  if (!keywords.length) return 0.5;

  if (!candidateSpec && !candidateSkills.length) return 0.5;

  const searchText = [
    candidateSpec ?? '',
    ...candidateSkills,
  ]
    .join(' ')
    .toLowerCase();

  const matchCount = keywords.filter((kw) =>
    searchText.includes(kw.toLowerCase()),
  ).length;

  if (matchCount >= 3) return 1.0;
  if (matchCount === 2) return 0.8;
  if (matchCount === 1) return 0.5;
  return 0.1;
}

// ===========================================================================
// ─── Semantic bonus (lightweight keyword-overlap) ───────────────────────────
// ===========================================================================

/**
 * Computes a 0–12 bonus by comparing the candidate's profile keywords against
 * keywords extracted from the job description + title.
 *
 * This acts as a lightweight proxy for semantic similarity — if the job
 * description mentions many terms that appear in the candidate's skills /
 * specialization, the candidate is likely a better cultural/domain fit.
 *
 * Formula: (intersection / job-keyword-count) × 12, rounded
 */
function computeSemanticBonus(
  cvSkills: string[],
  cvSpecialization: string | null,
  jobTitle: string,
  jobDescription: string | null,
): number {
  const jobText = [jobTitle, jobDescription ?? ''].join(' ');
  const jobKeywords = extractKeywords(jobText)
    .map(normalizeSkill)
    .filter((k) => k.length > 2);

  if (!jobKeywords.length) return 0;

  const candidateProfile = new Set<string>([
    ...cvSkills,
    ...extractKeywords(cvSpecialization ?? '').map(normalizeSkill),
  ]);

  const matched = jobKeywords.filter(
    (k) =>
      candidateProfile.has(k) ||
      [...candidateProfile].some((cs) => isSimilar(k, cs)),
  );

  const ratio = matched.length / jobKeywords.length;
  return Math.round(ratio * 12);
}

// ===========================================================================
// ─── Seniority bonus ────────────────────────────────────────────────────────
// ===========================================================================

/** Keywords that signal seniority level from a job title */
const SENIOR_TITLE_KEYWORDS = ['senior', 'sr', 'lead', 'manager', 'director', 'head', 'principal', 'staff', 'architect'];
const JUNIOR_TITLE_KEYWORDS = ['junior', 'jr', 'entry', 'trainee', 'intern', 'graduate', 'fresh'];

type Seniority = 'junior' | 'mid' | 'senior';

function inferJobSeniority(jobTitle: string): Seniority | null {
  const t = jobTitle.toLowerCase();
  if (SENIOR_TITLE_KEYWORDS.some((k) => t.includes(k))) return 'senior';
  if (JUNIOR_TITLE_KEYWORDS.some((k) => t.includes(k))) return 'junior';
  return null;
}

/**
 * +5 when the candidate's seniority exactly matches the implied level in the
 *    job title.
 * +2 when adjacent levels (mid ↔ junior or mid ↔ senior).
 *  0 when no seniority information is available (avoids any penalty).
 */
function computeSeniorityBonus(
  cvSeniority: Seniority | null,
  jobTitle: string,
): number {
  if (!cvSeniority) return 0;
  const jobSeniority = inferJobSeniority(jobTitle);
  if (!jobSeniority) return 0;

  if (cvSeniority === jobSeniority) return 5;
  // Adjacent: mid is close to both junior and senior
  if (
    (cvSeniority === 'mid' && jobSeniority !== 'mid') ||
    (jobSeniority === 'mid' && cvSeniority !== 'mid')
  ) {
    return 2;
  }
  return 0;
}

// ===========================================================================
// ─── Important skills ───────────────────────────────────────────────────────
// ===========================================================================

/**
 * High-value, in-demand skills that earn a score bonus when matched.
 * All entries are pre-normalized for direct comparison.
 */
const IMPORTANT_SKILLS: ReadonlySet<string> = new Set([
  'react', 'nodejs', 'typescript', 'python', 'java',
  'docker', 'kubernetes', 'aws', 'machine-learning', 'next.js',
]);

function getImportantMatched(matchedSkills: string[]): string[] {
  return matchedSkills.filter((s) => IMPORTANT_SKILLS.has(s));
}

// ===========================================================================
// ─── Weighted scoring ───────────────────────────────────────────────────────
// ===========================================================================

interface ScoreBreakdown {
  /** Final weighted score 0–100 */
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  importantMatchedSkills: string[];
}

/**
 * Computes a weighted ATS-style match score.
 *
 * Base weights (sum to 100):
 *   Skills          50%  — matchedSkills / totalJobSkills
 *   Specialization  20%  — keyword overlap between CV title and job category
 *   Experience      20%  — cv.experienceYears ≥ job.minExperience
 *   Location        10%  — city/governorate match
 *
 * Bonuses (additive, capped at 100 total):
 *   Important skills  +8   — matched at least one high-value skill
 *   Semantic overlap  +12  — job description keywords in candidate profile
 *   Seniority match   +5   — seniority aligned with job title level
 *
 * Missing-data policy (avoids unfair penalties):
 *   • No job skills defined     → skillsRatio = 0.5 (neutral)
 *   • No job min-experience     → experienceRatio = 1.0 (no requirement)
 *   • CV missing experience     → experienceRatio = 0.5 (benefit of doubt)
 *   • Either city absent        → locationRatio = 0 (cannot confirm)
 *   • Job category absent       → specializationRatio = 0.5 (neutral)
 */
function computeScore(
  cvSkills: string[],
  cvExperienceYears: number | null,
  cvCity: string,
  cvSpecialization: string | null,
  cvSeniority: Seniority | null,
  jobSkills: string[],
  jobMinExperience: number | null,
  jobCity: string | null,
  jobCategory: string | null,
  jobTitle: string,
  jobDescription: string | null,
): ScoreBreakdown {
  // ── Skills (50%) ─────────────────────────────────────────────────────────────
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const jobSkill of jobSkills) {
    if (cvSkills.some((cs) => isSimilar(jobSkill, cs))) {
      matchedSkills.push(jobSkill);
    } else {
      missingSkills.push(jobSkill);
    }
  }

  const skillsRatio = jobSkills.length > 0 ? matchedSkills.length / jobSkills.length : 0.5;

  // ── Experience (20%) ─────────────────────────────────────────────────────────
  let experienceRatio: number;
  if (jobMinExperience === null || jobMinExperience === 0) {
    experienceRatio = 1;
  } else if (cvExperienceYears === null) {
    experienceRatio = 0.5;
  } else {
    experienceRatio = cvExperienceYears >= jobMinExperience ? 1 : 0;
  }

  // ── Specialization (20%) ─────────────────────────────────────────────────────
  const specializationRatio = computeSpecializationRatio(cvSpecialization, cvSkills, jobCategory);

  // ── Location (10%) ───────────────────────────────────────────────────────────
  const jCity = (jobCity ?? '').toLowerCase().trim();
  const locationRatio =
    cvCity.length > 0 && jCity.length > 0 && (jCity.includes(cvCity) || cvCity.includes(jCity))
      ? 1
      : 0;

  // ── Base score ───────────────────────────────────────────────────────────────
  const base = Math.round(
    skillsRatio * 50 + experienceRatio * 20 + specializationRatio * 20 + locationRatio * 10,
  );

  // ── Bonuses ──────────────────────────────────────────────────────────────────
  const importantMatchedSkills = getImportantMatched(matchedSkills);
  const importantBonus  = importantMatchedSkills.length > 0 ? 8 : 0;
  const semanticBonus   = computeSemanticBonus(cvSkills, cvSpecialization, jobTitle, jobDescription);
  const seniorityBonus  = computeSeniorityBonus(cvSeniority, jobTitle);

  const score = Math.min(100, base + importantBonus + semanticBonus + seniorityBonus);

  return { score, matchedSkills, missingSkills, importantMatchedSkills };
}

// ===========================================================================
// ─── Service ────────────────────────────────────────────────────────────────
// ===========================================================================

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
        recommendation: 'لم يتم العثور على السيرة الذاتية أو الوظيفة. أنشئ سيرتك الذاتية أولاً.',
        level: 'low',
      };
    }

    const cvData = cv.data as Record<string, unknown>;
    const cvSkills        = getCvSkills(cvData);
    const cvExperienceYears =
      typeof cvData.experienceYears === 'number' ? cvData.experienceYears : null;
    const cvCity          = String((cvData.city ?? cvData.location ?? '') as unknown).toLowerCase().trim();
    const cvSpecialization = typeof cvData.title === 'string' ? cvData.title : null;
    const rawSeniority     = typeof cvData.seniority === 'string' ? cvData.seniority : null;
    const cvSeniority: Seniority | null =
      rawSeniority === 'junior' || rawSeniority === 'mid' || rawSeniority === 'senior'
        ? rawSeniority
        : null;

    const jobSkills = getJobSkills({
      skills: job.skills,
      title: job.title,
      description: job.description,
      category: job.category,
    });

    const { score, matchedSkills, missingSkills } = computeScore(
      cvSkills, cvExperienceYears, cvCity, cvSpecialization, cvSeniority,
      jobSkills, job.minExperience, job.cityRel?.name ?? null,
      job.category, job.title, job.description,
    );

    let level: JobMatchResult['level'];
    let recommendation: string;

    if (score >= 80) {
      level = 'excellent';
      recommendation = 'مؤهل ممتاز لهذه الوظيفة! مهاراتك تتطابق بشكل كبير مع متطلبات الوظيفة.';
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
   * Scores the 100 most-recent active jobs against the user's CV using the
   * full ATS algorithm and returns the top `limit` sorted by score DESC.
   */
  async getRecommendedJobs(
    userId: string,
    limit = 10,
    filters?: { governorate?: string; city?: string },
  ): Promise<RecommendedJobsResult> {
    const cv = await this.prisma.cv.findUnique({ where: { userId } });
    if (!cv) return { jobs: [], total: 0 };

    const cvData           = cv.data as Record<string, unknown>;
    const cvSkills         = getCvSkills(cvData);
    const cvExperienceYears =
      typeof cvData.experienceYears === 'number' ? cvData.experienceYears : null;
    const cvCity           = String((cvData.city ?? cvData.location ?? '') as unknown).toLowerCase().trim();
    const cvSpecialization = typeof cvData.title === 'string' ? cvData.title : null;
    const rawSeniority     = typeof cvData.seniority === 'string' ? cvData.seniority : null;
    const cvSeniority: Seniority | null =
      rawSeniority === 'junior' || rawSeniority === 'mid' || rawSeniority === 'senior'
        ? rawSeniority
        : null;

    const now = new Date();
    const candidates = await this.prisma.job.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(filters?.governorate && {
          governorateRel: { name: { equals: filters.governorate, mode: 'insensitive' } },
        }),
        ...(filters?.city && {
          cityRel: { name: { equals: filters.city, mode: 'insensitive' } },
        }),
      },
      select: {
        id: true, title: true, partnerName: true, description: true,
        category: true, jobType: true, skills: true, minExperience: true,
        salaryMin: true, salaryMax: true, currency: true, createdAt: true,
        governorateRel: { select: { name: true } },
        cityRel:        { select: { name: true } },
        organization:   { select: { id: true, name: true } },
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

        const { score, matchedSkills, missingSkills, importantMatchedSkills } = computeScore(
          cvSkills, cvExperienceYears, cvCity, cvSpecialization, cvSeniority,
          jobSkills, job.minExperience, job.cityRel?.name ?? null,
          job.category, job.title, job.description,
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
      .sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, safeLimit);

    return { jobs: scored, total: scored.length };
  }

  // ─── List enrichment ─────────────────────────────────────────────────────

  /**
   * Enriches an arbitrary jobs array (from `JobsService.findAll`) with
   * `matchScore`, `isRecommended`, and `matchedSkills` using the full ATS
   * scoring algorithm.
   *
   * CV is loaded once; all scoring is in-memory. Falls back gracefully when
   * the candidate has no CV.
   *
   * Jobs with `isRecommended = true` are sorted to the top while preserving
   * relative order within each tier.
   */
  async enrichWithMatchScores<
    T extends {
      id: string;
      title: string;
      description?: string | null;
      category?: string | null;
      skills: string[];
      minExperience?: number | null;
      cityRel?: { name: string } | null;
    },
  >(
    userId: string,
    jobs: T[],
  ): Promise<(T & { matchScore: number; isRecommended: boolean; matchedSkills: string[] })[]> {
    if (!jobs.length) return [];

    const cv = await this.prisma.cv.findUnique({ where: { userId } });

    const noScores = jobs.map((j) => ({
      ...j,
      matchScore: 0,
      isRecommended: false,
      matchedSkills: [] as string[],
    }));

    if (!cv) return noScores;

    const cvData           = cv.data as Record<string, unknown>;
    const cvSkills         = getCvSkills(cvData);
    const cvExperienceYears =
      typeof cvData.experienceYears === 'number' ? cvData.experienceYears : null;
    const cvCity           = String((cvData.city ?? cvData.location ?? '') as unknown).toLowerCase().trim();
    const cvSpecialization = typeof cvData.title === 'string' ? cvData.title : null;
    const rawSeniority     = typeof cvData.seniority === 'string' ? cvData.seniority : null;
    const cvSeniority: Seniority | null =
      rawSeniority === 'junior' || rawSeniority === 'mid' || rawSeniority === 'senior'
        ? rawSeniority
        : null;

    // Skip scoring when there is truly nothing to compare against
    if (!cvSkills.length && cvExperienceYears === null && !cvCity && !cvSpecialization) {
      return noScores;
    }

    const scored = jobs.map((job) => {
      const jobSkills = getJobSkills({
        skills: job.skills,
        title: job.title,
        description: job.description ?? null,
        category: job.category ?? null,
      });

      const { score, matchedSkills } = computeScore(
        cvSkills, cvExperienceYears, cvCity, cvSpecialization, cvSeniority,
        jobSkills, job.minExperience ?? null, job.cityRel?.name ?? null,
        job.category ?? null, job.title, job.description ?? null,
      );

      return {
        ...job,
        matchScore: score,
        isRecommended: score >= RECOMMENDED_THRESHOLD,
        matchedSkills,
      };
    });

    // Bubble recommended to the top; stable-sort within each tier
    return [
      ...scored.filter((j) => j.isRecommended),
      ...scored.filter((j) => !j.isRecommended),
    ];
  }
}
