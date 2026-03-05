export interface JobMatchResult {
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
  recommendation: string
  level: 'excellent' | 'good' | 'fair' | 'low'
}
