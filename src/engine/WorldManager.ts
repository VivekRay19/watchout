import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';

export class WorldManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private terrain: TerrainGenerator;

  // Isometric-style camera navigation state
  public target: THREE.Vector3 = new THREE.Vector3(10, 1.6, 2);
  public distance: number = 205;
  public minDistance: number = 35;
  public maxDistance: number = 340;
  public azimuth: number = -0.58; // Isometric angle framing NW hills top-left, harbor bottom-left, river right
  public elevation: number = 0.64; // ~37 deg isometric pitch
  private isRightDragging = false;
  private isMiddleDragging = false;
  private isLeftDragging = false;
  private dragDistance = 0;
  public wasDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  public keyState: { [key: string]: boolean } = {};

  // Lighting & Day/Night
  public sunLight: THREE.DirectionalLight;
  public moonLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  public timeOfDay: number = 10.5; // 10:30 AM bright morning light (matching reference)
  public daySpeed: number = 0.015; // Gentle progression so sunny aesthetic stays consistent
  public isNight: boolean = false;

  // Raycasting
  public raycaster: THREE.Raycaster;
  public mousePos: THREE.Vector2;

  constructor(canvas: HTMLCanvasElement, terrain: TerrainGenerator) {
    this.canvas = canvas;
    this.terrain = terrain;

    // Scene with cheerful sky blue background and very subtle aerial perspective fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x6ec6f5);
    this.scene.fog = new THREE.FogExp2(0x8cd3f8, 0.00075);

    // Narrow-FOV Camera (26 deg) for clean, readable isometric city-block proportions
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(26, aspect, 2.0, 1800);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    // Bright, warm, cohesive lighting
    this.hemiLight = new THREE.HemisphereLight(0xe6f4ff, 0x8ae068, 0.95);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.ambientLight);

    // Directional Sun Light casting crisp, soft isometric shadows
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.75);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 480;
    const d = 140;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Subtle Moon / Fill Light
    this.moonLight = new THREE.DirectionalLight(0x93c5fd, 0.15);
    this.scene.add(this.moonLight);

    // Raycasting
    this.raycaster = new THREE.Raycaster();
    this.mousePos = new THREE.Vector2();

    this.initControls();
    this.updateCameraPosition();
  }

  private initControls() {
    window.addEventListener('keydown', (e) => {
      this.keyState[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keyState[e.key.toLowerCase()] = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.dragDistance = 0;
      this.wasDragging = false;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (e.button === 2) {
        this.isRightDragging = true;
      } else if (e.button === 1) {
        this.isMiddleDragging = true;
      } else if (e.button === 0) {
        this.isLeftDragging = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.dragDistance > 6) {
        this.wasDragging = true;
      }
      if (e.button === 2) this.isRightDragging = false;
      if (e.button === 1) this.isMiddleDragging = false;
      if (e.button === 0) this.isLeftDragging = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      if (this.isRightDragging || this.isMiddleDragging || this.isLeftDragging) {
        this.dragDistance += Math.hypot(deltaX, deltaY);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }

      if (this.isRightDragging) {
        this.azimuth -= deltaX * 0.005;
        this.elevation = Math.max(0.28, Math.min(Math.PI / 2.2, this.elevation + deltaY * 0.004));
      } else if (this.isMiddleDragging || (this.isLeftDragging && this.dragDistance > 6)) {
        const panSpeed = this.distance * 0.00095;
        const forward = new THREE.Vector3(-Math.sin(this.azimuth), 0, -Math.cos(this.azimuth));
        const right = new THREE.Vector3(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth));

        this.target.addScaledVector(right, -deltaX * panSpeed);
        this.target.addScaledVector(forward, deltaY * panSpeed);
      }
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.05 * (this.distance / 65);
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance + zoomDelta));
      },
      { passive: false }
    );

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public handleResize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  public resetCamera() {
    this.target.set(10, 1.6, 2);
    this.distance = 205;
    this.azimuth = -0.58;
    this.elevation = 0.64;
  }

  public focusOn(x: number, z: number, dist = 95) {
    this.target.set(x, this.terrain.getHeight(x, z), z);
    this.distance = dist;
  }

  public update(delta: number, isPaused: boolean) {
    // 1. WASD / Arrow Keys Pan
    const panSpeed = (this.keyState['shift'] ? 65 : 36) * delta * (this.distance / 90);
    const forward = new THREE.Vector3(-Math.sin(this.azimuth), 0, -Math.cos(this.azimuth));
    const right = new THREE.Vector3(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth));

    if (this.keyState['w'] || this.keyState['arrowup']) this.target.addScaledVector(forward, panSpeed);
    if (this.keyState['s'] || this.keyState['arrowdown']) this.target.addScaledVector(forward, -panSpeed);
    if (this.keyState['a'] || this.keyState['arrowleft']) this.target.addScaledVector(right, -panSpeed);
    if (this.keyState['d'] || this.keyState['arrowright']) this.target.addScaledVector(right, panSpeed);

    // Constrain camera bounds
    this.target.x = Math.max(-250, Math.min(250, this.target.x));
    this.target.z = Math.max(-250, Math.min(250, this.target.z));
    this.target.y = Math.max(0, this.terrain.getHeight(this.target.x, this.target.z));

    // 2. Gentle Day / Night Clock
    if (!isPaused) {
      this.timeOfDay = (this.timeOfDay + delta * this.daySpeed) % 24;
    }

    this.updateLighting();
    this.updateCameraPosition();
  }

  private updateLighting() {
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunY = Math.sin(sunAngle);

    this.isNight = this.timeOfDay < 5.5 || this.timeOfDay > 20.0;

    // Keep sun angle attractive from the upper-right / south-east to give crisp 3D depth on city blocks
    const lightX = this.target.x + 95;
    const lightY = Math.max(45, Math.abs(sunY) * 130 + 55);
    const lightZ = this.target.z + 75;

    this.sunLight.position.set(lightX, lightY, lightZ);
    this.sunLight.target.position.copy(this.target);
    this.sunLight.target.updateMatrixWorld();

    this.moonLight.position.set(this.target.x - 80, 70, this.target.z - 60);
    this.moonLight.target.position.copy(this.target);
    this.moonLight.target.updateMatrixWorld();

    if (!this.isNight && sunY > 0.05) {
      // Bright, cheerful sunlit day (matches reference art direction)
      this.scene.background = new THREE.Color(0x6ec6f5);
      this.scene.fog?.color.setHex(0x8cd3f8);
      this.sunLight.intensity = 1.72;
      this.sunLight.color.setHex(0xfffbeb);
      this.hemiLight.intensity = 0.95;
      this.ambientLight.intensity = 0.45;
      this.moonLight.intensity = 0.12;
    } else if (!this.isNight) {
      // Warm golden hour
      this.scene.background = new THREE.Color(0xfba96c);
      this.scene.fog?.color.setHex(0xfba96c);
      this.sunLight.intensity = 1.15;
      this.sunLight.color.setHex(0xfed7aa);
      this.hemiLight.intensity = 0.65;
      this.ambientLight.intensity = 0.35;
      this.moonLight.intensity = 0.2;
    } else {
      // Soft readable twilight/night
      this.scene.background = new THREE.Color(0x0f1e36);
      this.scene.fog?.color.setHex(0x0f1e36);
      this.sunLight.intensity = 0.25;
      this.hemiLight.intensity = 0.4;
      this.ambientLight.intensity = 0.3;
      this.moonLight.intensity = 0.55;
    }
  }

  private updateCameraPosition() {
    const x = this.target.x + this.distance * Math.sin(this.azimuth) * Math.cos(this.elevation);
    const z = this.target.z + this.distance * Math.cos(this.azimuth) * Math.cos(this.elevation);
    const y = this.target.y + this.distance * Math.sin(this.elevation);

    const groundY = this.terrain.getHeight(x, z);
    const clampedY = Math.max(groundY + 4.0, y);

    this.camera.position.set(x, clampedY, z);
    this.camera.lookAt(this.target);
  }

  public getTerrainIntersection(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mousePos, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrain.mesh);
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }
}
