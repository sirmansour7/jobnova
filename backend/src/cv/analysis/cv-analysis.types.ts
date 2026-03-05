export type CvAnalysisResult = {
  score: number;
  strengths: string[];
  gaps: string[];
  keywordsMissing: string[];
  suggestedImprovements: string[];
  atsNotes: string[];
};

/** Input shape for CV analysis (JSON content from DB). */
export type CvContentInput = {
  profile?: { summary?: string; about?: string; title?: string };
  summary?: string;
  objective?: string;
  title?: string;
  fullName?: string;
  experience?: unknown[];
  experiences?: unknown[];
  education?: unknown[];
  skills?: unknown[];
  links?: { linkedin?: string; github?: string; portfolio?: string };
  [key: string]: unknown;
};

/** API response shape for POST /v1/cv/me/analyze (bilingual, job-title aware). */
export type CvAnalysisApiResponse = {
  language: 'ar' | 'en' | 'mixed';
  overallScore: number;
  roleFitScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  ats: {
    missingKeywords: string[];
    formatIssues: string[];
    lengthAssessment: 'short' | 'ok' | 'long';
  };
  roleMatch: {
    targetRoleTitle: string;
    matchedKeywords: string[];
    missingKeywords: string[];
    suggestions: string[];
  };
};
