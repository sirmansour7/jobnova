import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CvAnalysisResult, CvContentInput } from './cv-analysis.types';
import type { CvAnalysisProvider } from './cv-analysis.provider';

@Injectable()
export class OpenAiAnalysisProvider implements CvAnalysisProvider {
  name = 'openai';

  constructor(private readonly config: ConfigService) {}

  async analyze(content: CvContentInput | null): Promise<CvAnalysisResult> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) throw new Error('GROQ_API_KEY is not configured.');

    const cvText = content ? JSON.stringify(content, null, 2) : '(empty CV)';

    const prompt = `You are a professional CV reviewer. Analyze the following CV JSON and return a JSON object with exactly these fields:
- score: number 0-100
- strengths: string[] (3-5 items)
- gaps: string[] (2-4 items)
- keywordsMissing: string[] (3-6 keywords)
- suggestedImprovements: string[] (3-5 items)
- atsNotes: string[] (1-3 items)

CV content:
${cvText}

Respond ONLY with valid JSON, no markdown, no explanation.`;

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error: ${response.status} ${err}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? '{}';

    let parsed: CvAnalysisResult;
    try {
      parsed = JSON.parse(raw) as CvAnalysisResult;
    } catch {
      throw new Error(`Failed to parse Groq response: ${raw}`);
    }

    return {
      score: Number(parsed.score ?? 50),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      keywordsMissing: Array.isArray(parsed.keywordsMissing)
        ? parsed.keywordsMissing
        : [],
      suggestedImprovements: Array.isArray(parsed.suggestedImprovements)
        ? parsed.suggestedImprovements
        : [],
      atsNotes: Array.isArray(parsed.atsNotes) ? parsed.atsNotes : [],
    };
  }
}
