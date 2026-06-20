import { CSG } from '../api/csg.js';

let registeredControls = [];
let currentControlValues = {};

// Expose ShapeScript API functions in the worker global scope
globalThis.cube = (...args) => {
  let w, d, h;
  if (args.length === 0) {
    w = d = h = 1;
  } else if (args.length === 1) {
    w = d = h = args[0];
  } else {
    [w, d, h] = args;
  }
  return CSG.cube({
    center: [w / 2, d / 2, h / 2],
    radius: [w / 2, d / 2, h / 2]
  });
};

globalThis.box = (w, d, h) => {
  return globalThis.cube(w, d, h);
};

globalThis.sphere = (radius) => {
  return CSG.sphere({
    center: [0, 0, 0],
    radius: radius !== undefined ? radius : 1,
    slices: 24,
    stacks: 12
  });
};

globalThis.cylinder = (radius, height) => {
  return CSG.cylinder({
    start: [0, 0, 0],
    end: [0, 0, height !== undefined ? height : 1],
    radius: radius !== undefined ? radius : 1,
    slices: 24
  });
};

globalThis.cone = (radiusTop, radiusBottom, height) => {
  return CSG.cone({
    start: [0, 0, 0],
    end: [0, 0, height !== undefined ? height : 1],
    radiusBottom: radiusBottom !== undefined ? radiusBottom : 1,
    radiusTop: radiusTop !== undefined ? radiusTop : 0,
    slices: 24
  });
};

globalThis.torus = (radius, tubeRadius) => {
  return CSG.torus({
    radius: radius !== undefined ? radius : 1,
    tubeRadius: tubeRadius !== undefined ? tubeRadius : 0.2,
    radialSlices: 24,
    tubularSlices: 12
  });
};

// Operations
globalThis.union = (...objects) => {
  if (objects.length === 0) return CSG.fromPolygons([]);
  let result = objects[0];
  if (!(result instanceof CSG)) {
    throw new Error("union() arguments must be CSG objects");
  }
  for (let i = 1; i < objects.length; i++) {
    if (!(objects[i] instanceof CSG)) {
      throw new Error("union() arguments must be CSG objects");
    }
    result = result.union(objects[i]);
  }
  return result;
};

globalThis.subtract = (base, ...objects) => {
  if (!(base instanceof CSG)) {
    throw new Error("subtract() base argument must be a CSG object");
  }
  let result = base;
  for (let i = 0; i < objects.length; i++) {
    if (!(objects[i] instanceof CSG)) {
      throw new Error("subtract() subtraction arguments must be CSG objects");
    }
    result = result.subtract(objects[i]);
  }
  return result;
};

globalThis.intersect = (...objects) => {
  if (objects.length === 0) return CSG.fromPolygons([]);
  let result = objects[0];
  if (!(result instanceof CSG)) {
    throw new Error("intersect() arguments must be CSG objects");
  }
  for (let i = 1; i < objects.length; i++) {
    if (!(objects[i] instanceof CSG)) {
      throw new Error("intersect() arguments must be CSG objects");
    }
    result = result.intersect(objects[i]);
  }
  return result;
};

// Color: cube(20).color(1, 0.3, 0.2) or cube(20).color(255, 80, 50)
globalThis.color = (shape, r, g, b) => {
  if (!(shape instanceof CSG)) throw new Error("color() first argument must be a CSG object");
  return shape.color(r, g, b);
};

// Parametric controls registration and read hooks
globalThis.slider = (name, defaultValue, min, max) => {
  // Ensure the control is registered
  if (!registeredControls.some(c => c.name === name)) {
    registeredControls.push({ name, type: 'slider', defaultValue, min, max });
  }
  // Return changed value if exists, else default
  if (currentControlValues[name] !== undefined) {
    return Number(currentControlValues[name]);
  }
  return defaultValue;
};

globalThis.checkbox = (name, defaultValue) => {
  if (!registeredControls.some(c => c.name === name)) {
    registeredControls.push({ name, type: 'checkbox', defaultValue });
  }
  if (currentControlValues[name] !== undefined) {
    return Boolean(currentControlValues[name]);
  }
  return !!defaultValue;
};

globalThis.select = (name, defaultValue, options) => {
  if (!registeredControls.some(c => c.name === name)) {
    registeredControls.push({ name, type: 'select', defaultValue, options });
  }
  if (currentControlValues[name] !== undefined) {
    return currentControlValues[name];
  }
  return defaultValue;
};

// colorPicker(name, defaultHex) returns a CSS hex string like '#ff4400'.
// Use it directly with .color(): cube(20).color(colorPicker("Body", '#3399ff'))
globalThis.colorPicker = (name, defaultValue) => {
  const def = defaultValue || '#ffffff';
  if (!registeredControls.some(c => c.name === name)) {
    registeredControls.push({ name, type: 'colorPicker', defaultValue: def });
  }
  if (currentControlValues[name] !== undefined) {
    return String(currentControlValues[name]);
  }
  return def;
};


self.onmessage = function(e) {
  const { code, controlValues } = e.data;
  
  registeredControls = [];
  currentControlValues = controlValues || {};

  try {
    const startTime = performance.now();
    
    // Execute the user code
    // We wrap it in a function constructor so we can execute it in an isolated scope.
    // We use Function instead of eval so return statements are valid.
    const runCode = new Function(code);
    const model = runCode();
    
    if (!model) {
      throw new Error("The script must return a model (e.g., return cube(20);)");
    }
    if (!(model instanceof CSG)) {
      throw new Error("The returned object is not a valid CSG model. Check your return statement.");
    }
    
    const renderTimeMs = performance.now() - startTime;
    
    // Perform polygon triangulation to prepare WebGL buffers
    const polygons = model.toPolygons();
    let numVertices = 0;
    
    for (let i = 0; i < polygons.length; i++) {
      numVertices += (polygons[i].vertices.length - 2) * 3;
    }
    
    const positions = new Float32Array(numVertices * 3);
    const normals = new Float32Array(numVertices * 3);
    const colors = new Float32Array(numVertices * 3);
    
    // Default grey for uncolored polygons
    const DEFAULT_R = 0.878, DEFAULT_G = 0.878, DEFAULT_B = 0.878;
    
    let vIdx = 0;
    for (let i = 0; i < polygons.length; i++) {
      const poly = polygons[i];
      const verts = poly.vertices;
      const numV = verts.length;
      
      // Resolve color for this polygon
      const col = poly.shared;
      const cr = col ? col.r : DEFAULT_R;
      const cg = col ? col.g : DEFAULT_G;
      const cb = col ? col.b : DEFAULT_B;
      
      // Convex polygon triangulation using fan method
      for (let j = 1; j < numV - 1; j++) {
        const v0 = verts[0];
        const v1 = verts[j];
        const v2 = verts[j + 1];
        
        positions[vIdx * 3]     = v0.pos.x;
        positions[vIdx * 3 + 1] = v0.pos.y;
        positions[vIdx * 3 + 2] = v0.pos.z;
        normals[vIdx * 3]       = v0.normal.x;
        normals[vIdx * 3 + 1]   = v0.normal.y;
        normals[vIdx * 3 + 2]   = v0.normal.z;
        colors[vIdx * 3]        = cr;
        colors[vIdx * 3 + 1]    = cg;
        colors[vIdx * 3 + 2]    = cb;
        vIdx++;
        
        positions[vIdx * 3]     = v1.pos.x;
        positions[vIdx * 3 + 1] = v1.pos.y;
        positions[vIdx * 3 + 2] = v1.pos.z;
        normals[vIdx * 3]       = v1.normal.x;
        normals[vIdx * 3 + 1]   = v1.normal.y;
        normals[vIdx * 3 + 2]   = v1.normal.z;
        colors[vIdx * 3]        = cr;
        colors[vIdx * 3 + 1]    = cg;
        colors[vIdx * 3 + 2]    = cb;
        vIdx++;
        
        positions[vIdx * 3]     = v2.pos.x;
        positions[vIdx * 3 + 1] = v2.pos.y;
        positions[vIdx * 3 + 2] = v2.pos.z;
        normals[vIdx * 3]       = v2.normal.x;
        normals[vIdx * 3 + 1]   = v2.normal.y;
        normals[vIdx * 3 + 2]   = v2.normal.z;
        colors[vIdx * 3]        = cr;
        colors[vIdx * 3 + 1]    = cg;
        colors[vIdx * 3 + 2]    = cb;
        vIdx++;
      }
    }
    
    // Send buffers back with zero-copy Transferable ArrayBuffers
    self.postMessage({
      success: true,
      positions,
      normals,
      colors,
      registeredControls,
      renderTimeMs,
      triangleCount: numVertices / 3
    }, [positions.buffer, normals.buffer, colors.buffer]);
    
  } catch (err) {
    // Parse line numbers from the error stack trace
    let line = null;
    if (err.stack) {
      // Browsers report line numbers inside Function objects in different ways
      // Chrome/V8: at anonymous (eval at <anonymous>, <anonymous>:10:15)
      // Firefox: Function:10:15
      const match = err.stack.match(/<anonymous>:(\d+)/) || 
                    err.stack.match(/Function:(\d+)/) ||
                    err.stack.match(/:(\d+):(\d+)/);
      if (match) {
        // new Function() wraps code in a function header:
        // function anonymous() {
        //   userCode
        // }
        // Thus, line 1 is function header, line 2 is first line of userCode.
        // We subtract 2 to map back to userCode, capped at 1.
        line = Math.max(1, parseInt(match[1]) - 2);
      }
    }
    
    self.postMessage({
      success: false,
      error: {
        message: err.message,
        line: line
      }
    });
  }
};
