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
  experience?: unknown[];
  experiences?: unknown[];
  skills?: unknown[];
  links?: { linkedin?: string; github?: string; portfolio?: string };
  [key: string]: unknown;
};
