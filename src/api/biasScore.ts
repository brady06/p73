/**
 * Calls the bias-score API (Netlify Function in production: /.netlify/functions/bias-score).
 * Never calls OpenAI from the browser.
 *
 * Optional VITE_API_BASE_URL: set only if the API is on another origin (include protocol, no trailing slash).
 */

const BIAS_SCORE_PATH = '/.netlify/functions/bias-score';

function biasScoreUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
  return `${base}${BIAS_SCORE_PATH}`;
}

export type BiasScoreErrorBody = {
  error?: string;
};

const LOG = '[analyze]';

export async function requestBiasScore(text: string): Promise<number> {
  const url = biasScoreUrl();
  console.log(`${LOG} POST ${url} (chars=${text.length})`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const data: unknown = await res.json().catch(() => (null));

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

  if (!data || typeof data !== 'object' || !('score' in data)) {
    console.warn(`${LOG} invalid JSON body`);
    throw new Error('Invalid response from server.');
  }

  const score = (data as { score: unknown }).score;
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    console.warn(`${LOG} invalid score field`);
    throw new Error('Invalid score in response.');
  }

  const normalized = Math.min(100, Math.max(0, Math.round(score)));
  console.log(`${LOG} parsed score=${normalized}`);
  return normalized;
}
