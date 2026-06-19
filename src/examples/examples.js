export const Examples = {
  cube: {
    name: 'Cube',
    code: `// Simple Cube Example
// Generates a basic cube centered at [size/2, size/2, size/2]

const size = slider("Cube Size", 25, 10, 80);

return cube(size);
`
  },

  box: {
    name: 'Box',
    code: `// Simple Box Example
// Generates a rectangular box (cuboid)

const w = slider("Width", 50, 10, 100);
const d = slider("Depth", 30, 10, 100);
const h = slider("Height", 20, 10, 100);

return box(w, d, h);
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
const base = box(width, depth, wall);

// Back Support
const back = box(width, wall, 65)
  .move(0, depth - wall, 0)
  .rotate(-90 + angle, 0, 0); // Tilt back

// Front Lip
const lip = box(width, wall * 1.5, lipHeight).move(0, 0, 0);

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

// Back mounting plate
const plate = box(mountWidth, wall, mountHeight);

// Hook peg extending outwards (along Y axis)
const peg = box(8, pegLength, 8)
  .move((mountWidth - 8) / 2, -pegLength, 15)
  .rotate(-pegAngle, 0, 0);

// Stop tip on the end of the peg
const tip = box(8, 6, 14)
  .move((mountWidth - 8) / 2, -pegLength - 6, 12)
  .rotate(-pegAngle, 0, 0);

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

const body = box(length, width, height);

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

// Central Gear Core
const core = cylinder(innerRadius, thickness);

let gear = core;

// Add teeth radially
for (let i = 0; i < teeth; i++) {
  const angle = (i * 360) / teeth;
  
  // Single tooth box shifted outward along Y and rotated
  const tooth = box(toothWidth, 12, thickness)
    .move(-toothWidth / 2, innerRadius - 4, 0)
    .rotate(0, 0, angle);
    
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

// Base cylinder body
const mainBody = cylinder(radius, height);
let knob = mainBody;

// Create side grip ridges
for (let i = 0; i < ridgeCount; i++) {
  const angle = (i * 360) / ridgeCount;
  const ridge = cylinder(1.5, height)
    .move(radius - 0.75, 0, 0)
    .rotate(0, 0, angle);
  knob = union(knob, ridge);
}

// Indicator pointer notch on top
const indicator = box(3, 8, 4)
  .move(-1.5, radius - 7, height - 3);
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

// 1. Build Outer Body
const lowerOuter = cone(waistR, baseR, height / 2);
const upperOuter = cone(lipR, waistR, height / 2).move(0, 0, height / 2);
const outer = union(lowerOuter, upperOuter);

// 2. Build Inner Cavity
// Scaled smaller in XY and shifted up on Z to leave a solid base
const innerLower = cone(waistR - wallThickness, baseR - wallThickness, height / 2);
const innerUpper = cone(lipR - wallThickness, waistR - wallThickness, height / 2).move(0, 0, height / 2);
const inner = union(innerLower, innerUpper).move(0, 0, wallThickness);

// 3. Subtract
return subtract(outer, inner);
`
  }
};
