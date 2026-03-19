import type { JobCategory, JobType } from '@prisma/client';

export interface JobMatchResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: string;
  level: 'excellent' | 'good' | 'fair' | 'low';
}

export interface RecommendedJob {
  id: string;
  title: string;
  partnerName: string;
  category: JobCategory | null;
  jobType: JobType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  governorate: string | null;
  city: string | null;
  organization: { id: string; name: string };
  /** Weighted match score 0–100 (skills 60% + experience 25% + location 15% + important bonus 10) */
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  /** Subset of matchedSkills that are considered high-value / in-demand */
  importantMatchedSkills: string[];
  createdAt: Date;
}

export interface RecommendedJobsResult {
  jobs: RecommendedJob[];
  total: number;
}
