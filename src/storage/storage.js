const FILES_LIST_KEY = 'shapescript_files';
const ACTIVE_FILE_KEY = 'shapescript_active_file_id';
const FILE_CODE_PREFIX = 'shapescript_file_code_';

const DEFAULT_WELCOME_CODE = `// Welcome to ShapeScript!
// Write pure JavaScript to generate 3D models for 3D printing.

const width = slider("Width", 40, 20, 80);
const depth = slider("Depth", 40, 20, 80);
const height = slider("Height", 30, 10, 60);
const holeRadius = slider("Hole Radius", 12, 5, 25);
const showHole = checkbox("Cut Hole", true);

const outer = box(width, depth, height);
const cyl = cylinder(holeRadius, height + 10).move(width / 2, depth / 2, -5);

if (showHole) {
  return subtract(outer, cyl);
} else {
  return outer;
}
`;

export const StorageManager = {
  getFiles() {
    const listJson = localStorage.getItem(FILES_LIST_KEY);
    if (!listJson) return [];
    try {
      return JSON.parse(listJson);
    } catch (e) {
      return [];
    }
  },

  saveFilesList(files) {
    localStorage.setItem(FILES_LIST_KEY, JSON.stringify(files));
  },

  getActiveFileId() {
    return localStorage.getItem(ACTIVE_FILE_KEY);
  },

  setActiveFileId(id) {
    if (id) {
      localStorage.setItem(ACTIVE_FILE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_FILE_KEY);
    }
  },

  getFileCode(id) {
    return localStorage.getItem(`${FILE_CODE_PREFIX}${id}`) || '';
  },

  saveFileCode(id, code) {
    localStorage.setItem(`${FILE_CODE_PREFIX}${id}`, code);
    
    // Update lastModified timestamp
    const files = this.getFiles();
    const file = files.find(f => f.id === id);
    if (file) {
      file.lastModified = Date.now();
      this.saveFilesList(files);
    }
  },

  createFile(name, code = '') {
    const files = this.getFiles();
    const id = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    files.push({
      id,
      name: name.trim() || 'Untitled Script',
      lastModified: Date.now()
    });
    this.saveFilesList(files);
    this.saveFileCode(id, code);
    this.setActiveFileId(id);
    return id;
  },

  renameFile(id, newName) {
    const files = this.getFiles();
    const file = files.find(f => f.id === id);
    const cleanedName = newName.trim();
    if (file && cleanedName) {
      file.name = cleanedName;
      file.lastModified = Date.now();
      this.saveFilesList(files);
      return true;
    }
    return false;
  },

  deleteFile(id) {
    let files = this.getFiles();
    files = files.filter(f => f.id !== id);
    this.saveFilesList(files);
    localStorage.removeItem(`${FILE_CODE_PREFIX}${id}`);

    // If we deleted the active file, switch to the first remaining file
    if (this.getActiveFileId() === id) {
      if (files.length > 0) {
        this.setActiveFileId(files[0].id);
      } else {
        this.setActiveFileId(null);
      }
    }
  },

  // Make sure we have at least one file on startup
  bootstrap() {
    const files = this.getFiles();
    if (files.length === 0) {
      // Create default file
      const defaultId = this.createFile('Welcome Model', DEFAULT_WELCOME_CODE);
      this.setActiveFileId(defaultId);
      return defaultId;
    }
    
    // Validate active file
    let activeId = this.getActiveFileId();
    if (!activeId || !files.some(f => f.id === activeId)) {
      activeId = files[0].id;
      this.setActiveFileId(activeId);
    }
    return activeId;
  }
};
