import { Injectable } from '@nestjs/common';
import type { CvAnalysisResult, CvContentInput } from './cv-analysis.types';
import type { CvAnalysisProvider } from './cv-analysis.provider';

@Injectable()
export class RulesAnalysisProvider implements CvAnalysisProvider {
  name = 'rules';
  analyze(content: CvContentInput | null): Promise<CvAnalysisResult> {
    const c: CvContentInput =
      !content || typeof content !== 'object' || Array.isArray(content)
        ? {}
        : content;
    const strengths: string[] = [];
    const gaps: string[] = [];
    const suggestedImprovements: string[] = [];
    const atsNotes: string[] = [];
    let score = 50;
    const profile = (c.profile ?? {}) as {
      summary?: string;
      about?: string;
      title?: string;
    };
    const summary =
      profile.summary ?? profile.about ?? c.summary ?? c.objective;
    const hasSummary = typeof summary === 'string' && summary.trim().length > 0;
    const expArr = Array.isArray(c.experience)
      ? c.experience
      : Array.isArray(c.experiences)
        ? c.experiences
        : [];
    const skArr = Array.isArray(c.skills) ? c.skills : [];
    const links = (c.links ?? {}) as {
      linkedin?: string;
      github?: string;
      portfolio?: string;
    };
    const hasLinks = !!(links.linkedin || links.github || links.portfolio);
    if (hasSummary) {
      score += 15;
      strengths.push('Has a clear professional summary.');
    } else {
      gaps.push('Missing a professional summary.');
      suggestedImprovements.push(
        'Add a 2-4 line summary highlighting your value and key skills.',
      );
    }
    if (expArr.length >= 3) {
      score += 20;
      strengths.push('Multiple experience entries showing career progression.');
    } else if (expArr.length >= 1) {
      score += 10;
      strengths.push('Has at least one experience entry.');
      gaps.push('Add more experience entries.');
    } else {
      gaps.push('No work experience section detected.');
      suggestedImprovements.push(
        'Add a work experience section with company, role, dates, and bullet points.',
      );
    }
    if (skArr.length >= 10) {
      score += 15;
      strengths.push('Strong skills section.');
    } else if (skArr.length >= 5) {
      score += 8;
      strengths.push('Skills section with several relevant skills.');
      gaps.push('Skills could be expanded.');
    } else if (skArr.length > 0) {
      gaps.push('Skills section is quite short.');
    } else {
      gaps.push('No skills section detected.');
      suggestedImprovements.push('Add 10-20 relevant skills.');
    }
    if (hasLinks) {
      score += 10;
      strengths.push('Includes professional links.');
    } else {
      gaps.push('No LinkedIn/GitHub links detected.');
      suggestedImprovements.push('Add LinkedIn and GitHub links.');
    }
    score = Math.max(0, Math.min(100, score));
    const title = String(profile.title ?? c.title ?? '').toLowerCase();
    let targetKeywords: string[] = [];
    if (title.includes('developer') || title.includes('engineer'))
      targetKeywords = [
        'javascript',
        'typescript',
        'node.js',
        'react',
        'api',
        'rest',
        'testing',
        'ci/cd',
      ];
    else if (title.includes('data'))
      targetKeywords = [
        'python',
        'sql',
        'machine learning',
        'pandas',
        'visualization',
      ];
    else
      targetKeywords = [
        'results',
        'impact',
        'stakeholders',
        'collaboration',
        'leadership',
      ];
    const blob = JSON.stringify(c).toLowerCase();
    const keywordsMissing = targetKeywords.filter(
      (k: string) => !blob.includes(k),
    );
    if (keywordsMissing.length > 0) {
      suggestedImprovements.push(
        'Add role-specific keywords to improve ATS matching.',
      );
      atsNotes.push('Add important keywords from job descriptions.');
    }
    if (score >= 80) atsNotes.push('CV structure looks strong for ATS.');
    else if (score >= 60) atsNotes.push('CV is solid but can be improved.');
    else atsNotes.push('CV needs significant improvement.');
    return Promise.resolve({
      score,
      strengths,
      gaps,
      keywordsMissing,
      suggestedImprovements,
      atsNotes,
    });
  }
}
