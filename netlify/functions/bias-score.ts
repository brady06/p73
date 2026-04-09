/**
 * Netlify Function: cognitive bias score (0–100). Keep prompts/parser aligned with server/openaiPrompt.ts and server/parseScore.ts if you change them.
 */
import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';

const LOG = '[bias-score-fn]';

const BIAS_SCORE_SYSTEM_PROMPT = `You are an objective evaluator of cognitive bias in text.

Score ONLY bias observable in the wording, framing, reasoning, or presentation. Do not apply ideology, moralizing, or political assumptions. Having an opinion is not bias by itself.

Use 0 if the text is gibberish, nonsense, random characters, purely mathematical/technical with no rhetorical bias, or not meaningfully evaluable for cognitive bias.

Output rules (mandatory):
- Output only a single integer from 0 to 100.
- No other characters: no words, no JSON, no punctuation, no explanation, no line breaks, no spaces.`;

function biasScoreUserMessage(text: string): string {
  return `Score the cognitive bias severity of the following text (0–100). Output only the integer.\n\n${text}`;
}

type ParsedScore = { ok: true; score: number } | { ok: false; message: string };

function parseScoreFromModelContent(raw: string): ParsedScore {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: 'Empty model response' };
  }
  if (/```|json|\{|}/i.test(trimmed)) {
    return { ok: false, message: 'Model returned non-numeric content (markers detected)' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: `Expected only digits 0-100, got: ${JSON.stringify(trimmed.slice(0, 80))}` };
  }
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(value)) {
    return { ok: false, message: 'Could not parse integer' };
  }
  const clamped = Math.min(100, Math.max(0, value));
  return { ok: true, score: clamped };
}

const MAX_BODY_TEXT_CHARS = 32_000;
const MAX_MODEL_INPUT_CHARS = 8_000;
const MAX_COMPLETION_TOKENS = 8;
const OPENAI_TIMEOUT_MS = 45_000;

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

function prepareTextForModel(raw: string): { text: string; truncated: boolean; originalLen: number } {
  const originalLen = raw.length;
  if (raw.length <= MAX_MODEL_INPUT_CHARS) {
    return { text: raw, truncated: false, originalLen };
  }
  return {
    text: raw.slice(0, MAX_MODEL_INPUT_CHARS),
    truncated: true,
    originalLen,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const reqId = globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}`;
  console.log(`${LOG} ${reqId} request received`);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error(`${LOG} ${reqId} missing OPENAI_API_KEY (set in Netlify: Site configuration → Environment variables)`);
    return json(500, { error: 'Server is not configured with OPENAI_API_KEY.' });
  }

  let body: unknown;
  try {
    body = event.body ? JSON.parse(event.body) : null;
  } catch {
    console.warn(`${LOG} ${reqId} invalid JSON body`);
    return json(400, { error: 'Invalid JSON body.' });
  }

  const text = body && typeof body === 'object' && body !== null && 'text' in body ? (body as { text: unknown }).text : undefined;
  if (typeof text !== 'string') {
    console.warn(`${LOG} ${reqId} body.text not a string`);
    return json(400, { error: 'Request body must include a string "text" field.' });
  }

  const trimmed = text.trim();
  console.log(`${LOG} ${reqId} input: raw length=${text.length}, trimmed length=${trimmed.length}`);

  if (!trimmed) {
    return json(400, { error: 'Text must not be empty.' });
  }

  if (trimmed.length > MAX_BODY_TEXT_CHARS) {
    return json(400, { error: `Text must be at most ${MAX_BODY_TEXT_CHARS} characters.` });
  }

  const { text: modelInput, truncated, originalLen } = prepareTextForModel(trimmed);
  console.log(
    `${LOG} ${reqId} model input: length=${modelInput.length}, truncated=${truncated}` +
      (truncated ? ` (from ${originalLen} chars)` : ''),
  );

  const openai = new OpenAI({
    apiKey,
    timeout: OPENAI_TIMEOUT_MS,
  });

  try {
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    console.log(`${LOG} ${reqId} sending to OpenAI model=${model}`);

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      messages: [
        { role: 'system', content: BIAS_SCORE_SYSTEM_PROMPT },
        { role: 'user', content: biasScoreUserMessage(modelInput) },
      ],
    });

    console.log(`${LOG} ${reqId} OpenAI response received`);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error(`${LOG} ${reqId} empty message content`);
      return json(502, { error: 'No response from the model.' });
    }

    console.log(`${LOG} ${reqId} raw output (preview):`, JSON.stringify(content.slice(0, 80)));

    const parsed = parseScoreFromModelContent(content);
    if (!parsed.ok) {
      console.error(`${LOG} ${reqId} parse failed:`, parsed.message);
      return json(502, { error: 'Could not parse a valid score from the model.' });
    }

    console.log(`${LOG} ${reqId} parsed score=${parsed.score}`);
    return json(200, { score: parsed.score });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI request failed';
    console.error(`${LOG} ${reqId} exception:`, message);
    return json(502, { error: message });
  }
};
