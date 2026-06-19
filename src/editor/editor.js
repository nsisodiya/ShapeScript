import * as monaco from 'monaco-editor';
import 'monaco-editor/min/vs/editor/editor.main.css';

// Configure Monaco Editor Workers for Vite
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  }
};

export class CodeEditor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Editor container #${containerId} not found.`);
    }

    this.instance = null;
    this.init();
  }

  init() {
    this.instance = monaco.editor.create(this.container, {
      value: '',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', Consolas, monospace",
      minimap: { enabled: false },
      lineNumbersMinChars: 3,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: false,
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8
      },
      fixedOverflowWidgets: true
    });

    // Provide default autocomplete definitions for ShapeScript API
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true, // We execute raw script, so don't flag TS typings as errors
      noSyntaxValidation: false
    });

    // Register autocomplete suggestions for our global functions
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          // Primitives
          { label: 'cube', kind: monaco.languages.CompletionItemKind.Function, insertText: 'cube(${1:size})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'cube(size) or cube(w, d, h)' },
          { label: 'box', kind: monaco.languages.CompletionItemKind.Function, insertText: 'box(${1:w}, ${2:d}, ${3:h})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'box(w, d, h) - alias for cube' },
          { label: 'sphere', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sphere(${1:radius})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'sphere(radius)' },
          { label: 'cylinder', kind: monaco.languages.CompletionItemKind.Function, insertText: 'cylinder(${1:radius}, ${2:height})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'cylinder(radius, height)' },
          { label: 'cone', kind: monaco.languages.CompletionItemKind.Function, insertText: 'cone(${1:radiusTop}, ${2:radiusBottom}, ${3:height})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'cone(rTop, rBottom, height)' },
          { label: 'torus', kind: monaco.languages.CompletionItemKind.Function, insertText: 'torus(${1:radius}, ${2:tubeRadius})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'torus(radius, tubeRadius)' },
          
          // Operations
          { label: 'union', kind: monaco.languages.CompletionItemKind.Function, insertText: 'union(${1:obj1}, ${2:obj2})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'union(...objects)' },
          { label: 'subtract', kind: monaco.languages.CompletionItemKind.Function, insertText: 'subtract(${1:base}, ${2:obj})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'subtract(base, ...objects)' },
          { label: 'intersect', kind: monaco.languages.CompletionItemKind.Function, insertText: 'intersect(${1:obj1}, ${2:obj2})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'intersect(...objects)' },
          
          // Transforms (as chainable methods)
          { label: 'move', kind: monaco.languages.CompletionItemKind.Method, insertText: 'move(${1:x}, ${2:y}, ${3:z})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: '.move(x, y, z) - translate' },
          { label: 'scale', kind: monaco.languages.CompletionItemKind.Method, insertText: 'scale(${1:sx}, ${2:sy}, ${3:sz})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: '.scale(sx, sy, sz) - scale factor' },
          { label: 'rotate', kind: monaco.languages.CompletionItemKind.Method, insertText: 'rotate(${1:rx}, ${2:ry}, ${3:rz})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: '.rotate(rx, ry, rz) - rotate in degrees' },
          { label: 'mirror', kind: monaco.languages.CompletionItemKind.Method, insertText: "mirror('${1:x}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: ".mirror('x'|'y'|'z') - mirror plane" },

          // Controls
          { label: 'slider', kind: monaco.languages.CompletionItemKind.Function, insertText: "slider('${1:Name}', ${2:defaultValue}, ${3:min}, ${4:max})", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "slider(name, default, min, max)" },
          { label: 'checkbox', kind: monaco.languages.CompletionItemKind.Function, insertText: "checkbox('${1:Name}', ${2:true})", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "checkbox(name, default)" },
          { label: 'select', kind: monaco.languages.CompletionItemKind.Function, insertText: "select('${1:Name}', '${2:default}', [${3:options}])", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "select(name, default, optionsArray)" }
        ];

        return { suggestions: suggestions };
      }
    });
  }

  getValue() {
    return this.instance.getValue();
  }

  setValue(value) {
    this.instance.setValue(value);
  }

  onChange(callback) {
    this.instance.onDidChangeModelContent(() => {
      callback(this.getValue());
    });
  }

  // Highlight runtime/syntax errors directly on the Monaco gutters
  showError(message, line) {
    if (!line) return;
    const model = this.instance.getModel();
    const marker = {
      severity: monaco.MarkerSeverity.Error,
      message: message,
      startLineNumber: line,
      startColumn: 1,
      endLineNumber: line,
      endColumn: model.getLineMaxColumn(line)
    };
    monaco.editor.setModelMarkers(model, 'shapescript', [marker]);
  }

  clearErrors() {
    const model = this.instance.getModel();
    monaco.editor.setModelMarkers(model, 'shapescript', []);
  }

  layout() {
    if (this.instance) {
      this.instance.layout();
    }
  }
}
