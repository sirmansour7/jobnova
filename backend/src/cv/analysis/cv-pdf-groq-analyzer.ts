import { Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';

// pdf-parse is a CJS module; dynamic require avoids ESM interop issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  dataBuffer: Buffer,
  options?: Record<string, unknown>,
) => Promise<{ text: string }>;

// ===========================================================================
// ─── Types ──────────────────────────────────────────────────────────────────
// ===========================================================================

/** Structured CV profile extracted for job matching */
export interface PdfExtractedProfile {
  /** Normalized technical/domain skills (already lowercased) */
  skills: string[];
  /** Total professional experience in years (integer), null if unknown */
  yearsOfExperience: number | null;
  /** Primary job title / specialization */
  specialization: string | null;
  /** Career seniority inferred from experience and job titles */
  seniority: 'junior' | 'mid' | 'senior' | null;
  /** City or governorate (original language), null if absent */
  location: string | null;
}

/** Career-advisor CV evaluation returned as a separate Groq call */
export interface CvFeedback {
  /** Overall CV quality score 0–100 */
  score: number;
  /** What the CV already does well */
  strengths: string[];
  /** Missing elements or issues */
  weaknesses: string[];
  /** Specific, actionable improvement steps */
  improvements: string[];
  /** Skills the candidate should learn to be more competitive */
  recommendedSkills: string[];
  /** ISO timestamp of when this analysis was produced */
  analyzedAt: string;
}

const EMPTY_PROFILE: PdfExtractedProfile = {
  skills: [],
  yearsOfExperience: null,
  specialization: null,
  seniority: null,
  location: null,
};

// ===========================================================================
// ─── Text extraction / cleaning ─────────────────────────────────────────────
// ===========================================================================

/**
 * Reads a PDF from disk, extracts its text content, and returns a cleaned
 * string ready for LLM processing.
 *
 * Returns null when the PDF can't be parsed or yields too little text.
 * Never throws.
 */
export async function extractPdfText(
  filePath: string,
  logger: Logger,
): Promise<string | null> {
  try {
    const buffer = await readFile(filePath);
    const parsed = await pdfParse(buffer, { max: 0 });
    const raw = (parsed.text ?? '').trim();

    if (!raw || raw.length < 30) {
      logger.warn(`[CvPdfAnalyzer] PDF text too short (${raw.length} chars)`);
      return null;
    }

    return raw
      .replace(/\r\n/g, '\n')
      .replace(/\u200B-\u200D\uFEFF/g, '')   // invisible chars
      .replace(/[ \t]+/g, ' ')               // collapse horizontal whitespace
      .replace(/\n{3,}/g, '\n\n')            // collapse blank lines
      .trim()
      .slice(0, 7000);                        // ~1 750 tokens
  } catch (err) {
    logger.warn(`[CvPdfAnalyzer] pdf-parse failed for ${filePath}: ${String(err)}`);
    return null;
  }
}

// ===========================================================================
// ─── Profile extraction ─────────────────────────────────────────────────────
// ===========================================================================

const PROFILE_SYSTEM =
  'You are a senior ATS (Applicant Tracking System) specialist with expertise in CV parsing. Extract structured profile data from CVs accurately.';

const buildProfilePrompt = (text: string) =>
  `Analyze the CV below and extract structured data.

EXTRACTION RULES:
1. SKILLS — extract 5–25 technical/professional skills, normalized:
   • "React.js" / "ReactJS" → "react"  •  "Node.js" / "NodeJS" → "nodejs"
   • "Python 3" → "python"             •  "REST API" → "rest-api"
   • "Machine Learning" → "machine-learning"
   • Exclude soft skills (communication, teamwork, leadership…)

2. YEARS OF EXPERIENCE — integer; calculate from dates if not stated; 0 for fresh grad; null if impossible

3. SENIORITY — based on years AND job titles:
   • "junior": 0–2 yrs or entry/junior/trainee/intern
   • "mid":    3–5 yrs or specialist/analyst/associate
   • "senior": 6+ yrs  or senior/lead/manager/director/architect
   • null if impossible to determine

4. SPECIALIZATION — primary professional title (one phrase, can be Arabic): "Full Stack Developer", "مطور برمجيات", etc.

5. LOCATION — city or governorate only, original language; null if absent

Return ONLY this JSON — no markdown, no explanation:
{
  "skills": [],
  "yearsOfExperience": <integer or null>,
  "seniority": "junior" | "mid" | "senior" | null,
  "specialization": "<string or null>",
  "location": "<string or null>"
}

CV:
${text}`;

function parseProfileJson(content: string, logger: Logger): PdfExtractedProfile | null {
  const m = content.match(/\{[\s\S]*?\}/);
  if (!m) return null;

  const raw = m[0]
    .replace(/,\s*([\]}])/g, '$1')  // trailing commas
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

  try {
    const p = JSON.parse(raw) as {
      skills?: unknown;
      yearsOfExperience?: unknown;
      seniority?: unknown;
      specialization?: unknown;
      location?: unknown;
    };

    const skills = Array.isArray(p.skills)
      ? (p.skills as unknown[])
          .filter((s): s is string => typeof s === 'string' && s.trim().length > 1)
          .map((s) => s.trim().toLowerCase())
          .slice(0, 30)
      : [];

    const yearsOfExperience =
      typeof p.yearsOfExperience === 'number' && p.yearsOfExperience >= 0
        ? Math.min(60, Math.round(p.yearsOfExperience))
        : null;

    const rawSen = typeof p.seniority === 'string' ? p.seniority.toLowerCase().trim() : null;
    const seniority: PdfExtractedProfile['seniority'] =
      rawSen === 'junior' || rawSen === 'mid' || rawSen === 'senior' ? rawSen : null;

    const specialization =
      typeof p.specialization === 'string' && p.specialization.trim().length > 1
        ? p.specialization.trim().slice(0, 120)
        : null;

    const location =
      typeof p.location === 'string' && p.location.trim().length > 1
        ? p.location.trim().slice(0, 100)
        : null;

    // Infer seniority from experience years when Groq didn't provide it
    const inferredSeniority: PdfExtractedProfile['seniority'] =
      seniority ??
      (yearsOfExperience !== null
        ? yearsOfExperience <= 2 ? 'junior'
          : yearsOfExperience <= 5 ? 'mid'
          : 'senior'
        : null);

    return { skills, yearsOfExperience, seniority: inferredSeniority, specialization, location };
  } catch (err) {
    logger.warn(`[CvPdfAnalyzer] Profile JSON.parse failed: ${String(err)}`);
    return null;
  }
}

/**
 * Sends pre-cleaned CV text to Groq and returns structured profile data
 * for job matching. Always returns a valid (possibly empty) profile.
 */
export async function extractProfileFromText(
  text: string,
  apiKey: string,
  logger: Logger,
): Promise<PdfExtractedProfile> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 700,
        temperature: 0,
        stream: false,
        messages: [
          { role: 'system', content: PROFILE_SYSTEM },
          { role: 'user',   content: buildProfilePrompt(text) },
        ],
      }),
    });

    if (!res.ok) {
      logger.warn(`[CvPdfAnalyzer] Profile call HTTP ${res.status}`);
      return EMPTY_PROFILE;
    }

    const body = (await res.json()) as { choices?: [{ message?: { content?: string } }] };
    const content = (body.choices?.[0]?.message?.content ?? '').trim();
    const profile = content ? parseProfileJson(content, logger) : null;

    if (profile) {
      logger.log(
        `[CvPdfAnalyzer] Profile: ${profile.skills.length} skills, ` +
          `${profile.yearsOfExperience}yr, "${profile.seniority}", "${profile.specialization}"`,
      );
    }

    return profile ?? EMPTY_PROFILE;
  } catch (err) {
    logger.warn(`[CvPdfAnalyzer] Profile extraction failed: ${String(err)}`);
    return EMPTY_PROFILE;
  }
}

// ===========================================================================
// ─── Career-advisor feedback extraction ─────────────────────────────────────
// ===========================================================================

const FEEDBACK_SYSTEM =
  'You are an expert career advisor and ATS recruitment specialist. ' +
  'Provide honest, practical, and actionable CV feedback.';

const buildFeedbackPrompt = (text: string) =>
  `Analyze this CV and provide structured career feedback.

Evaluate holistically: content quality, ATS-friendliness, completeness, and market competitiveness.

Score criteria:
  80–100 = Excellent, ready to apply immediately
  60–79  = Good, minor improvements needed
  40–59  = Fair, significant gaps present
  0–39   = Poor, major revision required

Return ONLY this JSON — no markdown, no explanation:
{
  "score": <integer 0-100>,
  "strengths": ["<what the CV does well — 3 items>"],
  "weaknesses": ["<critical missing or weak elements — 3-4 items>"],
  "improvements": ["<specific actionable steps — 4-5 items>"],
  "recommendedSkills": ["<skills to learn for better employability — 3-5 items>"]
}

IMPORTANT: Respond in the SAME LANGUAGE as the CV (Arabic if the CV is primarily in Arabic).

CV:
${text}`;

function parseFeedbackJson(content: string, logger: Logger): CvFeedback | null {
  const m = content.match(/\{[\s\S]*?\}/);
  if (!m) return null;

  const raw = m[0]
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

  try {
    const p = JSON.parse(raw) as {
      score?: unknown;
      strengths?: unknown;
      weaknesses?: unknown;
      improvements?: unknown;
      recommendedSkills?: unknown;
    };

    const toStringArray = (v: unknown, max = 8): string[] =>
      Array.isArray(v)
        ? (v as unknown[])
            .filter((s): s is string => typeof s === 'string' && s.trim().length > 2)
            .map((s) => s.trim())
            .slice(0, max)
        : [];

    const score =
      typeof p.score === 'number' && p.score >= 0 && p.score <= 100
        ? Math.round(p.score)
        : 50;

    return {
      score,
      strengths:        toStringArray(p.strengths, 6),
      weaknesses:       toStringArray(p.weaknesses, 6),
      improvements:     toStringArray(p.improvements, 8),
      recommendedSkills: toStringArray(p.recommendedSkills, 6),
      analyzedAt:       new Date().toISOString(),
    };
  } catch (err) {
    logger.warn(`[CvPdfAnalyzer] Feedback JSON.parse failed: ${String(err)}`);
    return null;
  }
}

/**
 * Sends pre-cleaned CV text to Groq for career-advisor feedback.
 * Returns null on any failure — the caller treats this as a non-fatal issue.
 */
export async function extractFeedbackFromText(
  text: string,
  apiKey: string,
  logger: Logger,
): Promise<CvFeedback | null> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 800,
        temperature: 0.3,   // slight creativity for richer feedback
        stream: false,
        messages: [
          { role: 'system', content: FEEDBACK_SYSTEM },
          { role: 'user',   content: buildFeedbackPrompt(text) },
        ],
      }),
    });

    if (!res.ok) {
      logger.warn(`[CvPdfAnalyzer] Feedback call HTTP ${res.status}`);
      return null;
    }

    const body = (await res.json()) as { choices?: [{ message?: { content?: string } }] };
    const content = (body.choices?.[0]?.message?.content ?? '').trim();
    if (!content) return null;

    const feedback = parseFeedbackJson(content, logger);
    if (feedback) {
      logger.log(`[CvPdfAnalyzer] Feedback: score=${feedback.score}, strengths=${feedback.strengths.length}`);
    }
    return feedback;
  } catch (err) {
    logger.warn(`[CvPdfAnalyzer] Feedback extraction failed: ${String(err)}`);
    return null;
  }
}

// ===========================================================================
// ─── Convenience wrapper (backward-compat) ──────────────────────────────────
// ===========================================================================

/**
 * Full pipeline: reads PDF from disk → cleans text → extracts profile.
 * Use `extractPdfText + extractProfileFromText` directly for better control.
 */
export async function extractProfileFromPdf(
  filePath: string,
  apiKey: string,
  logger: Logger,
): Promise<PdfExtractedProfile> {
  const text = await extractPdfText(filePath, logger);
  if (!text) return EMPTY_PROFILE;
  return extractProfileFromText(text, apiKey, logger);
}
