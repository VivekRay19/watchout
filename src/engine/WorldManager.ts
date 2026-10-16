import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';

export class WorldManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private terrain: TerrainGenerator;

  // Isometric-style camera navigation state with smooth damping
  public target: THREE.Vector3 = new THREE.Vector3(14, 1.8, 0);
  public desiredTarget: THREE.Vector3 = new THREE.Vector3(14, 1.8, 0);
  public distance: number = 215;
  public desiredDistance: number = 215;
  public minDistance: number = 35;
  public maxDistance: number = 350;
  public azimuth: number = -0.56;
  public desiredAzimuth: number = -0.56;
  public elevation: number = 0.64; // ~37 deg isometric pitch
  public desiredElevation: number = 0.64;

  private isRightDragging = false;
  private isMiddleDragging = false;
  private isLeftDragging = false;
  private dragDistance = 0;
  public wasDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  public keyState: { [key: string]: boolean } = {};

  // Lighting & Smooth Day/Night Cycle
  public sunLight: THREE.DirectionalLight;
  public moonLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  public timeOfDay: number = 10.4; // 10:24 AM bright morning light (matches reference)
  public daySpeed: number = 0.015;
  public isNight: boolean = false;
  public nightFactor: number = 0; // 0.0 = bright day, 1.0 = full night

  // Raycasting
  public raycaster: THREE.Raycaster;
  public mousePos: THREE.Vector2;

  constructor(canvas: HTMLCanvasElement, terrain: TerrainGenerator) {
    this.canvas = canvas;
    this.terrain = terrain;

    // Scene with cheerful sky blue background and subtle aerial perspective fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x6ec6f5);
    this.scene.fog = new THREE.FogExp2(0x8cd3f8, 0.00072);

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
    this.hemiLight = new THREE.HemisphereLight(0xe6f4ff, 0x8ae068, 0.96);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.46);
    this.scene.add(this.ambientLight);

    // Directional Sun Light casting crisp, soft isometric shadows
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.75);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 500;
    const d = 150;
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
        this.desiredAzimuth -= deltaX * 0.005;
        this.desiredElevation = Math.max(
          0.3,
          Math.min(Math.PI / 2.25, this.desiredElevation + deltaY * 0.004)
        );
      } else if (this.isMiddleDragging || (this.isLeftDragging && this.dragDistance > 6)) {
        const panSpeed = this.distance * 0.00095;
        const forward = new THREE.Vector3(-Math.sin(this.azimuth), 0, -Math.cos(this.azimuth));
        const right = new THREE.Vector3(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth));

        this.desiredTarget.addScaledVector(right, -deltaX * panSpeed);
        this.desiredTarget.addScaledVector(forward, deltaY * panSpeed);
      }
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.05 * (this.desiredDistance / 65);
        this.desiredDistance = Math.max(
          this.minDistance,
          Math.min(this.maxDistance, this.desiredDistance + zoomDelta)
        );
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
    this.desiredTarget.set(14, 1.8, 0);
    this.target.copy(this.desiredTarget);
    this.desiredDistance = 215;
    this.distance = 215;
    this.desiredAzimuth = -0.56;
    this.azimuth = -0.56;
    this.desiredElevation = 0.64;
    this.elevation = 0.64;
  }

  public focusOn(x: number, z: number, dist = 95) {
    const y = Math.max(0, this.terrain.getHeight(x, z));
    this.desiredTarget.set(x, y, z);
    this.desiredDistance = dist;
  }

  public update(delta: number, isPaused: boolean) {
    // 1. WASD / Arrow Keys Pan
    const panSpeed = (this.keyState['shift'] ? 65 : 36) * delta * (this.distance / 90);
    const forward = new THREE.Vector3(-Math.sin(this.azimuth), 0, -Math.cos(this.azimuth));
    const right = new THREE.Vector3(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth));

    if (this.keyState['w'] || this.keyState['arrowup']) this.desiredTarget.addScaledVector(forward, panSpeed);
    if (this.keyState['s'] || this.keyState['arrowdown']) this.desiredTarget.addScaledVector(forward, -panSpeed);
    if (this.keyState['a'] || this.keyState['arrowleft']) this.desiredTarget.addScaledVector(right, -panSpeed);
    if (this.keyState['d'] || this.keyState['arrowright']) this.desiredTarget.addScaledVector(right, panSpeed);

    // Constrain desired camera bounds
    this.desiredTarget.x = Math.max(-250, Math.min(250, this.desiredTarget.x));
    this.desiredTarget.z = Math.max(-250, Math.min(250, this.desiredTarget.z));
    this.desiredTarget.y = Math.max(0, this.terrain.getHeight(this.desiredTarget.x, this.desiredTarget.z));

    // Smooth camera damping
    const damp = Math.min(1, delta * 14);
    this.target.lerp(this.desiredTarget, damp);
    this.distance = THREE.MathUtils.lerp(this.distance, this.desiredDistance, damp);
    this.azimuth = THREE.MathUtils.lerp(this.azimuth, this.desiredAzimuth, damp);
    this.elevation = THREE.MathUtils.lerp(this.elevation, this.desiredElevation, damp);

    // 2. Smooth Day / Night Clock
    if (!isPaused) {
      this.timeOfDay = (this.timeOfDay + delta * this.daySpeed) % 24;
    }

    this.updateLighting();
    this.updateCameraPosition();
  }

  private updateLighting() {
    const t = this.timeOfDay;
    // Compute smooth nightFactor (0 = Day, 1 = Night) with Sunrise (5:30-7:30) and Sunset (17:30-20:00)
    let nf = 0;
    if (t >= 20.0 || t < 5.5) {
      nf = 1.0;
    } else if (t >= 5.5 && t < 7.5) {
      nf = 1.0 - (t - 5.5) / 2.0;
    } else if (t > 17.5 && t < 20.0) {
      nf = (t - 17.5) / 2.5;
    }
    this.nightFactor = THREE.MathUtils.clamp(nf, 0, 1);
    this.isNight = this.nightFactor > 0.5;

    // Golden-hour factor peaks at sunrise (6.5) and sunset (18.7)
    let golden = 0;
    if (t >= 5.5 && t <= 8.0) {
      golden = 1.0 - Math.abs(t - 6.75) / 1.25;
    } else if (t >= 17.0 && t <= 20.0) {
      golden = 1.0 - Math.abs(t - 18.5) / 1.5;
    }
    golden = THREE.MathUtils.clamp(golden, 0, 1);

    const sunAngle = ((t - 6) / 24) * Math.PI * 2;
    const sunY = Math.sin(sunAngle);

    // Keep sun angle attractive from the upper-right / south-east to give crisp 3D depth on city blocks
    const lightX = this.target.x + 95;
    const lightY = Math.max(45, Math.abs(sunY) * 130 + 55);
    const lightZ = this.target.z + 75;

    this.sunLight.position.set(lightX, lightY, lightZ);
    this.sunLight.target.position.copy(this.target);
    this.sunLight.target.updateMatrixWorld();

    this.moonLight.position.set(this.target.x - 80, 75, this.target.z - 60);
    this.moonLight.target.position.copy(this.target);
    this.moonLight.target.updateMatrixWorld();

    // Interpolate Sky, Fog, and Light intensities smoothly across Sunrise -> Day -> Sunset -> Night
    const daySky = new THREE.Color(0x6ec6f5);
    const goldenSky = new THREE.Color(0xfba96c);
    const nightSky = new THREE.Color(0x112240);

    const skyColor = daySky.clone().lerp(goldenSky, golden * 0.75).lerp(nightSky, this.nightFactor);
    this.scene.background = skyColor;
    this.scene.fog?.color.copy(skyColor);

    const daySun = new THREE.Color(0xfffbeb);
    const goldenSun = new THREE.Color(0xfed7aa);
    this.sunLight.color.copy(daySun).lerp(goldenSun, golden);

    this.sunLight.intensity = THREE.MathUtils.lerp(1.74, 0.25, this.nightFactor);
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.96, 0.42, this.nightFactor);
    this.ambientLight.intensity = THREE.MathUtils.lerp(0.46, 0.32, this.nightFactor);
    this.moonLight.intensity = THREE.MathUtils.lerp(0.12, 0.62, this.nightFactor);
  }

  private updateCameraPosition() {
    const x = this.target.x + this.distance * Math.sin(this.azimuth) * Math.cos(this.elevation);
    const z = this.target.z + this.distance * Math.cos(this.azimuth) * Math.cos(this.elevation);
    const y = this.target.y + this.distance * Math.sin(this.elevation);

    const groundY = this.terrain.getHeight(x, z);
    const clampedY = Math.max(groundY + 4.5, y);

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
