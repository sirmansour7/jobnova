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
  /** Candidate's governorate / region (used for location matching) */
  governorate?: string;
  /** Candidate's city (used for precise location matching) */
  city?: string;
  /** Free-form location string as fallback */
  location?: string;
  /** Total years of professional experience (stated by candidate) */
  experienceYears?: number;
  experience?: unknown[];
  experiences?: unknown[];
  education?: unknown[];
  /** Array of skill strings (e.g. ["React", "Node.js", "TypeScript"]) */
  skills?: string[];
  links?: { linkedin?: string; github?: string; portfolio?: string };
  [key: string]: unknown;
};

/**
 * Unified CV analysis result that merges rule-based scoring with optional
 * AI enrichment. This is the canonical shape stored in `cv.data.analysis`
 * and returned from POST /cv/me/analyze.
 */
export type CombinedCvAnalysisResult = {
  /** Overall CV quality score: 0–100 (rules-based, deterministic) */
  score: number;
  /** Human-readable tier based on score */
  level: 'excellent' | 'good' | 'fair' | 'poor';
  /** Detected CV language */
  language: 'ar' | 'en' | 'mixed';
  /** Keywords from the target role already present in the CV */
  matchedSkills: string[];
  /** Keywords from the target role absent from the CV */
  missingSkills: string[];
  /** Things the CV already does well */
  strengths: string[];
  /** Ordered, deduplicated, actionable improvement suggestions */
  recommendations: string[];
  /** ATS-specific guidance notes */
  atsNotes: string[];
  /** Whether the AI provider contributed enrichments to this result */
  aiEnriched: boolean;
  /** Target role used for keyword matching (empty string = generic) */
  targetRole: string;
  /** ISO 8601 timestamp of when this analysis was produced */
  analysedAt: string;
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
