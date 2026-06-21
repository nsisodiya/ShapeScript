export const Examples = {
  cube: {
    name: 'Cube',
    code: `// Simple Cube Example
// Generates a basic cube centered at [size/2, size/2, size/2]

const size = slider("Cube Size", 25, 10, 80);

return cube(size).color(0.18, 0.71, 0.69); // Vibrant teal
`
  },

  box: {
    name: 'Box',
    code: `// Simple Box Example
// Generates a rectangular box (cuboid)

const w = slider("Width", 50, 10, 100);
const d = slider("Depth", 30, 10, 100);
const h = slider("Height", 20, 10, 100);

return box(w, d, h).color(0.96, 0.51, 0.19); // Warm amber
`
  },

  'phone-stand': {
    name: 'Phone Stand',
    code: `// Parametric Phone Stand
// Sleek support stand for desks with adjustable dimensions

const width = slider("Stand Width", 55, 30, 90);
const depth = slider("Bed Depth", 70, 50, 100);
const angle = slider("Back Angle", 75, 45, 90);
const lipHeight = slider("Lip Height", 15, 10, 30);
const wall = 6; // Stand thickness in mm

// Base Plate
const base = box(width, depth, wall).color(0.22, 0.47, 0.80); // Steel blue

// Back Support
const back = box(width, wall, 65)
  .move(0, depth - wall, 0)
  .rotate(-90 + angle, 0, 0)
  .color(0.15, 0.36, 0.65); // Darker blue

// Front Lip
const lip = box(width, wall * 1.5, lipHeight)
  .move(0, 0, 0)
  .color(0.29, 0.60, 0.93); // Lighter accent blue

// Combine
const stand = union(base, back, lip);

// Adjust height coordinate so it stands on Z=0 plane
return stand.move(0, 0, 0);
`
  },

  hook: {
    name: 'Wall Hook',
    code: `// Parametric Wall Hook
// Custom hook for keys, coats, or tools

const mountWidth = slider("Mount Width", 24, 15, 40);
const mountHeight = slider("Mount Height", 45, 30, 80);
const pegLength = slider("Peg Length", 35, 20, 60);
const pegAngle = slider("Peg Angle", 20, 0, 45);

const wall = 4;

// Back mounting plate — deep red
const plate = box(mountWidth, wall, mountHeight).color(0.85, 0.13, 0.18);

// Hook peg extending outwards (along Y axis) — coral
const peg = box(8, pegLength, 8)
  .move((mountWidth - 8) / 2, -pegLength, 15)
  .rotate(-pegAngle, 0, 0)
  .color(0.95, 0.35, 0.30);

// Stop tip on the end of the peg — lighter accent
const tip = box(8, 6, 14)
  .move((mountWidth - 8) / 2, -pegLength - 6, 12)
  .rotate(-pegAngle, 0, 0)
  .color(1.0, 0.55, 0.45);

return union(plate, peg, tip);
`
  },

  'storage-tray': {
    name: 'Storage Tray',
    code: `// Storage Tray with Compartments
// A divided tray for screws, components, or jewelry

const length = slider("Width (X)", 90, 50, 150);
const width = slider("Depth (Y)", 70, 50, 120);
const height = slider("Height (Z)", 25, 15, 60);
const wall = slider("Wall Thickness", 3.5, 2, 8);
const compartments = select("Compartments", "2x1", ["1x1", "2x1", "3x1", "2x2"]);

const body = box(length, width, height).color(0.18, 0.48, 0.76); // Ocean blue

// Helper function to create hollow cutouts
let cavities = [];

const innerH = height - wall + 2; // Extra height for clean cut

if (compartments === "1x1") {
  const cav = box(length - wall * 2, width - wall * 2, innerH)
    .move(wall, wall, wall);
  cavities.push(cav);
} else if (compartments === "2x1") {
  const cellW = (length - wall * 3) / 2;
  const cellD = width - wall * 2;
  
  const cav1 = box(cellW, cellD, innerH).move(wall, wall, wall);
  const cav2 = box(cellW, cellD, innerH).move(cellW + wall * 2, wall, wall);
  
  cavities.push(cav1, cav2);
} else if (compartments === "3x1") {
  const cellW = (length - wall * 4) / 3;
  const cellD = width - wall * 2;
  
  for (let i = 0; i < 3; i++) {
    const cav = box(cellW, cellD, innerH).move(wall + i * (cellW + wall), wall, wall);
    cavities.push(cav);
  }
} else if (compartments === "2x2") {
  const cellW = (length - wall * 3) / 2;
  const cellD = (width - wall * 3) / 2;
  
  const cav1 = box(cellW, cellD, innerH).move(wall, wall, wall);
  const cav2 = box(cellW, cellD, innerH).move(cellW + wall * 2, wall, wall);
  const cav3 = box(cellW, cellD, innerH).move(wall, cellD + wall * 2, wall);
  const cav4 = box(cellW, cellD, innerH).move(cellW + wall * 2, cellD + wall * 2, wall);
  
  cavities.push(cav1, cav2, cav3, cav4);
}

return subtract(body, ...cavities);
`
  },

  gear: {
    name: 'Gear Maker',
    code: `// Parametric Spurred Gear
// Generates a fully printable mechanical gear using a loop

const teeth = slider("Teeth Count", 12, 6, 24);
const thickness = slider("Gear Thickness", 8, 4, 25);
const centerHole = checkbox("Axle Center Hole", true);

const innerRadius = 24;
const outerRadius = 28;
const toothWidth = 6;

// Central Gear Core — metallic silver-grey
const core = cylinder(innerRadius, thickness).color(0.75, 0.78, 0.82);

let gear = core;

// Add teeth radially — slightly lighter accent
for (let i = 0; i < teeth; i++) {
  const angle = (i * 360) / teeth;
  
  // Single tooth box shifted outward along Y and rotated
  const tooth = box(toothWidth, 12, thickness)
    .move(-toothWidth / 2, innerRadius - 4, 0)
    .rotate(0, 0, angle)
    .color(0.62, 0.65, 0.70);
    
  gear = union(gear, tooth);
}

// Axle Hole Cut
if (centerHole) {
  const hole = cylinder(4.5, thickness + 4).move(0, 0, -2);
  return subtract(gear, hole);
}

return gear;
`
  },

  knob: {
    name: 'Control Knob',
    code: `// Rotary Dial Knob
// A control dial for potentiometers featuring side ridges and D-shaft connector

const radius = slider("Knob Radius", 22, 12, 35);
const height = slider("Knob Height", 18, 10, 30);
const ridgeCount = slider("Ridge Count", 16, 8, 30);

// Base cylinder body — deep violet
const mainBody = cylinder(radius, height).color(0.42, 0.18, 0.72);
let knob = mainBody;

// Create side grip ridges — lighter purple
for (let i = 0; i < ridgeCount; i++) {
  const angle = (i * 360) / ridgeCount;
  const ridge = cylinder(1.5, height)
    .move(radius - 0.75, 0, 0)
    .rotate(0, 0, angle)
    .color(0.62, 0.38, 0.92);
  knob = union(knob, ridge);
}

// Indicator pointer notch on top — bright accent
const indicator = box(3, 8, 4)
  .move(-1.5, radius - 7, height - 3)
  .color(0.98, 0.82, 0.10);
const finalOuter = union(knob, indicator);

// D-shaft mounting hole on the bottom
// Round cylinder shaft of 6mm diameter
const roundShaft = cylinder(3, 12).move(0, 0, -2);
// Flat side of D-Shaft, 4.5mm flat offset (1.5mm cut)
const flatCut = box(10, 10, 12).move(-5, 1.5, -2);

const dShaftHole = subtract(roundShaft, flatCut);

// Subtract shaft hole from knob base
return subtract(finalOuter, dShaftHole);
`
  },

  vase: {
    name: 'Conical Flower Vase',
    code: `// Conical Flower Vase
// A dual conical geometry hollowed out for flowers

const height = slider("Vase Height", 70, 40, 120);
const baseR = slider("Base Radius", 20, 10, 40);
const waistR = slider("Waist Radius", 28, 15, 50);
const lipR = slider("Lip Radius", 22, 10, 40);
const wallThickness = 3;

// 1. Build Outer Body — emerald green
const lowerOuter = cone(waistR, baseR, height / 2).color(0.10, 0.65, 0.42);
const upperOuter = cone(lipR, waistR, height / 2).move(0, 0, height / 2).color(0.14, 0.78, 0.52);
const outer = union(lowerOuter, upperOuter);

// 2. Build Inner Cavity (used for subtraction — color is discarded)
const innerLower = cone(waistR - wallThickness, baseR - wallThickness, height / 2);
const innerUpper = cone(lipR - wallThickness, waistR - wallThickness, height / 2).move(0, 0, height / 2);
const inner = union(innerLower, innerUpper).move(0, 0, wallThickness);

// 3. Subtract to hollow out
return subtract(outer, inner);
`
  },
  'color-demo': {
    name: 'Color Picker Demo',
    code: `// Color Picker Demo
// Shows colorPicker(), hex strings, and multi-part colored models.
// Edit the color swatches in the Controls panel!

const bodyColor = colorPicker('Body Color',   '#3b82f6');
const capColor  = colorPicker('Cap Color',    '#f59e0b');
const pinColor  = colorPicker('Pin Color',    '#22c55e');

const height = slider('Height', 40, 20, 80);
const radius = slider('Radius', 14, 8, 25);

// Main cylinder body — hex color from picker
const body = cylinder(radius, height).color(bodyColor);

// Top cap dome — different picker
const cap = sphere(radius)
  .move(0, 0, height)
  .color(capColor);

// Center pin
const pin = cylinder(3, height + radius + 4)
  .move(0, 0, -2)
  .color(pinColor);

// Hollow out the body
const cavity = cylinder(radius - 3, height - 2).move(0, 0, 2);
const hollowBody = subtract(body, cavity);

return union(hollowBody, cap, pin);
`
  },
  'table': {
    name: 'Table (Group Demo)',
    code: `// Table — demonstrates group() for grouping without merging.
// group() is like TinkerCAD's 'Group': shapes stay independent,
// keep their own colors, and can be transformed together as a unit.

const tableW  = slider('Table Width',  70, 40, 120);
const tableD  = slider('Table Depth',  50, 30, 90);
const tableH  = slider('Table Height', 30, 15, 60);
const legSize = slider('Leg Size',      5,  3, 12);

const topColor = colorPicker('Top Color', '#deb887');
const legColor = colorPicker('Leg Color', '#8b4513');

const topThick = 4;

// Table top
const top = box(tableW, tableD, topThick)
  .move(0, 0, tableH)
  .color(topColor);

// One leg — we reuse it 4 times by positioning
const margin = legSize;
const legHeight = tableH;

const leg = (x, y) =>
  box(legSize, legSize, legHeight)
    .move(x, y, 0)
    .color(legColor);

// Group all parts: transforms on the group affect ALL children
const tableGroup = group(
  top,
  leg(margin,              margin),
  leg(tableW - margin - legSize, margin),
  leg(margin,              tableD - margin - legSize),
  leg(tableW - margin - legSize, tableD - margin - legSize),
);

// The whole table can be rotated/moved as one unit
const angle = slider('Rotation', 0, 0, 360);
return tableGroup.rotate(0, 0, angle);
`
  },
};
