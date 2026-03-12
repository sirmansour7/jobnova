import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { INTERVIEW_QUESTIONS_COUNT } from './constants/interview-questions';

@Injectable()
export class InterviewSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a rule-based summary from session messages and persist it.
   * No external AI; deterministic heuristics only.
   */
  async generate(sessionId: string): Promise<void> {
    const messages = await this.prisma.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    const candidateAnswers = messages
      .filter((m) => m.role === 'candidate')
      .map((m) => m.content.trim())
      .filter(Boolean);

    const allText = candidateAnswers.join(' ');
    const yearsExperience = this.extractYearsExperience(
      allText,
      candidateAnswers,
    );
    const availability = this.extractAvailability(allText, candidateAnswers);
    const salaryExpectation = this.extractSalaryExpectation(
      allText,
      candidateAnswers,
    );
    const skillsExtracted = this.extractSkills(allText, candidateAnswers);
    const communicationScore = this.scoreCommunication(candidateAnswers);
    const jobFit = this.computeJobFit(
      candidateAnswers,
      yearsExperience,
      skillsExtracted,
      communicationScore,
    );
    const recommendation = this.recommendationFromJobFit(jobFit);
    const summaryTextArabic = this.buildSummaryArabic(
      yearsExperience,
      availability,
      salaryExpectation,
      skillsExtracted,
      communicationScore,
      jobFit,
      recommendation,
    );

    await this.prisma.interviewSummary.upsert({
      where: { sessionId },
      create: {
        sessionId,
        yearsExperience: yearsExperience ?? undefined,
        availability: availability ?? undefined,
        salaryExpectation: salaryExpectation ?? undefined,
        skillsExtracted: skillsExtracted.length ? skillsExtracted : undefined,
        communicationScore,
        jobFit,
        recommendation,
        summaryTextArabic: summaryTextArabic || undefined,
      },
      update: {
        yearsExperience: yearsExperience ?? null,
        availability: availability ?? null,
        salaryExpectation: salaryExpectation ?? null,
        skillsExtracted: skillsExtracted.length
          ? skillsExtracted
          : Prisma.JsonNull,
        communicationScore,
        jobFit,
        recommendation,
        summaryTextArabic: summaryTextArabic || null,
      },
    });
  }

  private extractYearsExperience(
    allText: string,
    answers: string[],
  ): string | null {
    const lower = allText.toLowerCase();
    const yearsMatch = allText.match(
      /(\d+)\s*سنة|(\d+)\s*سنين|(\d+)\s*year|خبرة\s*(\d+)|(\d+)\s*-\s*(\d+)/i,
    );
    if (yearsMatch) {
      const n = yearsMatch.slice(1).find(Boolean);
      return n ? `${n} سنوات` : null;
    }
    if (/\d+/.test(lower) && (lower.includes('سنة') || lower.includes('خبرة')))
      return allText.match(/\d+/)?.[0]
        ? `${allText.match(/\d+/)?.[0]} سنوات`
        : null;
    return answers.length >= 2 ? answers[1].slice(0, 80) || null : null;
  }

  private extractAvailability(
    allText: string,
    answers: string[],
  ): string | null {
    const lower = allText.toLowerCase();
    if (/فور[اى]|مباشر|دلوقتي|الآن|متاح\s*الآن|immediately|now/i.test(lower))
      return 'متاح فوراً';
    if (/شهر|بعد\s*شهر|شهرين|أسبوع|اسبوع/i.test(lower))
      return (
        allText.match(/(بعد\s*)?\d*\s*(شهر|أسبوع)[^\s.]*/i)?.[0] ?? 'خلال شهر'
      );
    if (/متاح|أي\s*وقت|اي\s*وقت/i.test(lower)) return 'متاح';
    return answers.length >= 5 ? answers[4].slice(0, 60) || null : null;
  }

  private extractSalaryExpectation(
    allText: string,
    _answers: string[],
  ): string | null {
    const numbers = allText.match(/\d{4,}/g);
    if (numbers && numbers.length > 0) {
      const num = numbers.map((n) => parseInt(n, 10)).filter((n) => n > 1000);
      if (num.length > 0) {
        const min = Math.min(...num);
        const max = Math.max(...num);
        return min === max ? `${min} جنيه` : `${min} - ${max} جنيه`;
      }
    }
    if (/راتب|جنيه|salary|متوقع/i.test(allText.toLowerCase()))
      return allText.match(/[\d,]+[\s]*جنيه?|[\d,]+/)?.[0] ?? null;
    return null;
  }

  private extractSkills(allText: string, answers: string[]): string[] {
    const skills: string[] = [];
    const thirdAnswer = answers[3] ?? '';
    const words = (allText + ' ' + thirdAnswer)
      .replace(/[,،.؟!]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && w.length < 25);
    const known = [
      'javascript',
      'typescript',
      'react',
      'node',
      'python',
      'java',
      'html',
      'css',
      'sql',
      'communication',
      'تواصل',
      'قيادة',
      'فريق',
      'إدارة',
      'تحليل',
    ];
    for (const w of words) {
      const lower = w.toLowerCase();
      if (
        known.some((k) => lower.includes(k) || k.includes(lower)) &&
        !skills.includes(w)
      )
        skills.push(w);
    }
    if (skills.length === 0 && thirdAnswer) {
      const parts = thirdAnswer
        .split(/[,،]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 2 && p.length < 30);
      skills.push(...parts.slice(0, 5));
    }
    return [...new Set(skills)].slice(0, 10);
  }

  private scoreCommunication(answers: string[]): number {
    if (answers.length === 0) return 1;
    const totalLen = answers.reduce((s, a) => s + a.length, 0);
    const avgLen = totalLen / answers.length;
    const filled = answers.filter((a) => a.length >= 5).length;
    const ratio = filled / Math.max(1, answers.length);
    let score = 5;
    if (avgLen >= 30) score += 2;
    if (avgLen >= 60) score += 1;
    if (ratio >= 0.8) score += 1;
    if (ratio === 1 && answers.length >= INTERVIEW_QUESTIONS_COUNT) score += 1;
    return Math.min(10, Math.max(1, score));
  }

  private computeJobFit(
    answers: string[],
    yearsExperience: string | null,
    skills: string[],
    communicationScore: number,
  ): 'high' | 'medium' | 'low' {
    const hasExperience = Boolean(
      yearsExperience && yearsExperience.length > 0,
    );
    const hasSkills = skills.length >= 2;
    const completeAnswers = answers.length >= INTERVIEW_QUESTIONS_COUNT;
    const goodComm = communicationScore >= 6;
    if (completeAnswers && hasExperience && hasSkills && goodComm)
      return 'high';
    if ((hasExperience || hasSkills) && goodComm) return 'medium';
    return 'low';
  }

  private recommendationFromJobFit(
    jobFit: string,
  ): 'shortlist' | 'review' | 'reject' {
    if (jobFit === 'high') return 'shortlist';
    if (jobFit === 'medium') return 'review';
    return 'reject';
  }

  private buildSummaryArabic(
    yearsExperience: string | null,
    availability: string | null,
    salaryExpectation: string | null,
    skills: string[],
    communicationScore: number,
    jobFit: string,
    recommendation: string,
  ): string {
    const parts: string[] = [];
    if (yearsExperience) parts.push(`الخبرة: ${yearsExperience}`);
    if (availability) parts.push(`الإتاحة: ${availability}`);
    if (salaryExpectation) parts.push(`الراتب المتوقع: ${salaryExpectation}`);
    if (skills.length > 0) parts.push(`المهارات: ${skills.join('، ')}`);
    parts.push(`تقييم التواصل: ${communicationScore}/10`);
    parts.push(
      `ملاءمة الوظيفة: ${jobFit === 'high' ? 'عالية' : jobFit === 'medium' ? 'متوسطة' : 'منخفضة'}`,
    );
    parts.push(
      `التوصية: ${recommendation === 'shortlist' ? 'قائمة مختصرة' : recommendation === 'review' ? 'مراجعة' : 'رفض'}`,
    );
    return parts.join('. ');
  }
}
