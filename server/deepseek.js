/**
 * Thin DeepSeek chat client + response parsing.
 *
 * DeepSeek exposes an OpenAI-compatible Chat Completions endpoint, so we just
 * POST the messages with a Bearer token. The key never leaves the server.
 */

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

/**
 * Call DeepSeek with a prepared messages array and return the raw assistant text.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<string>} The assistant message content.
 */
export async function callDeepSeek(messages, { signal } = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured on the server.');
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.4,
      stream: false
    }),
    signal
  });

  if (!response.ok) {
    // Surface a safe, generic error; never echo the request body or key.
    let detail = '';
    try {
      const data = await response.json();
      detail = data?.error?.message || '';
    } catch {
      /* ignore parse failure */
    }
    const suffix = detail ? `: ${detail}` : '';
    throw new Error(`DeepSeek request failed (${response.status})${suffix}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek returned an empty response.');
  }
  return content;
}

/**
 * Extract the ShapeScript code and optional explanation from a model reply.
 *
 * The system prompt asks for a single ```javascript fenced block, optionally
 * followed by one short sentence. We are defensive: fall back to any fenced
 * block, then to the raw text.
 *
 * @param {string} reply
 * @returns {{ code: string, explanation: string }}
 */
export function parseReply(reply) {
  const text = (reply || '').trim();

  // Prefer an explicitly javascript/js tagged block.
  const tagged = text.match(/```(?:javascript|js)\s*\n([\s\S]*?)```/i);
  // Otherwise accept any fenced block.
  const anyFence = text.match(/```[a-zA-Z]*\s*\n([\s\S]*?)```/);

  const match = tagged || anyFence;

  if (match) {
    const code = match[1].trim();
    // Anything after the closing fence is treated as a short explanation.
    const after = text.slice(match.index + match[0].length).trim();
    const explanation = after.replace(/\s+/g, ' ').slice(0, 280);
    return { code, explanation };
  }

  // No fence found — assume the entire reply is code.
  return { code: text, explanation: '' };
}
