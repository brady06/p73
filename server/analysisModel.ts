/**
 * Shared OpenAI prompt + JSON parsing for bias analysis (score, notes, neutral rewrite).
 * Used by Netlify Function and local Express API.
 */

export const ANALYSIS_MAX_COMPLETION_TOKENS = 1600;

export const ANALYSIS_SYSTEM_PROMPT = `You are an objective analyst of bias in text (wording, framing, tone, reasoning, or presentation).

Evaluate only bias observable in the text. Do not apply ideology, moralizing, or political assumptions. Do not punish mere opinions.

If the text is gibberish, nonsense, random characters, purely mathematical/technical with no rhetorical bias, or not meaningfully evaluable: use score 0, notes as an empty array [], and neutralPosition as an empty string "".

Otherwise respond with a single JSON object ONLY (no markdown fences, no text before or after) with exactly these keys:
- "score": integer 0–100 (bias severity; higher = stronger bias signals)
- "notes": array of 2–6 short strings; each string one concise, user-friendly observation of observable bias (loaded language, one-sided framing, emotional manipulation, etc.). Keep each under ~120 characters. If score is 0, use [].
- "neutralPosition": one string: a balanced, factual, non-inflammatory rewrite that preserves the core topic and meaning while removing biased framing. Not robotic legalese. If score is 0 or rewrite not applicable, use "".

Rules for neutralPosition: preserve core content; do not add new facts; do not preach; stay proportional in length to the input (not a huge essay).`;

export function analysisUserMessage(text: string): string {
  return `Analyze the following text and output only the JSON object described in your instructions.\n\n---\n${text}\n---`;
}

export type ParsedAnalysis = {
  score: number;
  notes: string[];
  neutralPosition: string;
};

export function parseAnalysisModelJson(raw: string): { ok: true; data: ParsedAnalysis } | { ok: false; message: string } {
  let s = raw.trim();
  if (!s) {
    return { ok: false, message: 'Empty model response' };
  }
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  }

  let obj: unknown;
  try {
    obj = JSON.parse(s);
  } catch {
    return { ok: false, message: 'Response was not valid JSON' };
  }

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, message: 'JSON root must be an object' };
  }

  const o = obj as Record<string, unknown>;
  const scoreRaw = o.score;
  let score = 0;
  if (typeof scoreRaw === 'number' && Number.isFinite(scoreRaw)) {
    score = Math.round(scoreRaw);
  } else if (typeof scoreRaw === 'string' && /^\s*\d+\s*$/.test(scoreRaw)) {
    score = Math.round(Number.parseInt(scoreRaw.trim(), 10));
  } else {
    return { ok: false, message: 'Missing or invalid score' };
  }
  score = Math.min(100, Math.max(0, score));

  let notes: string[] = [];
  if (Array.isArray(o.notes)) {
    notes = o.notes
      .filter((n): n is string => typeof n === 'string')
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  let neutralPosition = '';
  if (typeof o.neutralPosition === 'string') {
    neutralPosition = o.neutralPosition.trim();
  } else if (typeof o.neutral_position === 'string') {
    neutralPosition = o.neutral_position.trim();
  }

  return { ok: true, data: { score, notes, neutralPosition } };
}
