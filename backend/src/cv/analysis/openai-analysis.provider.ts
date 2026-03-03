import { Injectable } from '@nestjs/common';
import type { CvAnalysisResult, CvContentInput } from './cv-analysis.types';
import type { CvAnalysisProvider } from './cv-analysis.provider';

@Injectable()
export class OpenAiAnalysisProvider implements CvAnalysisProvider {
  name = 'openai';
  analyze(content: CvContentInput | null): Promise<CvAnalysisResult> {
    void content; // Not used until OpenAI integration is implemented
    return Promise.reject(new Error('OpenAI provider not implemented yet.'));
  }
}
