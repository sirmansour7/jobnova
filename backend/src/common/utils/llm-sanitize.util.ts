/**
 * Utilities for sanitizing user-supplied text before it is interpolated into
 * LLM prompts, reducing the risk of prompt injection attacks.
 *
 * Strategy:
 *  1. Strip ASCII control characters (null bytes, escape sequences, etc.)
 *  2. Break common injection delimiter patterns used by some models
 *  3. Hard-truncate to a caller-specified max length
 *
 * This is a defence-in-depth measure alongside XML-style data delimiters in
 * the prompt itself (see usage in chat.service.ts / openai-analysis.provider.ts).
 */

// Control chars except \t (0x09), \n (0x0A), \r (0x0D)
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// Break the "<|...|>" token delimiter pattern used by several open-weight
// models (LLaMA, Mistral) for special instructions.
const LLAMA_DELIMITERS_RE = /<\|/g;

export function sanitizeLlmInput(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(CONTROL_CHARS_RE, '')
    .replace(LLAMA_DELIMITERS_RE, '< |')
    .trim()
    .slice(0, maxLength);
}
