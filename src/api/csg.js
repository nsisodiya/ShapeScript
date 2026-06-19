// Constructive Solid Geometry (CSG) implementation using BSP trees.
// Modified and extended for ShapeScript ES module compliance,
// CAD primitives alignment, and transformations (move, rotate, scale, mirror).

export class Vector {
  constructor(x, y, z) {
    if (arguments.length === 3) {
      this.x = x;
      this.y = y;
      this.z = z;
    } else if ('x' in x) {
      this.x = x.x;
      this.y = x.y;
      this.z = x.z;
    } else {
      this.x = x[0];
      this.y = x[1];
      this.z = x[2];
    }
  }

  clone() {
    return new Vector(this.x, this.y, this.z);
  }

  negated() {
    return new Vector(-this.x, -this.y, -this.z);
  }

  plus(a) {
    return new Vector(this.x + a.x, this.y + a.y, this.z + a.z);
  }

  minus(a) {
    return new Vector(this.x - a.x, this.y - a.y, this.z - a.z);
  }

  times(a) {
    return new Vector(this.x * a, this.y * a, this.z * a);
  }

  dividedBy(a) {
    return new Vector(this.x / a, this.y / a, this.z / a);
  }

  dot(a) {
    return this.x * a.x + this.y * a.y + this.z * a.z;
  }

  lerp(a, t) {
    return this.plus(a.minus(this).times(t));
  }

  length() {
    return Math.sqrt(this.dot(this));
  }

  unit() {
    const len = this.length();
    return len === 0 ? new Vector(0, 0, 0) : this.dividedBy(len);
  }

  cross(a) {
    return new Vector(
      this.y * a.z - this.z * a.y,
      this.z * a.x - this.x * a.z,
      this.x * a.y - this.y * a.x
    );
  }
}

export class Vertex {
  constructor(pos, normal) {
    this.pos = new Vector(pos);
    this.normal = new Vector(normal);
  }

  clone() {
    return new Vertex(this.pos.clone(), this.normal.clone());
  }

  flip() {
    this.normal = this.normal.negated();
  }

  interpolate(other, t) {
    return new Vertex(
      this.pos.lerp(other.pos, t),
      this.normal.lerp(other.normal, t)
    );
  }
}

export class Plane {
  static EPSILON = 1e-5;

  constructor(normal, w) {
    this.normal = normal;
    this.w = w;
  }

  static fromPoints(a, b, c) {
    const n = b.minus(a).cross(c.minus(a)).unit();
    return new Plane(n, n.dot(a));
  }

  clone() {
    return new Plane(this.normal.clone(), this.w);
  }

  flip() {
    this.normal = this.normal.negated();
    this.w = -this.w;
  }

  splitPolygon(polygon, coplanarFront, coplanarBack, front, back) {
    const COPLANAR = 0;
    const FRONT = 1;
    const BACK = 2;
    const SPANNING = 3;

    let polygonType = 0;
    const types = [];
    
    for (let i = 0; i < polygon.vertices.length; i++) {
      const t = this.normal.dot(polygon.vertices[i].pos) - this.w;
      const type = (t < -Plane.EPSILON) ? BACK : (t > Plane.EPSILON) ? FRONT : COPLANAR;
      polygonType |= type;
      types.push(type);
    }

    switch (polygonType) {
      case COPLANAR:
        (this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
        break;
      case FRONT:
        front.push(polygon);
        break;
      case BACK:
        back.push(polygon);
        break;
      case SPANNING:
        const f = [], b = [];
        for (let i = 0; i < polygon.vertices.length; i++) {
          const j = (i + 1) % polygon.vertices.length;
          const ti = types[i], tj = types[j];
          const vi = polygon.vertices[i], vj = polygon.vertices[j];
          
          if (ti !== BACK) f.push(vi);
          if (ti !== FRONT) b.push(ti !== BACK ? vi.clone() : vi);
          
          if ((ti | tj) === SPANNING) {
            const t = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(vj.pos.minus(vi.pos));
            const v = vi.interpolate(vj, t);
            f.push(v);
            b.push(v.clone());
          }
        }
        if (f.length >= 3) front.push(new Polygon(f, polygon.shared));
        if (b.length >= 3) back.push(new Polygon(b, polygon.shared));
        break;
    }
  }
}

export class Polygon {
  constructor(vertices, shared) {
    this.vertices = vertices;
    this.shared = shared;
    this.plane = Plane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
  }

  clone() {
    const vertices = this.vertices.map(v => v.clone());
    return new Polygon(vertices, this.shared);
  }

  flip() {
    this.vertices.reverse().map(v => v.flip());
    this.plane.flip();
  }
}

export class Node {
  constructor(polygons) {
    this.plane = null;
    this.front = null;
    this.back = null;
    this.polygons = [];
    if (polygons) this.build(polygons);
  }

  clone() {
    const node = new Node();
    node.plane = this.plane && this.plane.clone();
    node.front = this.front && this.front.clone();
    node.back = this.back && this.back.clone();
    node.polygons = this.polygons.map(p => p.clone());
    return node;
  }

  invert() {
    for (let i = 0; i < this.polygons.length; i++) {
      this.polygons[i].flip();
    }
    if (this.plane) this.plane.flip();
    if (this.front) this.front.invert();
    if (this.back) this.back.invert();
    const temp = this.front;
    this.front = this.back;
    this.back = temp;
  }

  clipPolygons(polygons) {
    if (!this.plane) return polygons.slice();
    let front = [], back = [];
    for (let i = 0; i < polygons.length; i++) {
      this.plane.splitPolygon(polygons[i], front, back, front, back);
    }
    if (this.front) front = this.front.clipPolygons(front);
    if (this.back) back = this.back.clipPolygons(back);
    else back = [];
    return front.concat(back);
  }

  clipTo(bsp) {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) this.front.clipTo(bsp);
    if (this.back) this.back.clipTo(bsp);
  }

  allPolygons() {
    let polygons = this.polygons.slice();
    if (this.front) polygons = polygons.concat(this.front.allPolygons());
    if (this.back) polygons = polygons.concat(this.back.allPolygons());
    return polygons;
  }

  build(polygons) {
    if (!polygons.length) return;
    if (!this.plane) this.plane = polygons[0].plane.clone();
    const front = [], back = [];
    for (let i = 0; i < polygons.length; i++) {
      this.plane.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
    }
    if (front.length) {
      if (!this.front) this.front = new Node();
      this.front.build(front);
    }
    if (back.length) {
      if (!this.back) this.back = new Node();
      this.back.build(back);
    }
  }
}

export class CSG {
  constructor() {
    this.polygons = [];
  }

  static fromPolygons(polygons) {
    const csg = new CSG();
    csg.polygons = polygons;
    return csg;
  }

  clone() {
    const csg = new CSG();
    csg.polygons = this.polygons.map(p => p.clone());
    return csg;
  }

  toPolygons() {
    return this.polygons;
  }

  union(csg) {
    const a = new Node(this.clone().polygons);
    const b = new Node(csg.clone().polygons);
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    return CSG.fromPolygons(a.allPolygons());
  }

  subtract(csg) {
    const a = new Node(this.clone().polygons);
    const b = new Node(csg.clone().polygons);
    a.invert();
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    a.invert();
    return CSG.fromPolygons(a.allPolygons());
  }

  intersect(csg) {
    const a = new Node(this.clone().polygons);
    const b = new Node(csg.clone().polygons);
    a.invert();
    b.clipTo(a);
    b.invert();
    a.clipTo(b);
    b.clipTo(a);
    a.build(b.allPolygons());
    a.invert();
    return CSG.fromPolygons(a.allPolygons());
  }

  inverse() {
    const csg = this.clone();
    csg.polygons.map(p => p.flip());
    return csg;
  }

  // --- Transformations ---

  move(dx, dy, dz) {
    const offset = new Vector(dx || 0, dy || 0, dz || 0);
    return CSG.fromPolygons(this.polygons.map(p => {
      const vertices = p.vertices.map(v => {
        return new Vertex(v.pos.plus(offset), v.normal.clone());
      });
      return new Polygon(vertices, p.shared);
    }));
  }

  scale(sx, sy, sz) {
    if (sy === undefined) sy = sx;
    if (sz === undefined) sz = sx;
    
    return CSG.fromPolygons(this.polygons.map(p => {
      const vertices = p.vertices.map(v => {
        const scaledPos = new Vector(v.pos.x * sx, v.pos.y * sy, v.pos.z * sz);
        // Normals scale as inverse transpose: divide by scale factors, then normalize
        const scaledNormal = new Vector(
          sx !== 0 ? v.normal.x / sx : 0,
          sy !== 0 ? v.normal.y / sy : 0,
          sz !== 0 ? v.normal.z / sz : 0
        ).unit();
        return new Vertex(scaledPos, scaledNormal);
      });
      return new Polygon(vertices, p.shared);
    }));
  }

  rotate(ax, ay, az) {
    // Convert degrees to radians
    const rx = (ax || 0) * Math.PI / 180;
    const ry = (ay || 0) * Math.PI / 180;
    const rz = (az || 0) * Math.PI / 180;

    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);

    const rotateVector = (v) => {
      let { x, y, z } = v;
      // Rotate around X
      if (rx !== 0) {
        const y1 = y * cx - z * sx;
        const z1 = y * sx + z * cx;
        y = y1; z = z1;
      }
      // Rotate around Y
      if (ry !== 0) {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        x = x1; z = z1;
      }
      // Rotate around Z
      if (rz !== 0) {
        const x1 = x * cz - y * sz;
        const y1 = x * sz + y * cz;
        x = x1; y = y1;
      }
      return new Vector(x, y, z);
    };

    return CSG.fromPolygons(this.polygons.map(p => {
      const vertices = p.vertices.map(v => {
        return new Vertex(rotateVector(v.pos), rotateVector(v.normal).unit());
      });
      return new Polygon(vertices, p.shared);
    }));
  }

  mirror(axis) {
    axis = (axis || 'x').toLowerCase();
    const mx = axis === 'x' ? -1 : 1;
    const my = axis === 'y' ? -1 : 1;
    const mz = axis === 'z' ? -1 : 1;

    return CSG.fromPolygons(this.polygons.map(p => {
      const vertices = p.vertices.map(v => {
        return new Vertex(
          new Vector(v.pos.x * mx, v.pos.y * my, v.pos.z * mz),
          new Vector(v.normal.x * mx, v.normal.y * my, v.normal.z * mz).unit()
        );
      });
      
      // Mirroring changes the handedness of the coordinate system.
      // We must reverse the winding order of the vertices to keep face normals facing outwards.
      vertices.reverse();
      return new Polygon(vertices, p.shared);
    }));
  }

  // --- Primitives ---

  static cube(options = {}) {
    const c = new Vector(options.center || [0, 0, 0]);
    const r = !options.radius ? [1, 1, 1] : options.radius.length ?
             options.radius : [options.radius, options.radius, options.radius];
    
    return CSG.fromPolygons([
      [[0, 4, 6, 2], [-1, 0, 0]],
      [[1, 3, 7, 5], [+1, 0, 0]],
      [[0, 1, 5, 4], [0, -1, 0]],
      [[2, 6, 7, 3], [0, +1, 0]],
      [[0, 2, 3, 1], [0, 0, -1]],
      [[4, 5, 7, 6], [0, 0, +1]]
    ].map(info => {
      const vertices = info[0].map(i => {
        const pos = new Vector(
          c.x + r[0] * (2 * ! !(i & 1) - 1),
          c.y + r[1] * (2 * ! !(i & 2) - 1),
          c.z + r[2] * (2 * ! !(i & 4) - 1)
        );
        return new Vertex(pos, new Vector(info[1]));
      });
      return new Polygon(vertices);
    }));
  }

  static sphere(options = {}) {
    const c = new Vector(options.center || [0, 0, 0]);
    const r = options.radius || 1;
    const slices = options.slices || 24;
    const stacks = options.stacks || 12;
    const polygons = [];

    const getVertex = (thetaFraction, phiFraction) => {
      const theta = thetaFraction * Math.PI * 2;
      const phi = phiFraction * Math.PI;
      const dir = new Vector(
        Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi)
      );
      return new Vertex(c.plus(dir.times(r)), dir);
    };

    for (let i = 0; i < slices; i++) {
      for (let j = 0; j < stacks; j++) {
        const vertices = [];
        vertices.push(getVertex(i / slices, j / stacks));
        if (j > 0) vertices.push(getVertex((i + 1) / slices, j / stacks));
        if (j < stacks - 1) vertices.push(getVertex((i + 1) / slices, (j + 1) / stacks));
        vertices.push(getVertex(i / slices, (j + 1) / stacks));
        polygons.push(new Polygon(vertices));
      }
    }
    return CSG.fromPolygons(polygons);
  }

  static cylinder(options = {}) {
    const s = new Vector(options.start || [0, 0, 0]);
    const e = new Vector(options.end || [0, 0, 1]);
    const ray = e.minus(s);
    const r = options.radius || 1;
    const slices = options.slices || 24;
    
    const axisZ = ray.unit();
    const isY = (Math.abs(axisZ.y) > 0.5);
    const axisX = new Vector(isY, !isY, 0).cross(axisZ).unit();
    const axisY = axisX.cross(axisZ).unit();
    
    const start = new Vertex(s, axisZ.negated());
    const end = new Vertex(e, axisZ.unit());
    const polygons = [];

    const getPoint = (stack, slice, normalBlend) => {
      const angle = slice * Math.PI * 2;
      const out = axisX.times(Math.cos(angle)).plus(axisY.times(Math.sin(angle)));
      const pos = s.plus(ray.times(stack)).plus(out.times(r));
      const normal = out.times(1 - Math.abs(normalBlend)).plus(axisZ.times(normalBlend)).unit();
      return new Vertex(pos, normal);
    };

    for (let i = 0; i < slices; i++) {
      const t0 = i / slices;
      const t1 = (i + 1) / slices;
      
      // Bottom cap
      polygons.push(new Polygon([start, getPoint(0, t0, -1), getPoint(0, t1, -1)]));
      // Side quad
      polygons.push(new Polygon([getPoint(0, t1, 0), getPoint(0, t0, 0), getPoint(1, t0, 0), getPoint(1, t1, 0)]));
      // Top cap
      polygons.push(new Polygon([end, getPoint(1, t1, 1), getPoint(1, t0, 1)]));
    }
    return CSG.fromPolygons(polygons);
  }

  static cone(options = {}) {
    const s = new Vector(options.start || [0, 0, 0]);
    const e = new Vector(options.end || [0, 0, 1]);
    const ray = e.minus(s);
    const rStart = options.radiusBottom !== undefined ? options.radiusBottom : 1;
    const rEnd = options.radiusTop !== undefined ? options.radiusTop : 0;
    const slices = options.slices || 24;

    const axisZ = ray.unit();
    const isY = (Math.abs(axisZ.y) > 0.5);
    const axisX = new Vector(isY, !isY, 0).cross(axisZ).unit();
    const axisY = axisX.cross(axisZ).unit();

    const start = new Vertex(s, axisZ.negated());
    const end = new Vertex(e, axisZ.unit());
    const polygons = [];

    const getPoint = (stack, slice, normalBlend) => {
      const angle = slice * Math.PI * 2;
      const out = axisX.times(Math.cos(angle)).plus(axisY.times(Math.sin(angle)));
      const r = rStart + (rEnd - rStart) * stack;
      const pos = s.plus(ray.times(stack)).plus(out.times(r));
      const normal = out.times(1 - Math.abs(normalBlend)).plus(axisZ.times(normalBlend)).unit();
      return new Vertex(pos, normal);
    };

    for (let i = 0; i < slices; i++) {
      const t0 = i / slices;
      const t1 = (i + 1) / slices;

      // Bottom cap (only if radiusBottom > 0)
      if (rStart > 0) {
        polygons.push(new Polygon([start, getPoint(0, t0, -1), getPoint(0, t1, -1)]));
      }
      
      // Side panels (triangle if top radius is 0, quad otherwise)
      if (rEnd === 0) {
        polygons.push(new Polygon([getPoint(0, t1, 0), getPoint(0, t0, 0), getPoint(1, t0, 0)]));
      } else {
        polygons.push(new Polygon([getPoint(0, t1, 0), getPoint(0, t0, 0), getPoint(1, t0, 0), getPoint(1, t1, 0)]));
      }

      // Top cap (only if radiusTop > 0)
      if (rEnd > 0) {
        polygons.push(new Polygon([end, getPoint(1, t1, 1), getPoint(1, t0, 1)]));
      }
    }
    return CSG.fromPolygons(polygons);
  }

  static torus(options = {}) {
    const rRing = options.radius !== undefined ? options.radius : 1;
    const rTube = options.tubeRadius !== undefined ? options.tubeRadius : 0.2;
    const radialSlices = options.radialSlices || 24;
    const tubularSlices = options.tubularSlices || 12;
    const polygons = [];

    for (let i = 0; i < radialSlices; i++) {
      const u0 = i / radialSlices;
      const u1 = (i + 1) / radialSlices;
      const theta0 = u0 * Math.PI * 2;
      const theta1 = u1 * Math.PI * 2;

      const cosT0 = Math.cos(theta0), sinT0 = Math.sin(theta0);
      const cosT1 = Math.cos(theta1), sinT1 = Math.sin(theta1);

      const c0 = new Vector(cosT0 * rRing, sinT0 * rRing, 0);
      const c1 = new Vector(cosT1 * rRing, sinT1 * rRing, 0);

      for (let j = 0; j < tubularSlices; j++) {
        const v0 = j / tubularSlices;
        const v1 = (j + 1) / tubularSlices;
        const phi0 = v0 * Math.PI * 2;
        const phi1 = v1 * Math.PI * 2;

        const cosP0 = Math.cos(phi0), sinP0 = Math.sin(phi0);
        const cosP1 = Math.cos(phi1), sinP1 = Math.sin(phi1);

        const dir0_P0 = new Vector(cosT0 * cosP0, sinT0 * cosP0, sinP0);
        const dir0_P1 = new Vector(cosT0 * cosP1, sinT0 * cosP1, sinP1);
        const p00 = c0.plus(dir0_P0.times(rTube));
        const p01 = c0.plus(dir0_P1.times(rTube));

        const dir1_P0 = new Vector(cosT1 * cosP0, sinT1 * cosP0, sinP0);
        const dir1_P1 = new Vector(cosT1 * cosP1, sinT1 * cosP1, sinP1);
        const p10 = c1.plus(dir1_P0.times(rTube));
        const p11 = c1.plus(dir1_P1.times(rTube));

        // Build quad vertices with proper outward-facing normals
        const vertices = [
          new Vertex(p00, dir0_P0),
          new Vertex(p10, dir1_P0),
          new Vertex(p11, dir1_P1),
          new Vertex(p01, dir0_P1)
        ];
        polygons.push(new Polygon(vertices));
      }
    }
    return CSG.fromPolygons(polygons);
  }
}
