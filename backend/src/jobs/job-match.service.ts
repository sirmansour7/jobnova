import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JobMatchResult } from './dto/job-match.dto';

function extractKeywords(text: string): string[] {
  if (!text) return [];
  const stopWords = new Set([
    'في',
    'من',
    'على',
    'مع',
    'أو',
    'و',
    'the',
    'a',
    'an',
    'in',
    'on',
    'at',
    'for',
    'with',
    'and',
    'or',
    'of',
    'to',
    'is',
    'are',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'can',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
  ]);
  return text
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s+#.]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .filter((v, i, a) => a.indexOf(v) === i);
}

const TECH_ALIASES: Record<string, string> = {
  reactjs: 'react',
  'react.js': 'react',
  nodejs: 'node.js',
  node: 'node.js',
  nextjs: 'next.js',
  next: 'next.js',
  typescript: 'typescript',
  ts: 'typescript',
  javascript: 'javascript',
  js: 'javascript',
  postgresql: 'postgresql',
  postgres: 'postgresql',
  tailwindcss: 'tailwind',
  tailwind: 'tailwind',
};

function normalize(kw: string): string {
  return TECH_ALIASES[kw.toLowerCase()] ?? kw.toLowerCase();
}

function extractCvText(cvData: Record<string, unknown>): string {
  const parts: string[] = [];
  if (cvData.summary) parts.push(String(cvData.summary));
  if (cvData.title) parts.push(String(cvData.title));
  if (Array.isArray(cvData.skills))
    parts.push((cvData.skills as string[]).join(' '));
  if (Array.isArray(cvData.experience)) {
    for (const e of cvData.experience as Record<string, unknown>[]) {
      if (e.title) parts.push(String(e.title));
      if (e.description) parts.push(String(e.description));
    }
  }
  return parts.join(' ');
}

@Injectable()
export class JobMatchService {
  constructor(private readonly prisma: PrismaService) {}

  async matchCvToJob(userId: string, jobId: string): Promise<JobMatchResult> {
    const [cv, job] = await Promise.all([
      this.prisma.cv.findUnique({ where: { userId } }),
      this.prisma.job.findUnique({ where: { id: jobId } }),
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
    const cvText = extractCvText(cvData);
    const cvKeywords = new Set(extractKeywords(cvText).map(normalize));

    const jobText = [
      job.title ?? '',
      job.description ?? '',
      job.category ?? '',
    ].join(' ');
    const jobKeywords = [...new Set(extractKeywords(jobText).map(normalize))];

    const matchedSkills = jobKeywords.filter((kw) => cvKeywords.has(kw));
    const missingSkills = jobKeywords
      .filter((kw) => !cvKeywords.has(kw))
      .slice(0, 8);

    const baseScore =
      jobKeywords.length > 0
        ? Math.round((matchedSkills.length / jobKeywords.length) * 100)
        : 50;

    let bonus = 0;
    if (cvData.summary && String(cvData.summary).length > 50) bonus += 5;
    if (
      Array.isArray(cvData.skills) &&
      (cvData.skills as unknown[]).length >= 5
    )
      bonus += 5;
    if (
      Array.isArray(cvData.experience) &&
      (cvData.experience as unknown[]).length > 0
    )
      bonus += 5;

    const matchScore = Math.min(baseScore + bonus, 100);

    let level: JobMatchResult['level'];
    let recommendation: string;

    if (matchScore >= 80) {
      level = 'excellent';
      recommendation =
        'مؤهل ممتاز لهذه الوظيفة! مهاراتك تتطابق بشكل كبير مع متطلبات الوظيفة.';
    } else if (matchScore >= 60) {
      level = 'good';
      recommendation = `مؤهل جيد. يُنصح بإضافة: ${missingSkills.slice(0, 3).join('، ')} لتقوية طلبك.`;
    } else if (matchScore >= 40) {
      level = 'fair';
      recommendation = `مؤهل جزئياً. تحتاج لتطوير مهارات مثل: ${missingSkills.slice(0, 3).join('، ')}.`;
    } else {
      level = 'low';
      recommendation = `هذه الوظيفة تتطلب مهارات مختلفة. فكّر في تطوير: ${missingSkills.slice(0, 3).join('، ')}.`;
    }

    return { matchScore, matchedSkills, missingSkills, recommendation, level };
  }
}
