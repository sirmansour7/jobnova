import type {
  CvContentInput,
  CvAnalysisApiResponse,
} from './cv-analysis.types';

/** Bilingual role -> keywords (lowercase for matching). */
const ROLE_KEYWORDS: { keys: string[]; keywords: string[] }[] = [
  {
    keys: [
      'frontend',
      'واجهات أمامية',
      'واجهات',
      'front-end',
      'react',
      'frontend developer',
      'مطور واجهات',
    ],
    keywords: [
      'react',
      'next.js',
      'nextjs',
      'typescript',
      'html',
      'css',
      'tailwind',
      'rest',
      'performance',
      'accessibility',
      'javascript',
      'vue',
      'angular',
    ],
  },
  {
    keys: [
      'backend',
      'باك اند',
      'back-end',
      'backend developer',
      'مطور باك اند',
      'server',
    ],
    keywords: [
      'node',
      'node.js',
      'nestjs',
      'prisma',
      'postgresql',
      'redis',
      'rest',
      'auth',
      'security',
      'api',
      'database',
      'sql',
    ],
  },
  {
    keys: [
      'ui/ux',
      'ui ux',
      'مصمم واجهات',
      'designer',
      'مصمم',
      'ux designer',
      'ui designer',
    ],
    keywords: [
      'figma',
      'wireframes',
      'ux',
      'ui',
      'design systems',
      'typography',
      'prototype',
      'user research',
      'adobe xd',
    ],
  },
  {
    keys: ['full stack', 'fullstack', 'full-stack', 'مطور full', 'مطور ستاك'],
    keywords: [
      'react',
      'node',
      'typescript',
      'api',
      'database',
      'rest',
      'frontend',
      'backend',
      'javascript',
    ],
  },
  {
    keys: ['data', 'بيانات', 'analyst', 'محلل بيانات', 'data engineer'],
    keywords: [
      'python',
      'sql',
      'machine learning',
      'pandas',
      'visualization',
      'excel',
      'power bi',
      'tableau',
      'analysis',
    ],
  },
];

function detectLanguage(
  content: Record<string, unknown>,
): 'ar' | 'en' | 'mixed' {
  const str = JSON.stringify(content);
  let arabic = 0;
  let latin = 0;
  for (const c of str) {
    const code = c.charCodeAt(0);
    if (code >= 0x0600 && code <= 0x06ff) arabic++;
    else if (
      (code >= 0x0041 && code <= 0x005a) ||
      (code >= 0x0061 && code <= 0x007a)
    )
      latin++;
  }
  const total = arabic + latin || 1;
  const arRatio = arabic / total;
  const enRatio = latin / total;
  if (arRatio >= 0.6) return 'ar';
  if (enRatio >= 0.6) return 'en';
  return 'mixed';
}

function extractCvKeywords(c: CvContentInput): string[] {
  const out = new Set<string>();
  const add = (text: string) => {
    if (typeof text !== 'string') return;
    const normalized = text.toLowerCase().replace(/[^\w\u0600-\u06ff\s]/g, ' ');
    normalized.split(/\s+/).forEach((w) => {
      if (w.length >= 2) out.add(w);
    });
  };
  const profile = (c.profile ?? {}) as { summary?: string; title?: string };
  add(profile.summary ?? '');
  add(c.summary ?? '');
  add(c.objective ?? '');
  add(String(c.title ?? ''));
  add(profile.title ?? '');
  add(c.fullName ?? '');
  const expArr = Array.isArray(c.experience)
    ? c.experience
    : Array.isArray(c.experiences)
      ? c.experiences
      : [];
  for (const exp of expArr) {
    if (exp && typeof exp === 'object') {
      const e = exp as Record<string, unknown>;
      add(String(e.title ?? ''));
      add(String(e.company ?? ''));
      add(String(e.description ?? ''));
    }
  }
  const skArr = Array.isArray(c.skills) ? c.skills : [];
  for (const s of skArr) {
    if (typeof s === 'string') add(s);
  }
  return Array.from(out);
}

function getRoleKeywords(targetRoleTitle: string): string[] {
  const t = (targetRoleTitle || '').toLowerCase().trim();
  if (!t) return [];
  for (const { keys, keywords } of ROLE_KEYWORDS) {
    if (keys.some((k) => t.includes(k))) return keywords;
  }
  return [];
}

function computeOverallScore(c: CvContentInput): number {
  let score = 0;
  const profile = (c.profile ?? {}) as { summary?: string; title?: string };
  const summary = profile?.summary ?? c.summary ?? c.objective;
  const hasSummary = typeof summary === 'string' && summary.trim().length >= 50;
  if (hasSummary) score += 25;
  else if (typeof summary === 'string' && summary.trim().length > 0)
    score += 10;
  const expArr = Array.isArray(c.experience)
    ? c.experience
    : Array.isArray(c.experiences)
      ? c.experiences
      : [];
  if (expArr.length >= 3) score += 25;
  else if (expArr.length >= 1) score += 15;
  const skArr = Array.isArray(c.skills) ? c.skills : [];
  if (skArr.length >= 10) score += 20;
  else if (skArr.length >= 5) score += 12;
  else if (skArr.length > 0) score += 5;
  const eduArr = Array.isArray(c.education) ? c.education : [];
  if (eduArr.length > 0) score += 10;
  const hasTitle = !!(c.title || profile.title || c.fullName);
  if (hasTitle) score += 5;
  return Math.min(100, score);
}

function summaryLengthAssessment(c: CvContentInput): 'short' | 'ok' | 'long' {
  const profile = (c.profile ?? {}) as { summary?: string };
  const summary = profile?.summary ?? c.summary ?? c.objective ?? '';
  const len = typeof summary === 'string' ? summary.trim().length : 0;
  if (len < 50) return 'short';
  if (len > 500) return 'long';
  return 'ok';
}

export function runJobAwareAnalysis(
  content: CvContentInput | null,
  targetRoleTitle: string,
): CvAnalysisApiResponse {
  const c: CvContentInput =
    content && typeof content === 'object' && !Array.isArray(content)
      ? content
      : {};
  const lang = detectLanguage(c as Record<string, unknown>);
  const cvKeywords = extractCvKeywords(c);
  const roleKeywords = getRoleKeywords(targetRoleTitle);
  const overallScore = computeOverallScore(c);
  const lengthAssessment = summaryLengthAssessment(c);

  const matchedKeywords = roleKeywords.filter((k) =>
    cvKeywords.some((cvk) => cvk.includes(k) || k.includes(cvk)),
  );
  const missingKeywords = roleKeywords.filter(
    (k) => !matchedKeywords.includes(k),
  );
  const roleFitScore =
    roleKeywords.length === 0
      ? overallScore
      : Math.round((matchedKeywords.length / roleKeywords.length) * 100);

  const formatIssues: string[] = [];
  const profile = (c.profile ?? {}) as { summary?: string };
  const summary = profile?.summary ?? c.summary ?? c.objective;
  if (typeof summary !== 'string' || summary.trim().length < 50) {
    formatIssues.push(
      lang === 'ar'
        ? 'الملخص قصير جداً (أضف 50 حرفاً على الأقل)'
        : 'Summary too short (add at least 50 characters)',
    );
  }
  const expArr = Array.isArray(c.experience)
    ? c.experience
    : Array.isArray(c.experiences)
      ? c.experiences
      : [];
  if (expArr.length === 0) {
    formatIssues.push(
      lang === 'ar' ? 'لا توجد خبرات عملية' : 'No work experience section',
    );
  }

  const strengths: string[] = [];
  const improvements: string[] = [];
  if (typeof summary === 'string' && summary.length >= 50) {
    strengths.push(
      lang === 'ar' ? 'ملخص مهني واضح' : 'Clear professional summary',
    );
  } else {
    improvements.push(
      lang === 'ar'
        ? 'أضف ملخصاً مهنياً (50 حرفاً على الأقل)'
        : 'Add a professional summary (at least 50 characters)',
    );
  }
  if (expArr.length >= 1) {
    strengths.push(
      lang === 'ar'
        ? 'يوجد قسم الخبرة العملية'
        : 'Work experience section present',
    );
  } else {
    improvements.push(
      lang === 'ar' ? 'أضف قسم الخبرة العملية' : 'Add work experience section',
    );
  }
  const skArr = Array.isArray(c.skills) ? c.skills : [];
  if (skArr.length >= 5) {
    strengths.push(lang === 'ar' ? 'قسم المهارات جيد' : 'Good skills section');
  } else if (skArr.length > 0) {
    improvements.push(
      lang === 'ar' ? 'وسّع قائمة المهارات' : 'Expand skills list',
    );
  } else {
    improvements.push(
      lang === 'ar' ? 'أضف قسم المهارات' : 'Add skills section',
    );
  }
  if (missingKeywords.length > 0) {
    improvements.push(
      lang === 'ar'
        ? `كلمات مفتاحية مقترحة للوظيفة: ${missingKeywords.slice(0, 5).join(', ')}`
        : `Suggested keywords for role: ${missingKeywords.slice(0, 5).join(', ')}`,
    );
  }

  const summaryMessage =
    lang === 'ar'
      ? `الملف جيد بشكل عام. الدرجة الكلية ${overallScore} وملاءمة الدور ${roleFitScore}.`
      : lang === 'en'
        ? `Overall the CV looks good. Overall score ${overallScore}, role fit ${roleFitScore}.`
        : `الملف مختلط. الدرجة الكلية ${overallScore} وملاءمة الدور ${roleFitScore}.`;

  const suggestions = missingKeywords
    .slice(0, 5)
    .map((k) =>
      lang === 'ar'
        ? `أضف مهارة أو خبرة تتعلق بـ: ${k}`
        : `Add skill or experience related to: ${k}`,
    );

  return {
    language: lang,
    overallScore,
    roleFitScore,
    summary: summaryMessage,
    strengths,
    improvements,
    ats: {
      missingKeywords,
      formatIssues,
      lengthAssessment,
    },
    roleMatch: {
      targetRoleTitle:
        targetRoleTitle || (lang === 'ar' ? 'غير محدد' : 'Not specified'),
      matchedKeywords,
      missingKeywords,
      suggestions,
    },
  };
}
