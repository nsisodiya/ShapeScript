/**
 * Exports triangle vertex positions and normals to a binary STL Blob.
 * @param {Float32Array} positions - Flat array of triangle vertex positions (x, y, z for each vertex)
 * @param {Float32Array} normals - Flat array of triangle vertex normals (x, y, z for each vertex)
 * @returns {Blob} The binary STL data as a Blob
 */
export function exportBinarySTL(positions, normals) {
  const numTriangles = positions.length / 9; // 3 vertices * 3 coords per triangle
  
  // Binary STL format structure:
  // 80 bytes header (text or zeros)
  // 4 bytes unsigned 32-bit int: number of triangles
  // Then for each triangle (50 bytes total):
  //   12 bytes (3x float32) normal vector
  //   12 bytes (3x float32) vertex 1
  //   12 bytes (3x float32) vertex 2
  //   12 bytes (3x float32) vertex 3
  //   2 bytes (uint16) attribute byte count (set to 0)
  
  const bufferSize = 80 + 4 + numTriangles * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  
  // 1. Write Header: 80 bytes
  const header = "ShapeScript Binary STL Export (" + new Date().toISOString() + ")";
  for (let i = 0; i < Math.min(header.length, 80); i++) {
    view.setUint8(i, header.charCodeAt(i));
  }
  
  // 2. Write Triangle Count: 4 bytes at offset 80 (little-endian)
  view.setUint32(80, numTriangles, true);
  
  let offset = 84;
  
  for (let i = 0; i < numTriangles; i++) {
    const idx = i * 9;
    
    // Compute mathematical normal from vertices if normal attribute is blank or flat,
    // though using the computed normal is standard practice.
    // v0: positions[idx..idx+2], v1: positions[idx+3..idx+5], v2: positions[idx+6..idx+8]
    const ux = positions[idx + 3] - positions[idx];
    const uy = positions[idx + 4] - positions[idx + 1];
    const uz = positions[idx + 5] - positions[idx + 2];
    
    const vx = positions[idx + 6] - positions[idx];
    const vy = positions[idx + 7] - positions[idx + 1];
    const vz = positions[idx + 8] - positions[idx + 2];
    
    // Cross product: U x V
    let nx = uy * vz - uz * vy;
    let ny = uz * ux - ux * vz;
    let nz = ux * vy - uy * vx;
    
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }
    
    // 3. Write Face Normal: 12 bytes
    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);
    offset += 12;
    
    // 4. Write Vertices: 3 x 12 bytes
    for (let v = 0; v < 3; v++) {
      const vidx = idx + v * 3;
      view.setFloat32(offset, positions[vidx], true);
      view.setFloat32(offset + 4, positions[vidx + 1], true);
      view.setFloat32(offset + 8, positions[vidx + 2], true);
      offset += 12;
    }
    
    // 5. Write Attribute Byte Count: 2 bytes (0)
    view.setUint16(offset, 0, true);
    offset += 2;
  }
  
  return new Blob([buffer], { type: 'application/octet-stream' });
}
