/**
 * Netlify Function: scoped Q&A chat about the analyzed text and bias.
 */
import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import {
  BIAS_CHAT_MAX_COMPLETION_TOKENS,
  buildBiasChatSystemContent,
  parseBiasChatBody,
} from '../../server/biasChat';

const LOG = '[bias-chat-fn]';
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
    console.error(`${LOG} ${reqId} missing OPENAI_API_KEY`);
    return json(500, { error: 'Server is not configured with OPENAI_API_KEY.' });
  }

  let body: unknown;
  try {
    body = event.body ? JSON.parse(event.body) : null;
  } catch {
    console.warn(`${LOG} ${reqId} invalid JSON body`);
    return json(400, { error: 'Invalid JSON body.' });
  }

  const parsed = parseBiasChatBody(body);
  if (!parsed.ok) {
    console.warn(`${LOG} ${reqId} bad request: ${parsed.error}`);
    return json(parsed.status, { error: parsed.error });
  }

  const { messages, context } = parsed;
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const systemContent = buildBiasChatSystemContent(context);

  const openai = new OpenAI({
    apiKey,
    timeout: OPENAI_TIMEOUT_MS,
  });

  try {
    console.log(`${LOG} ${reqId} model=${model} messages=${messages.length}`);
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.35,
      max_completion_tokens: BIAS_CHAT_MAX_COMPLETION_TOKENS,
      messages: [{ role: 'system', content: systemContent }, ...messages],
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      console.error(`${LOG} ${reqId} empty assistant content`);
      return json(502, { error: 'No response from the model.' });
    }

    console.log(`${LOG} ${reqId} reply length=${reply.length}`);
    return json(200, { reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI request failed';
    console.error(`${LOG} ${reqId} exception:`, message);
    return json(502, { error: message });
  }
};
