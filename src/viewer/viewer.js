import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Viewport {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Viewport container #${containerId} not found.`);
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.mesh = null;
    this.gridHelper = null;
    this.axesHelper = null;

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x181818); // Dark CAD grey

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.scene.add(this.camera); // Add camera to scene so child light works

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    
    // Clear container and append canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights
    // Ambient light for soft overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Headlight: A directional light attached to the camera
    // It rotates with the camera, ensuring there are no dark surfaces
    const headlight = new THREE.DirectionalLight(0xffffff, 0.7);
    headlight.position.set(0, 0, 1);
    this.camera.add(headlight);

    // Fill light from below/behind for depth
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight.position.set(-1, -1, -1);
    this.scene.add(fillLight);

    // 5. CAD Helpers
    // Grid Helper: representing a 200x200mm workbed with major lines every 10mm
    this.gridHelper = new THREE.GridHelper(200, 40, 0x555555, 0x333333);
    this.gridHelper.rotation.x = Math.PI / 2; // Lie flat in XY plane (standard Z-up representation)
    this.scene.add(this.gridHelper);

    // Axes Helper: X = Red, Y = Green, Z = Blue
    this.axesHelper = new THREE.AxesHelper(40);
    // Custom thickness for axes helper
    this.axesHelper.material.linewidth = 2;
    this.axesHelper.material.renderOrder = 1;
    this.scene.add(this.axesHelper);

    // 6. Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;

    // Standard CAD camera orientation:
    // ShapeScript unit is mm. Z is up.
    this.camera.up.set(0, 0, 1);
    this.resetCamera();

    // Start animation loop
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.controls) {
      this.controls.update();
    }
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateGeometry(positions, normals, colors) {
    // Remove existing mesh and dispose buffers
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (this.mesh.material) {
        this.mesh.material.dispose();
      }
      this.mesh = null;
    }

    if (!positions || positions.length === 0) return;

    // Create BufferGeometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    // Material: Physically Based, semi-glossy, double-sided, with per-vertex color support
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    // Supply vertex colors (or fall back to a neutral grey if none provided)
    if (colors && colors.length === positions.length) {
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    } else {
      // Build a flat grey color buffer matching the vertex count
      const grey = new Float32Array(positions.length).fill(0.878);
      geometry.setAttribute('color', new THREE.BufferAttribute(grey, 3));
    }

    this.mesh = new THREE.Mesh(geometry, material);
    
    // Add sharp edge lines overlay for a clean CAD visual style
    const edgesGeom = new THREE.EdgesGeometry(geometry, 25); // threshold angle 25 degrees
    const lineMat = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1.5 });
    const lineSegments = new THREE.LineSegments(edgesGeom, lineMat);
    this.mesh.add(lineSegments);

    this.scene.add(this.mesh);
  }

  resetCamera() {
    if (this.controls) {
      // If we have a mesh, target its center
      if (this.mesh) {
        const box = new THREE.Box3().setFromObject(this.mesh);
        const center = new THREE.Vector3();
        box.getCenter(center);
        this.controls.target.copy(center);
        
        // Position camera angled above the object
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 20);
        this.camera.position.set(center.x + maxDim * 1.5, center.y - maxDim * 1.8, center.z + maxDim * 1.5);
      } else {
        // Default target and position
        this.controls.target.set(0, 0, 0);
        this.camera.position.set(60, -90, 80);
      }
      this.controls.update();
    }
  }

  resize() {
    if (this.camera && this.renderer && this.container) {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }
}
