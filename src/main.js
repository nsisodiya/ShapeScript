import { StorageManager } from './storage/storage.js';
import { CodeEditor } from './editor/editor.js';
import { Viewport } from './viewer/viewer.js';
import { Examples } from './examples/examples.js';
import { exportBinarySTL } from './export/stl.js';
import { AIAssistant } from './ai/assistant.js';

// Application State
let currentFileId = null;
let currentFileName = '';
let activePositions = null;
let activeNormals = null;
let controlValues = {}; // Active slider/checkbox values

// UI Components
let editor = null;
let viewer = null;
let worker = null;
let debounceTimer = null;
let aiAssistant = null;

// Current render error (null when the model is valid). Consumed by the AI "Fix" flow.
let lastError = null;

// DOM Elements
const fileSelector = document.getElementById('file-selector');
const btnNewFile = document.getElementById('btn-new-file');
const btnRenameFile = document.getElementById('btn-rename-file');
const btnDeleteFile = document.getElementById('btn-delete-file');
const btnSave = document.getElementById('btn-save');
const exampleSelector = document.getElementById('example-selector');
const btnResetCamera = document.getElementById('btn-reset-camera');
const btnDownloadStl = document.getElementById('btn-download-stl');
const renderStatus = document.getElementById('render-status');
const statusErrorContainer = document.getElementById('status-error-container');
const errorMessage = document.getElementById('error-message');
const triangleCountVal = document.getElementById('triangle-count');
const renderTimeVal = document.getElementById('render-time');
const saveStatus = document.getElementById('save-status');

// Initialize the Application
function initApp() {
  // 1. Bootstrap storage and load active file
  currentFileId = StorageManager.bootstrap();
  
  // 2. Initialize Monaco Editor
  editor = new CodeEditor('editor-container');
  const code = StorageManager.getFileCode(currentFileId);
  editor.setValue(code);
  
  // 3. Initialize Three.js Viewport
  viewer = new Viewport('viewport-container');
  
  // 4. Load file dropdowns
  refreshFileList();
  
  // Update state values
  const files = StorageManager.getFiles();
  const activeFile = files.find(f => f.id === currentFileId);
  currentFileName = activeFile ? activeFile.name : 'Untitled Script';

  // 5. Setup Drag Resizing
  setupResizer();

  // 6. Bind Event Listeners
  bindEvents();

  // 7. Initialize AI Assistant
  aiAssistant = new AIAssistant({
    editor,
    executeCode,
    getLastError: () => lastError
  });

  // 8. Initial Render
  executeCode();
}

// Populate file selector dropdown
function refreshFileList() {
  fileSelector.innerHTML = '';
  const files = StorageManager.getFiles();
  
  // Sort files by last modified timestamp (newest first)
  files.sort((a, b) => b.lastModified - a.lastModified);
  
  files.forEach(file => {
    const option = document.createElement('option');
    option.value = file.id;
    option.textContent = file.name;
    if (file.id === currentFileId) {
      option.selected = true;
    }
    fileSelector.appendChild(option);
  });
}

// Bind all UI interaction listeners
function bindEvents() {
  // File switching
  fileSelector.onchange = (e) => {
    switchToFile(e.target.value);
  };
  
  // New File
  btnNewFile.onclick = () => {
    const name = prompt("Enter a name for the new ShapeScript file:");
    if (name && name.trim()) {
      const defaultCode = `// New ShapeScript Script\n\nreturn cube(20);\n`;
      const id = StorageManager.createFile(name, defaultCode);
      controlValues = {}; // reset controls
      currentFileId = id;
      refreshFileList();
      
      const code = StorageManager.getFileCode(id);
      editor.setValue(code);
      executeCode();
    }
  };
  
  // Rename File
  btnRenameFile.onclick = () => {
    const newName = prompt("Rename file to:", currentFileName);
    if (newName && newName.trim() && newName.trim() !== currentFileName) {
      StorageManager.renameFile(currentFileId, newName);
      currentFileName = newName.trim();
      refreshFileList();
    }
  };
  
  // Delete File
  btnDeleteFile.onclick = () => {
    const files = StorageManager.getFiles();
    if (files.length <= 1) {
      alert("You must have at least one file. Cannot delete the only remaining file.");
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${currentFileName}"? This action cannot be undone.`)) {
      StorageManager.deleteFile(currentFileId);
      controlValues = {}; // Reset values
      currentFileId = StorageManager.getActiveFileId();
      refreshFileList();
      
      const code = StorageManager.getFileCode(currentFileId);
      editor.setValue(code);
      executeCode();
    }
  };

  // Explicit Save
  btnSave.onclick = () => {
    const code = editor.getValue();
    StorageManager.saveFileCode(currentFileId, code);
    saveStatus.textContent = 'Saved';
    saveStatus.classList.remove('saving');
    
    // Explicit click triggers a manual rebuild immediately
    executeCode();
  };

  // Examples loading
  exampleSelector.onchange = (e) => {
    const exampleKey = e.target.value;
    const example = Examples[exampleKey];
    if (example) {
      if (confirm(`Load example "${example.name}"? This will overwrite the current code in "${currentFileName}".`)) {
        controlValues = {}; // Reset controls
        editor.setValue(example.code);
        executeCode();
      }
      e.target.value = ''; // Reset selector
    }
  };

  // Camera reset
  btnResetCamera.onclick = () => {
    viewer.resetCamera();
  };


  // STL Download
  btnDownloadStl.onclick = () => {
    if (!activePositions || activePositions.length === 0) {
      alert("No rendered 3D geometry available to export. Fix any errors first.");
      return;
    }
    
    try {
      const blob = exportBinarySTL(activePositions, activeNormals);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const safeName = currentFileName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      link.download = `shapescript_${safeName}.stl`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Defer revocation to let asynchronous browser download manager resolve blob
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 250);
    } catch (err) {
      alert(`STL export failed: ${err.message}`);
    }
  };

  // Monaco Editor Change callback (2000ms debounced execution)
  editor.onChange((code) => {
    saveStatus.textContent = 'Saving...';
    saveStatus.classList.add('saving');
    
    // Trigger auto-save to storage
    StorageManager.saveFileCode(currentFileId, code);
    
    // Debounce rendering
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      saveStatus.textContent = 'Saved';
      saveStatus.classList.remove('saving');
      executeCode();
    }, 2000);
  });

  // Watch window resize
  window.addEventListener('resize', () => {
    viewer.resize();
  });
}

// Switch between workspace scripts
function switchToFile(id) {
  currentFileId = id;
  StorageManager.setActiveFileId(id);
  
  const files = StorageManager.getFiles();
  const file = files.find(f => f.id === id);
  currentFileName = file ? file.name : 'Untitled Script';
  
  // Clear parametric control values when switching file contexts
  controlValues = {};
  
  const code = StorageManager.getFileCode(id);
  editor.setValue(code);
  
  // Execute immediately
  executeCode();
}

// Setup Resizer splitter drag operations
function setupResizer() {
  const resizer = document.getElementById('pane-resizer');
  const leftPane = document.getElementById('left-pane');
  const rightPane = document.getElementById('right-pane');
  
  let isDragging = false;
  
  resizer.addEventListener('mousedown', () => {
    isDragging = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const containerW = document.body.clientWidth;
    let percentage = (e.clientX / containerW) * 100;
    
    // Limits
    percentage = Math.max(15, Math.min(85, percentage));
    
    leftPane.style.width = `${percentage}%`;
    resizer.setAttribute('aria-valuenow', Math.round(percentage));
    
    // Notify Monaco and Three.js to adjust to new bounds
    editor.layout();
    viewer.resize();
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// Execute user code inside Web Worker
function executeCode() {
  const code = editor.getValue();
  
  // Clear any existing debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  // Terminate active worker to cancel any pending rendering
  if (worker) {
    worker.terminate();
  }
  
  updateStatus('rendering', 'Rendering...');
  
  // Initialize worker using standard Vite syntax
  worker = new Worker(new URL('./worker/worker.js', import.meta.url), { type: 'module' });
  
  // Post data to worker
  worker.postMessage({
    code,
    controlValues
  });
  
  worker.onmessage = (e) => {
    const result = e.data;
    
    if (result.success) {
      const { positions, normals, colors, registeredControls, renderTimeMs, triangleCount } = result;
      
      // Clear red editor markers
      lastError = null;
      editor.clearErrors();
      hideErrorPanel();
      if (aiAssistant) aiAssistant.refreshErrorState();
      
      // Update canvas geometry
      viewer.updateGeometry(positions, normals, colors);
      
      // Update active buffers for STL download
      activePositions = positions;
      activeNormals = normals;
      
      // Update UI Status
      updateStatus('success', 'Render Successful');
      triangleCountVal.textContent = triangleCount.toLocaleString();
      renderTimeVal.textContent = `${Math.round(renderTimeMs)}ms`;
      
      // Render controls
      renderControlsPanel(registeredControls);
    } else {
      // Rebuild failed
      const { message, line } = result.error;
      
      lastError = { message, line: line || null };
      updateStatus('failed', 'Render Failed');
      showErrorPanel(message, line);
      if (aiAssistant) aiAssistant.refreshErrorState();
      
      // Show squiggle in Monaco editor on the exact line
      if (line) {
        editor.showError(message, line);
      }
    }
  };
  
  worker.onerror = (err) => {
    lastError = { message: err.message, line: null };
    updateStatus('failed', 'Execution Error');
    showErrorPanel(err.message);
    if (aiAssistant) aiAssistant.refreshErrorState();
  };
}

// Update bottom status bar values
function updateStatus(state, text) {
  renderStatus.className = `status-value status-${state}`;
  renderStatus.textContent = text;
}

// Display error in the status bar
function showErrorPanel(message, line) {
  statusErrorContainer.classList.remove('hidden');
  errorMessage.textContent = line ? `Line ${line}: ${message}` : message;
}

// Hide error display
function hideErrorPanel() {
  statusErrorContainer.classList.add('hidden');
}

// Render dynamic parametric controls
function renderControlsPanel(controls) {
  const panel = document.getElementById('controls-panel');
  
  if (!controls || controls.length === 0) {
    panel.innerHTML = '<p class="no-controls-msg">No dynamic controls registered. Use <code>slider()</code>, <code>checkbox()</code>, or <code>select()</code> in your script.</p>';
    return;
  }
  
  panel.innerHTML = '';
  
  controls.forEach(c => {
    const row = document.createElement('div');
    row.className = 'control-row';
    
    const label = document.createElement('span');
    label.className = 'control-label';
    label.title = c.name;
    label.textContent = c.name;
    row.appendChild(label);
    
    // Backfill value in controlValues state
    if (controlValues[c.name] === undefined) {
      controlValues[c.name] = c.defaultValue;
    }
    const currentVal = controlValues[c.name];
    
    if (c.type === 'slider') {
      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'control-slider';
      input.min = c.min;
      input.max = c.max;
      input.value = currentVal;
      
      const valDisplay = document.createElement('span');
      valDisplay.className = 'control-value';
      valDisplay.textContent = currentVal;
      
      input.oninput = (e) => {
        const val = Number(e.target.value);
        valDisplay.textContent = val;
        controlValues[c.name] = val;
        
        // Execute immediately (cancels typing debounce)
        executeCode();
      };
      
      row.appendChild(input);
      row.appendChild(valDisplay);
    } else if (c.type === 'checkbox') {
      row.classList.add('checkbox-row');
      
      const wrapper = document.createElement('div');
      wrapper.className = 'control-checkbox-wrapper';
      
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'control-checkbox';
      input.checked = currentVal;
      
      input.onchange = (e) => {
        controlValues[c.name] = e.target.checked;
        executeCode();
      };
      
      wrapper.appendChild(input);
      row.appendChild(wrapper);
    } else if (c.type === 'select') {
      const wrapper = document.createElement('div');
      wrapper.className = 'select-wrapper';
      
      const selectEl = document.createElement('select');
      c.options.forEach(opt => {
        const optEl = document.createElement('option');
        optEl.value = opt;
        optEl.textContent = opt;
        if (opt === currentVal) {
          optEl.selected = true;
        }
        selectEl.appendChild(optEl);
      });
      
      selectEl.onchange = (e) => {
        controlValues[c.name] = e.target.value;
        executeCode();
      };
      
      wrapper.appendChild(selectEl);
      row.appendChild(wrapper);
      
      // Empty element to maintain grid alignment
      const spacer = document.createElement('span');
      row.appendChild(spacer);
    } else if (c.type === 'colorPicker') {
      const wrapper = document.createElement('div');
      wrapper.className = 'color-picker-wrapper';

      // Native color swatch input
      const input = document.createElement('input');
      input.type = 'color';
      input.className = 'control-color-input';
      input.value = currentVal || c.defaultValue || '#ffffff';

      // Hex label next to the swatch
      const hexLabel = document.createElement('span');
      hexLabel.className = 'control-color-hex';
      hexLabel.textContent = input.value.toUpperCase();

      // oninput: update the live hex label while the picker is open (no re-render!)
      input.oninput = (e) => {
        hexLabel.textContent = e.target.value.toUpperCase();
      };

      // onchange: fires when the user CLOSES/CONFIRMS the color dialog — safe to re-render
      input.onchange = (e) => {
        const val = e.target.value;
        hexLabel.textContent = val.toUpperCase();
        controlValues[c.name] = val;
        executeCode();
      };

      wrapper.appendChild(input);
      wrapper.appendChild(hexLabel);
      row.appendChild(wrapper);

      // Spacer to maintain grid alignment
      const spacer2 = document.createElement('span');
      row.appendChild(spacer2);
    }
    
    panel.appendChild(row);
  });
}

// Start application when DOM loads
window.addEventListener('DOMContentLoaded', initApp);
