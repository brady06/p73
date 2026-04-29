/**
 * Local development API only. Production deploys use Netlify: netlify/functions/bias-score.ts
 */
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import OpenAI from 'openai';
import {
  ANALYSIS_MAX_COMPLETION_TOKENS,
  ANALYSIS_SYSTEM_PROMPT,
  analysisUserMessage,
  parseAnalysisModelJson,
} from './analysisModel.js';
import {
  BIAS_CHAT_MAX_COMPLETION_TOKENS,
  buildBiasChatSystemContent,
  parseBiasChatBody,
} from './biasChat.js';

const serverDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(serverDir, '..');
const envPath = join(projectRoot, '.env');

console.log('[bias-score] Env file path:', envPath);
console.log('[bias-score] Env file exists:', existsSync(envPath));

const envResult = loadEnv({ path: envPath });
if (envResult.error) {
  console.warn('[bias-score] dotenv error reading .env:', envResult.error.message);
} else if (envResult.parsed && Object.keys(envResult.parsed).length > 0) {
  const names = Object.keys(envResult.parsed).sort().join(', ');
  console.log('[bias-score] Parsed .env variable names (values hidden):', names || '(none)');
} else if (existsSync(envPath)) {
  console.warn('[bias-score] .env exists but dotenv returned no parsed entries (check syntax, UTF-8, no BOM issues)');
} else {
  console.warn('[bias-score] No .env at expected path; set OPENAI_API_KEY in environment or create that file');
}

const LOG = '[bias-score]';

/** Max characters accepted in HTTP body (before model truncation). */
const MAX_BODY_TEXT_CHARS = 32_000;
/**
 * Max characters sent to the model after trim (truncation logged if applied).
 * ~2k tokens ballpark for English; keeps latency and cost down.
 */
const MAX_MODEL_INPUT_CHARS = 8_000;

const OPENAI_TIMEOUT_MS = 45_000;
const PORT = Number(process.env.PORT) || 8787;

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: key,
      timeout: OPENAI_TIMEOUT_MS,
    });
  }
  return openaiClient;
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

const app = express();
app.use(cors());
app.use(express.json({ limit: '600kb' }));

app.post('/api/bias-score', async (req, res) => {
  const reqId = globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}`;
  console.log(`${LOG} ${reqId} request received`);

  const openai = getOpenAI();
  if (!openai) {
    console.error(`${LOG} ${reqId} error: missing OPENAI_API_KEY`);
    res.status(500).json({ error: 'Server is not configured with OPENAI_API_KEY.' });
    return;
  }

  const text = req.body?.text;
  if (typeof text !== 'string') {
    console.warn(`${LOG} ${reqId} error: body.text not a string`);
    res.status(400).json({ error: 'Request body must include a string "text" field.' });
    return;
  }

  const trimmed = text.trim();
  const inputLen = text.length;
  const trimmedLen = trimmed.length;
  console.log(`${LOG} ${reqId} input: raw length=${inputLen}, trimmed length=${trimmedLen}`);

  if (!trimmed) {
    console.warn(`${LOG} ${reqId} error: empty after trim`);
    res.status(400).json({ error: 'Text must not be empty.' });
    return;
  }

  if (trimmed.length > MAX_BODY_TEXT_CHARS) {
    console.warn(`${LOG} ${reqId} error: exceeds max body length ${MAX_BODY_TEXT_CHARS}`);
    res.status(400).json({ error: `Text must be at most ${MAX_BODY_TEXT_CHARS} characters.` });
    return;
  }

  const { text: modelInput, truncated, originalLen } = prepareTextForModel(trimmed);
  console.log(
    `${LOG} ${reqId} model input: length=${modelInput.length}, truncated=${truncated}` +
      (truncated ? ` (from ${originalLen} chars)` : ''),
  );

  try {
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    console.log(`${LOG} ${reqId} calling OpenAI model=${model} max_completion_tokens=${ANALYSIS_MAX_COMPLETION_TOKENS}`);

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      max_completion_tokens: ANALYSIS_MAX_COMPLETION_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: analysisUserMessage(modelInput) },
      ],
    });

    console.log(`${LOG} ${reqId} OpenAI response received`);
    const usage = completion.usage;
    if (usage) {
      console.log(
        `${LOG} ${reqId} tokens: prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}, total=${usage.total_tokens}`,
      );
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error(`${LOG} ${reqId} error: empty message content`);
      res.status(502).json({ error: 'No response from the model.' });
      return;
    }

    const rawPreview = content.length > 200 ? `${content.slice(0, 200)}…` : content;
    console.log(`${LOG} ${reqId} raw model output: ${JSON.stringify(rawPreview)}`);

    const parsed = parseAnalysisModelJson(content);
    if (!parsed.ok) {
      console.error(`${LOG} ${reqId} parse failed: ${parsed.message}`);
      res.status(502).json({ error: 'Could not parse analysis from the model.' });
      return;
    }

    const { score, notes, biasedPhrases, rewriteChanges, neutralPosition } = parsed.data;
    console.log(`${LOG} ${reqId} parsed score=${score}, notes=${notes.length} (sending JSON to client)`);
    res.json({ score, notes, biasedPhrases, rewriteChanges, neutralPosition });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI request failed';
    console.error(`${LOG} ${reqId} exception:`, message);
    res.status(502).json({ error: message });
  }
});

const CHAT_LOG = '[bias-chat]';

app.post('/api/bias-chat', async (req, res) => {
  const reqId = globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}`;
  console.log(`${CHAT_LOG} ${reqId} request received`);

  const openai = getOpenAI();
  if (!openai) {
    console.error(`${CHAT_LOG} ${reqId} error: missing OPENAI_API_KEY`);
    res.status(500).json({ error: 'Server is not configured with OPENAI_API_KEY.' });
    return;
  }

  const parsed = parseBiasChatBody(req.body);
  if (!parsed.ok) {
    console.warn(`${CHAT_LOG} ${reqId} bad request: ${parsed.error}`);
    res.status(parsed.status).json({ error: parsed.error });
    return;
  }

  const { messages, context } = parsed;
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const systemContent = buildBiasChatSystemContent(context);

  try {
    console.log(`${CHAT_LOG} ${reqId} model=${model} messages=${messages.length}`);
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.35,
      max_completion_tokens: BIAS_CHAT_MAX_COMPLETION_TOKENS,
      messages: [{ role: 'system', content: systemContent }, ...messages],
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      console.error(`${CHAT_LOG} ${reqId} empty assistant content`);
      res.status(502).json({ error: 'No response from the model.' });
      return;
    }

    console.log(`${CHAT_LOG} ${reqId} reply length=${reply.length}`);
    res.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI request failed';
    console.error(`${CHAT_LOG} ${reqId} exception:`, message);
    res.status(502).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Bias score API listening on http://127.0.0.1:${PORT}`);
  const keyLen = process.env.OPENAI_API_KEY?.trim().length ?? 0;
  console.log(
    `${LOG} OPENAI_API_KEY: ${keyLen > 0 ? `loaded (${keyLen} characters)` : 'MISSING — add OPENAI_API_KEY to .env in project root (same folder as package.json) and restart the API'}`,
  );
  console.log(
    `${LOG} limits: max_body_chars=${MAX_BODY_TEXT_CHARS}, max_model_input_chars=${MAX_MODEL_INPUT_CHARS}, max_completion_tokens=${ANALYSIS_MAX_COMPLETION_TOKENS}, openai_timeout_ms=${OPENAI_TIMEOUT_MS}`,
  );
});
