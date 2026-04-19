/**
 * Calls the bias analysis API (Netlify Function: /.netlify/functions/bias-score).
 * Never calls OpenAI from the browser.
 *
 * Optional VITE_API_BASE_URL: set only if the API is on another origin (no trailing slash).
 */

const BIAS_SCORE_PATH = '/.netlify/functions/bias-score';

function biasScoreUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
  return `${base}${BIAS_SCORE_PATH}`;
}

export type BiasScoreErrorBody = {
  error?: string;
};

/** Response shape from the Netlify function / local Express API. */
export type BiasAnalysisResponse = {
  score: number;
  notes: string[];
  neutralPosition: string;
};

const LOG = '[analyze]';

function normalizeAnalysis(data: unknown): BiasAnalysisResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response from server.');
  }
  const o = data as Record<string, unknown>;

  const scoreRaw = o.score;
  let score = 0;
  if (typeof scoreRaw === 'number' && Number.isFinite(scoreRaw)) {
    score = Math.round(scoreRaw);
  } else {
    throw new Error('Invalid score in response.');
  }
  score = Math.min(100, Math.max(0, score));

  let notes: string[] = [];
  if (Array.isArray(o.notes)) {
    notes = o.notes
      .filter((n): n is string => typeof n === 'string')
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  const neutralRaw = o.neutralPosition;
  const neutralPosition =
    typeof neutralRaw === 'string' ? neutralRaw.trim() : typeof o.neutral_position === 'string' ? o.neutral_position.trim() : '';

  return { score, notes, neutralPosition };
}

export async function requestBiasAnalysis(text: string): Promise<BiasAnalysisResponse> {
  const url = biasScoreUrl();
  console.log(`${LOG} POST ${url} (chars=${text.length})`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as BiasScoreErrorBody).error === 'string'
        ? (data as BiasScoreErrorBody).error!
        : `Request failed (${res.status})`;
    console.warn(`${LOG} error response ${res.status}:`, message);
    throw new Error(message);
  }

  const normalized = normalizeAnalysis(data);
  console.log(`${LOG} analysis OK score=${normalized.score}, notes=${normalized.notes.length}`);
  return normalized;
}
