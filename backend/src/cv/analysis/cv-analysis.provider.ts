import type { CvAnalysisResult, CvContentInput } from './cv-analysis.types';
export interface CvAnalysisProvider {
  name: string;
  analyze(content: CvContentInput | null): Promise<CvAnalysisResult>;
}
