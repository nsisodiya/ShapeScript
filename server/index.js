/**
 * ShapeScript server.
 *
 * One process for both local dev and Cloud Run:
 *   - POST /api/ai/chat  -> proxies DeepSeek (key stays server-side)
 *   - GET  /health       -> liveness/readiness probe
 *   - everything else    -> static SPA from dist/ (production only)
 *
 * In dev, Vite serves the SPA and proxies /api here (see vite.config.js).
 */

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { buildMessages } from './prompt.js';
import { callDeepSeek, parseReply } from './deepseek.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');

const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// Input caps to bound payloads and model cost.
const MAX_PROMPT_CHARS = 2000;
const MAX_CODE_CHARS = 20000;
const VALID_MODES = new Set(['generate', 'modify', 'fix']);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

// In production the SPA and API share an origin, so CORS can stay closed.
// In dev, Vite proxies same-origin too, so no permissive CORS is needed.
app.use(cors({ origin: false }));

// Trust the Cloud Run / proxy hop so rate limiting keys on the real client IP.
app.set('trust proxy', 1);

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a few minutes and try again.' }
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api/ai/chat', aiLimiter, async (req, res) => {
  try {
    const { mode, prompt, currentCode, error } = req.body || {};

    if (!VALID_MODES.has(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Use generate, modify, or fix.' });
    }

    const trimmedPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (mode === 'generate' && !trimmedPrompt) {
      return res.status(400).json({ error: 'A prompt is required to generate a model.' });
    }
    if ((mode === 'modify' || mode === 'fix') && !currentCode) {
      return res.status(400).json({ error: `The "${mode}" mode requires the current script.` });
    }
    if (trimmedPrompt.length > MAX_PROMPT_CHARS) {
      return res.status(400).json({ error: `Prompt is too long (max ${MAX_PROMPT_CHARS} characters).` });
    }
    if (typeof currentCode === 'string' && currentCode.length > MAX_CODE_CHARS) {
      return res.status(400).json({ error: `Script is too long (max ${MAX_CODE_CHARS} characters).` });
    }

    const messages = buildMessages({
      mode,
      prompt: trimmedPrompt,
      currentCode: typeof currentCode === 'string' ? currentCode : '',
      error: error && typeof error === 'object' ? error : undefined
    });

    const reply = await callDeepSeek(messages);
    const { code, explanation } = parseReply(reply);

    if (!code) {
      return res.status(502).json({ error: 'The AI did not return any usable code. Try rephrasing.' });
    }

    return res.json({ code, explanation });
  } catch (err) {
    // Log a short server-side message only; never leak the prompt or key.
    console.error('[ai/chat] error:', err.message);
    const status = /not configured/i.test(err.message) ? 500 : 502;
    return res.status(status).json({ error: err.message || 'AI request failed.' });
  }
});

// Serve the built SPA in production (Cloud Run / docker / npm start).
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA fallback for any non-API GET (Express 5: use middleware, not "*").
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else if (IS_PROD) {
  console.warn(`[server] dist/ not found at ${DIST_DIR}. Run "npm run build" first.`);
}

app.listen(PORT, () => {
  console.log(`ShapeScript server listening on :${PORT} (${IS_PROD ? 'production' : 'development'})`);
});
