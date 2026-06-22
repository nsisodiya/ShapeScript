/**
 * Frontend controller for the in-app AI assistant.
 *
 * Talks to POST /api/ai/chat (proxied to the Express server in dev, same-origin
 * in production), parses the returned ShapeScript code, and applies it to the
 * Monaco editor before triggering a re-render through the existing pipeline.
 */

export class AIAssistant {
  /**
   * @param {Object} deps
   * @param {import('../editor/editor.js').CodeEditor} deps.editor
   * @param {() => void} deps.executeCode  Existing run pipeline from main.js.
   * @param {() => ({message: string, line: number|null}|null)} deps.getLastError
   *        Returns the current render error, or null when the model is valid.
   */
  constructor({ editor, executeCode, getLastError }) {
    this.editor = editor;
    this.executeCode = executeCode;
    this.getLastError = getLastError;
    this.controller = null; // active AbortController

    this.dom = {
      wrapper: document.getElementById('ai-panel-wrapper'),
      header: document.getElementById('ai-header'),
      collapseIcon: document.getElementById('ai-collapse-icon'),
      body: document.getElementById('ai-body'),
      prompt: document.getElementById('ai-prompt'),
      btnGenerate: document.getElementById('btn-ai-generate'),
      btnModify: document.getElementById('btn-ai-modify'),
      btnFix: document.getElementById('btn-ai-fix'),
      btnCancel: document.getElementById('btn-ai-cancel'),
      status: document.getElementById('ai-status'),
      explanation: document.getElementById('ai-explanation')
    };

    this.bindEvents();
  }

  bindEvents() {
    const { header, btnGenerate, btnModify, btnFix, btnCancel, prompt } = this.dom;

    header.addEventListener('click', () => this.toggleCollapse());
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleCollapse();
      }
    });

    btnGenerate.addEventListener('click', () => this.run('generate'));
    btnModify.addEventListener('click', () => this.run('modify'));
    btnFix.addEventListener('click', () => this.run('fix'));
    btnCancel.addEventListener('click', () => this.cancel());

    // Cmd/Ctrl+Enter submits as a generate (or modify if there's code).
    prompt.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const hasCode = this.editor.getValue().trim().length > 0;
        this.run(hasCode ? 'modify' : 'generate');
      }
    });
  }

  toggleCollapse() {
    const collapsed = this.dom.wrapper.classList.toggle('collapsed');
    this.dom.header.setAttribute('aria-expanded', String(!collapsed));
  }

  /** Enable/disable the Fix button based on whether the model currently errors. */
  refreshErrorState() {
    const err = this.getLastError ? this.getLastError() : null;
    this.dom.btnFix.disabled = !err;
  }

  async run(mode) {
    if (this.controller) return; // a request is already in flight

    const promptText = this.dom.prompt.value.trim();
    const currentCode = this.editor.getValue();
    const error = this.getLastError ? this.getLastError() : null;

    // Client-side guards mirror the server validation for nicer UX.
    if (mode === 'generate' && !promptText) {
      return this.setStatus('Describe the model you want first.', 'error');
    }
    if (mode === 'modify') {
      if (!currentCode.trim()) {
        return this.setStatus('Nothing to modify — generate a model first.', 'error');
      }
      if (!promptText) {
        return this.setStatus('Describe the change you want.', 'error');
      }
    }
    if (mode === 'fix' && !error) {
      return this.setStatus('No render error to fix.', 'error');
    }

    // Confirm before overwriting non-trivial existing work on generate.
    if (mode === 'generate' && currentCode.trim().length > 0) {
      const ok = window.confirm('Generate will replace the current script. Continue?');
      if (!ok) return;
    }

    const payload = { mode, prompt: promptText };
    if (mode === 'modify' || mode === 'fix') payload.currentCode = currentCode;
    if (mode === 'fix') payload.error = error;

    this.controller = new AbortController();
    this.setLoading(true, mode);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: this.controller.signal
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status}).`);
      }
      if (!data.code) {
        throw new Error('The AI did not return any code. Try rephrasing.');
      }

      this.editor.setValue(data.code);
      this.executeCode();

      if (data.explanation) {
        this.showExplanation(data.explanation);
      } else {
        this.hideExplanation();
      }
      this.setStatus('Done. Model updated.', 'ok');
    } catch (err) {
      if (err.name === 'AbortError') {
        this.setStatus('Cancelled.', null);
      } else {
        this.setStatus(err.message || 'AI request failed.', 'error');
      }
    } finally {
      this.controller = null;
      this.setLoading(false);
      this.refreshErrorState();
    }
  }

  cancel() {
    if (this.controller) {
      this.controller.abort();
    }
  }

  setLoading(isLoading, mode) {
    const { btnGenerate, btnModify, btnFix, btnCancel } = this.dom;
    btnGenerate.disabled = isLoading;
    btnModify.disabled = isLoading;
    btnCancel.classList.toggle('hidden', !isLoading);

    if (isLoading) {
      btnFix.disabled = true;
      const label = mode === 'fix' ? 'Fixing' : mode === 'modify' ? 'Modifying' : 'Generating';
      this.setStatus(`${label}…`, 'loading');
    } else {
      this.refreshErrorState();
    }
  }

  setStatus(message, kind) {
    const { status } = this.dom;
    status.classList.remove('hidden', 'is-error', 'is-loading');
    if (!message) {
      status.classList.add('hidden');
      status.innerHTML = '';
      return;
    }
    if (kind === 'error') status.classList.add('is-error');
    if (kind === 'loading') status.classList.add('is-loading');

    status.innerHTML = '';
    if (kind === 'loading') {
      const spinner = document.createElement('span');
      spinner.className = 'ai-spinner';
      status.appendChild(spinner);
    }
    status.appendChild(document.createTextNode(message));
  }

  showExplanation(text) {
    this.dom.explanation.textContent = text;
    this.dom.explanation.classList.remove('hidden');
  }

  hideExplanation() {
    this.dom.explanation.classList.add('hidden');
    this.dom.explanation.textContent = '';
  }
}
