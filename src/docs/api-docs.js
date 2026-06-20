/**
 * ShapeScript API Documentation
 * ==============================
 * This is the SINGLE SOURCE OF TRUTH for all API docs.
 *
 * tutorial.html imports and renders this module at runtime.
 *
 * HOW TO ADD A NEW API:
 *   1. Find the relevant section below (or add a new section object).
 *   2. Add an entry to `entries[]` with: name, signature, description, codeExample.
 *   3. Save. The tutorial page reflects the change on next reload — no HTML editing needed.
 */

export const API_DOCS = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'philosophy',
    title: '1. The Core Philosophy',
    intro: `ShapeScript is a lightweight browser modeling tool. Instead of clicking and
dragging shapes, you write standard JavaScript code. Every script must
<strong>return</strong> the final 3D model that you want to render and export to STL.`,
    highlight: 'The default unit of measurement is <strong>millimeters (mm)</strong>, standard for 3D slicers.',
    entries: []
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'primitives',
    title: '2. 3D Primitives',
    intro: 'Create basic solids using the following global functions:',
    entries: [
      {
        name: 'Cubes and Boxes',
        signatures: ['cube(size)', 'box(width, depth, height)'],
        description: `<code>cube(size)</code> creates a symmetric cube. <code>box(width, depth, height)</code>
creates a cuboid. Both are anchored in the positive octant, stretching from
<code>0</code> to the defined dimension on all axes.`,
        codeExample:
`// A 20mm × 20mm × 20mm cube
return cube(20);

// A rectangular box (Width=40mm, Depth=30mm, Height=10mm)
return box(40, 30, 10);`
      },
      {
        name: 'Spheres',
        signatures: ['sphere(radius)'],
        description: `<code>sphere(radius)</code> creates a sphere centered at the origin <code>[0, 0, 0]</code>.`,
        codeExample:
`// A sphere of radius 15mm (diameter 30mm)
return sphere(15);`
      },
      {
        name: 'Cylinders',
        signatures: ['cylinder(radius, height)'],
        description: `Centered on the XY plane, extends along the positive Z axis from
<code>z = 0</code> to <code>z = height</code>.`,
        codeExample:
`// Cylinder with radius 10mm and height 40mm
return cylinder(10, 40);`
      },
      {
        name: 'Cones',
        signatures: ['cone(radiusTop, radiusBottom, height)'],
        description: `A truncated cone (frustum). Set <code>radiusTop</code> to <code>0</code>
for a sharp point. Extends along the positive Z axis.`,
        codeExample:
`// Cone tapering to a point
return cone(0, 15, 30);

// Truncated cone (both radii non-zero)
return cone(8, 15, 30);`
      },
      {
        name: 'Torus',
        signatures: ['torus(radius, tubeRadius)'],
        description: `A donut ring centered at the origin, lying flat on the XY plane.
<code>radius</code> is the distance from the center to the tube center;
<code>tubeRadius</code> is the thickness of the tube.`,
        codeExample:
`// Major ring radius 25mm, tube thickness radius 4mm
return torus(25, 4);`
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'transforms',
    title: '3. Chainable Transformations',
    intro: `Apply moves, rotations, scaling, mirroring, or colors by chaining methods
directly on any geometry object. All transformations return a new object so
they can be chained freely.`,
    entries: [
      {
        name: 'Move (Translation)',
        signatures: ['.move(dx, dy, dz)'],
        description: 'Shift a shape by offset values along X, Y, and Z axes.',
        codeExample:
`// Move a 20mm cube by 15mm on X, and 5mm on Z
return cube(20).move(15, 0, 5);`
      },
      {
        name: 'Rotate',
        signatures: ['.rotate(ax, ay, az)'],
        description: 'Rotate a shape around X, Y, and Z axes. <strong>Angles are in degrees.</strong>',
        codeExample:
`// Rotate a box 45° around the Z axis
return box(30, 10, 10).rotate(0, 0, 45);`
      },
      {
        name: 'Scale',
        signatures: ['.scale(s)', '.scale(sx, sy, sz)'],
        description: `Resize shapes. A single number scales uniformly; three numbers scale
X, Y, and Z independently.`,
        codeExample:
`// Double in X, shrink by half on Y
return sphere(10).scale(2, 0.5, 1);`
      },
      {
        name: 'Mirror',
        signatures: [".mirror('x')", ".mirror('y')", ".mirror('z')"],
        description: `Flip geometry across a coordinate plane. Pass <code>'x'</code>,
<code>'y'</code>, or <code>'z'</code>.`,
        codeExample:
`// Mirror a cone across the X-axis plane
return cone(0, 10, 20).mirror('x');`
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'booleans',
    title: '4. Boolean Operations',
    intro: 'Solid modeling allows you to combine shapes in three ways:',
    entries: [
      {
        name: 'Union',
        signatures: ['union(shape1, shape2, ...)'],
        description: 'Joins multiple shapes into a single solid body.',
        codeExample:
`const block = box(40, 20, 10);
const peg   = cylinder(5, 20).move(20, 10, 0);

return union(block, peg);`
      },
      {
        name: 'Subtract',
        signatures: ['subtract(base, tool1, tool2, ...)'],
        description: 'Cuts tool shapes out of a base shape. Ideal for holes, hollow boxes, or slots.',
        codeExample:
`const base     = cube(30);
const drillBit = cylinder(5, 40).move(15, 15, -5);

return subtract(base, drillBit);`
      },
      {
        name: 'Intersect',
        signatures: ['intersect(shape1, shape2, ...)'],
        description: 'Finds the common volume shared by all shapes.',
        codeExample:
`return intersect(
  cube(30),
  sphere(20).move(15, 15, 15)
);`
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'colors',
    title: '5. Colors',
    intro: `Assign colors to shapes using the chainable <code>.color()</code> method.
Colors survive Boolean operations — each part of a union or subtraction keeps its
own color, making it easy to build visually distinct multi-part models.
Colors are displayed in the 3D viewport but are <em>not</em> stored in exported STL files
(STL is geometry-only).`,
    entries: [
      {
        name: 'Color',
        signatures: ['.color(r, g, b)'],
        description: `Assigns an RGB color to a shape. Values can be in the <strong>0.0–1.0</strong>
float range or the <strong>0–255</strong> integer range — ShapeScript auto-detects which
you are using. Returns a new colored CSG object (chainable).`,
        codeExample:
`// Float range (0.0 – 1.0)
return cube(20).color(0.18, 0.71, 0.69); // Teal

// Integer range (0 – 255) — auto-detected
return sphere(15).color(255, 80, 40);    // Coral

// Multi-part model with per-part colors
const body = box(60, 40, 20).color(0.22, 0.47, 0.80); // Blue
const peg  = cylinder(6, 30).move(30, 20, 20).color(0.95, 0.55, 0.10); // Orange

return union(body, peg);`
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'controls',
    title: '6. Dynamic Parametric Controls',
    intro: `You can create sliders, checkboxes, and select menus that appear in the
controls panel on the fly. Adjusting these controls rebuilds the model instantly
without needing to re-type code.`,
    entries: [
      {
        name: 'Slider',
        signatures: ['slider(name, default, min, max)'],
        description: 'Returns a number. Renders as a range slider in the controls panel.',
        codeExample:
`const size = slider("Cube Size", 25, 10, 80);
return cube(size).color(0.18, 0.71, 0.69);`
      },
      {
        name: 'Checkbox',
        signatures: ['checkbox(name, default)'],
        description: 'Returns <code>true</code> or <code>false</code>.',
        codeExample:
`const hollow = checkbox("Hollow Out", true);
const outer  = box(50, 40, 30).color(0.22, 0.47, 0.80);

if (hollow) {
  const inner = box(44, 34, 28).move(3, 3, 2);
  return subtract(outer, inner);
}
return outer;`
      },
      {
        name: 'Select',
        signatures: ['select(name, default, optionsArray)'],
        description: 'Returns the selected string option. Renders as a dropdown.',
        codeExample:
`const shape = select("Shape", "cube", ["cube", "sphere", "cylinder"]);

if (shape === "cube")     return cube(25).color(0.85, 0.25, 0.25);
if (shape === "sphere")   return sphere(15).color(0.25, 0.75, 0.40);
if (shape === "cylinder") return cylinder(12, 30).color(0.25, 0.50, 0.90);`
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'advanced',
    title: '7. Advanced Modeling: Loops and Math',
    intro: `Because ShapeScript is pure JavaScript, you can use loops, variables, arrays,
and the full <code>Math</code> library to create complex mechanical or decorative items.`,
    entries: [
      {
        name: 'Circular Pattern',
        signatures: [],
        description: 'Place shapes radially around a center using a loop and <code>.rotate()</code>.',
        codeExample:
`const teethCount = 12;
const coreRadius = 20;
const thick = 8;

const gearCore = cylinder(coreRadius, thick).color(0.75, 0.78, 0.82);
let gear = gearCore;

for (let i = 0; i < teethCount; i++) {
  const angle = (i * 360) / teethCount;
  const tooth = box(4, 8, thick)
    .move(-2, coreRadius - 2, 0)
    .rotate(0, 0, angle)
    .color(0.62, 0.65, 0.70);
  gear = union(gear, tooth);
}

return gear;`
      },
      {
        name: 'Math and Variables',
        signatures: [],
        description: `Use <code>Math.sin()</code>, <code>Math.cos()</code>, and any standard
JavaScript expression. All angles in ShapeScript's own API use degrees, but raw
<code>Math</code> functions use radians as usual.`,
        codeExample:
`// Place 8 spheres in a ring
let scene = cylinder(5, 5).color(0.9, 0.9, 0.9); // center post

for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2; // radians for Math.cos/sin
  const x = Math.cos(angle) * 30;
  const y = Math.sin(angle) * 30;
  const ball = sphere(5).move(x, y, 5).color(i / 8, 0.4, 1 - i / 8);
  scene = union(scene, ball);
}

return scene;`
      }
    ]
  }
];
