# ShapeScript — AGENTS.md

## Dev commands

```bash
npm install        # install deps (monaco-editor, three, vite)
npm run dev        # vite dev server → http://localhost:3000
npm run build      # production build → dist/
npm run preview    # preview production build
```

No test/lint/typecheck/formatting tooling is configured.

## Architecture

- **Entrypoint:** `index.html` → `src/main.js` (vanilla JS, no framework)
- **CSG engine** (BSP-tree-based): `src/api/csg.js` — the most complex file; implements `cube`, `sphere`, `cylinder`, `cone`, `torus` primitives, Boolean ops (`union`/`subtract`/`intersect`), and chainable transforms (`move`, `rotate`, `scale`, `mirror`)
- **User code** runs inside a **Web Worker** (`src/worker/worker.js`) via ES module worker syntax: `new Worker(new URL('./worker/worker.js', import.meta.url), { type: 'module' })`. Worker is terminated on each re-execution. Line numbers in error reports subtract 2 (Function constructor wrapper offset).
- **API surface** exposed to user scripts: `cube`, `box`, `sphere`, `cylinder`, `cone`, `torus`, `union`, `subtract`, `intersect`, `move`, `rotate`, `scale`, `mirror`, `slider`, `checkbox`, `select` — all registered on `globalThis` inside the worker.
- **Rendering debounce:** 2000ms after last keystroke. Parametric controls (`slider`/`checkbox`/`select` changes) trigger **immediate** re-execution, cancelling any pending timer.
- **Storage:** `localStorage`-based filesystem via `src/storage/storage.js`. Auto-save on every keystroke.
- **STL export:** `src/export/stl.js` — uses `Transferable ArrayBuffers` from worker → main thread.

## Key patterns

- User script **must** return a CSG object (`return cube(20);`). Worker validates result is an `instanceof CSG`.
- 100% client-side, offline-first. No backend, no API routes, no database.
- No routing — single-page `index.html` + `tutorial.html`.
- `dist/` is gitignored (Vite build output).
