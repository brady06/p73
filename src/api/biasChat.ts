/**
 * Chat about the current analysis (Netlify: /.netlify/functions/bias-chat).
 * Never calls OpenAI from the browser.
 */

const BIAS_CHAT_PATH = '/.netlify/functions/bias-chat';

export type BiasChatTurn = { role: 'user' | 'assistant'; content: string };

export type BiasChatContextPayload = {
  analyzedText: string;
  biasScore: number | null;
  biasNotes: string[];
  biasedPhrases: { phrase: string; reason: string }[];
  neutralPosition: string;
};

function biasChatUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
  return `${base}${BIAS_CHAT_PATH}`;
}

export async function requestBiasChatReply(
  messages: BiasChatTurn[],
  context: BiasChatContextPayload,
): Promise<{ reply: string }> {
  const url = biasChatUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  if (!data || typeof data !== 'object' || typeof (data as { reply?: unknown }).reply !== 'string') {
    throw new Error('Invalid response from server.');
  }

  const reply = (data as { reply: string }).reply.trim();
  if (!reply) {
    throw new Error('Empty reply from server.');
  }

  return { reply };
}
