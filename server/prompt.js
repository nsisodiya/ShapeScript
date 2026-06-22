/**
 * System prompt construction for the DeepSeek-backed ShapeScript assistant.
 *
 * The API reference is the single source of truth in src/docs/api-docs.js.
 * We import it here and flatten it into a compact textual summary so the model
 * always sees the exact API surface the worker exposes. When the API changes,
 * api-docs.js is updated (per AGENTS.md) and this prompt stays in sync for free.
 */

import { API_DOCS } from '../src/docs/api-docs.js';

// Strip HTML tags that only matter for the tutorial page rendering.
function stripHtml(text) {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Build a condensed, plain-text API reference from the docs module.
function buildApiReference() {
  const lines = [];

  for (const section of API_DOCS) {
    if (!section.entries || section.entries.length === 0) continue;
    lines.push(`## ${section.title}`);

    for (const entry of section.entries) {
      const signatures = (entry.signatures || []).join(', ');
      const heading = signatures ? `${entry.name} — ${signatures}` : entry.name;
      lines.push(`- ${heading}: ${stripHtml(entry.description)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

const API_REFERENCE = buildApiReference();

const BASE_RULES = `You are an expert assistant for ShapeScript, a parametric CAD tool where 3D
models are described with plain JavaScript that runs in a sandboxed Web Worker.

Hard requirements for every script you produce:
- The script MUST end by returning a single CSG object or Group (e.g. "return cube(20);").
- Use ONLY these globals: cube, box, sphere, cylinder, cone, torus, union, subtract,
  intersect, group, move, rotate, scale, mirror, color, colorPicker, slider, checkbox, select.
- Do NOT use DOM APIs, fetch, import, require, setTimeout, or any browser/Node globals.
- The default unit is millimeters (mm). Rotation angles in the ShapeScript API are in degrees.
- Standard JavaScript (variables, loops, Math, arrays) is allowed and encouraged for patterns.
- Prefer parametric controls (slider/checkbox/select/colorPicker) when a dimension is likely
  something the user will want to tweak.

Output format (critical):
- Respond with exactly ONE fenced code block tagged \`\`\`javascript containing the full script.
- The code block must be complete and runnable on its own (it replaces the whole editor).
- After the code block you MAY add one short sentence describing the model. No other prose.

ShapeScript API reference:
${API_REFERENCE}`;

/**
 * Build the messages array for a DeepSeek chat completion based on the request mode.
 *
 * @param {Object} params
 * @param {'generate'|'modify'|'fix'} params.mode
 * @param {string} params.prompt        Natural-language user request.
 * @param {string} [params.currentCode] Current editor contents (modify/fix).
 * @param {{message?: string, line?: number}} [params.error] Worker error (fix).
 * @returns {Array<{role: string, content: string}>}
 */
export function buildMessages({ mode, prompt, currentCode, error }) {
  const messages = [{ role: 'system', content: BASE_RULES }];

  if (mode === 'modify') {
    messages.push({
      role: 'user',
      content:
        `Here is the current ShapeScript script:\n\n` +
        '```javascript\n' +
        `${currentCode || ''}\n` +
        '```\n\n' +
        `Modify it according to this request, preserving the working parts that are ` +
        `not affected: ${prompt}`
    });
  } else if (mode === 'fix') {
    const errLine = error && error.line ? ` (line ${error.line})` : '';
    const errMsg = error && error.message ? error.message : 'Unknown error';
    messages.push({
      role: 'user',
      content:
        `The following ShapeScript script fails to render:\n\n` +
        '```javascript\n' +
        `${currentCode || ''}\n` +
        '```\n\n' +
        `The worker reported this error${errLine}: ${errMsg}\n\n` +
        `Fix the script so it renders correctly. Keep the original design intent.` +
        (prompt ? ` Additional context: ${prompt}` : '')
    });
  } else {
    // generate
    messages.push({
      role: 'user',
      content: `Create a ShapeScript script for this request: ${prompt}`
    });
  }

  return messages;
}
