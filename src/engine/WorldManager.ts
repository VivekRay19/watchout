import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';

export class WorldManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private terrain: TerrainGenerator;

  // Camera navigation state
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public distance: number = 85;
  public minDistance: number = 15;
  public maxDistance: number = 320;
  public azimuth: number = Math.PI / 4; // horizontal rotation
  public elevation: number = Math.PI / 3.8; // vertical angle
  private isRightDragging = false;
  private isMiddleDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  public keyState: { [key: string]: boolean } = {};

  // Lighting & Day/Night
  public sunLight: THREE.DirectionalLight;
  public moonLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  public timeOfDay: number = 14.0; // 14:00 (2:00 PM)
  public daySpeed: number = 0.2; // 1 hour every ~5 real seconds
  public isNight: boolean = false;

  // Raycasting
  public raycaster: THREE.Raycaster;
  public mousePos: THREE.Vector2;

  constructor(canvas: HTMLCanvasElement, terrain: TerrainGenerator) {
    this.canvas = canvas;
    this.terrain = terrain;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0022);

    // Camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 1.0, 1500);

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
    this.renderer.toneMappingExposure = 1.05;

    // Lights
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    // Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 450;
    const d = 120;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Directional Moon Light
    this.moonLight = new THREE.DirectionalLight(0x7dd3fc, 0.2);
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
      if (e.key === 'r' || e.key === 'R') {
        // Can be handled by PlacementSystem or Camera reset if Ctrl is held
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keyState[e.key.toLowerCase()] = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isRightDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      } else if (e.button === 1) {
        this.isMiddleDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.isRightDragging = false;
      if (e.button === 1) this.isMiddleDragging = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isRightDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        this.azimuth -= deltaX * 0.005;
        this.elevation = Math.max(0.15, Math.min(Math.PI / 2.1, this.elevation + deltaY * 0.004));
      } else if (this.isMiddleDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        // Pan target along camera plane
        const panSpeed = this.distance * 0.0015;
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
        const zoomDelta = e.deltaY * 0.05 * (this.distance / 50);
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance + zoomDelta));
      },
      { passive: false }
    );

    // Context menu prevent default
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
    this.target.set(0, 0, 0);
    this.distance = 85;
    this.azimuth = Math.PI / 4;
    this.elevation = Math.PI / 3.8;
  }

  public focusOn(x: number, z: number, dist = 50) {
    this.target.set(x, this.terrain.getHeight(x, z), z);
    this.distance = dist;
  }

  public update(delta: number, isPaused: boolean) {
    // 1. WASD / Arrow Keys Pan
    const panSpeed = (this.keyState['shift'] ? 65 : 35) * delta * (this.distance / 50);
    const forward = new THREE.Vector3(-Math.sin(this.azimuth), 0, -Math.cos(this.azimuth));
    const right = new THREE.Vector3(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth));

    if (this.keyState['w'] || this.keyState['arrowup']) this.target.addScaledVector(forward, panSpeed);
    if (this.keyState['s'] || this.keyState['arrowdown']) this.target.addScaledVector(forward, -panSpeed);
    if (this.keyState['a'] || this.keyState['arrowleft']) this.target.addScaledVector(right, -panSpeed);
    if (this.keyState['d'] || this.keyState['arrowright']) this.target.addScaledVector(right, panSpeed);

    // Constrain camera bounds
    this.target.x = Math.max(-250, Math.min(250, this.target.x));
    this.target.z = Math.max(-250, Math.min(250, this.target.z));
    this.target.y = this.terrain.getHeight(this.target.x, this.target.z);

    // 2. Day / Night Cycle
    if (!isPaused) {
      this.timeOfDay = (this.timeOfDay + delta * this.daySpeed) % 24;
    }

    this.updateLighting();
    this.updateCameraPosition();
  }

  private updateLighting() {
    // Sun angle based on time of day (0 to 24 hours, sunrise ~6:00, sunset ~19:00)
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);

    this.isNight = sunY < -0.05;

    // Position sun light
    this.sunLight.position.set(this.target.x + sunX * 120, Math.max(10, sunY * 120), this.target.z + 40);
    this.sunLight.target.position.copy(this.target);
    this.sunLight.target.updateMatrixWorld();

    // Position moon light opposite
    this.moonLight.position.set(this.target.x - sunX * 100, Math.max(15, -sunY * 100), this.target.z - 40);
    this.moonLight.target.position.copy(this.target);
    this.moonLight.target.updateMatrixWorld();

    if (sunY > 0.1) {
      // Full daylight
      this.scene.background = new THREE.Color(0x78a6c8);
      this.scene.fog?.color.setHex(0x78a6c8);
      this.sunLight.intensity = THREE.MathUtils.lerp(0.8, 1.4, Math.min(1, sunY * 2));
      this.sunLight.color.setHex(0xfff7e6);
      this.ambientLight.intensity = 0.35;
      this.moonLight.intensity = 0.0;
    } else if (sunY > -0.1) {
      // Golden hour / Sunset
      this.scene.background = new THREE.Color(0xb45309);
      this.scene.fog?.color.setHex(0xb45309);
      this.sunLight.intensity = 0.6;
      this.sunLight.color.setHex(0xf97316);
      this.ambientLight.intensity = 0.25;
      this.moonLight.intensity = 0.1;
    } else {
      // Nighttime
      this.scene.background = new THREE.Color(0x030712);
      this.scene.fog?.color.setHex(0x030712);
      this.sunLight.intensity = 0.0;
      this.ambientLight.intensity = 0.15;
      this.moonLight.intensity = 0.35;
    }
  }

  private updateCameraPosition() {
    const x = this.target.x + this.distance * Math.sin(this.azimuth) * Math.cos(this.elevation);
    const z = this.target.z + this.distance * Math.cos(this.azimuth) * Math.cos(this.elevation);
    const y = this.target.y + this.distance * Math.sin(this.elevation);

    // Collision check with terrain to prevent clipping underground
    const groundY = this.terrain.getHeight(x, z);
    const clampedY = Math.max(groundY + 3.0, y);

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
