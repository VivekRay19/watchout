import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';

export class EnemyFaction {
  public group: THREE.Group;
  public basePos = { x: -210, y: 0, z: -200 };
  public territoryRadius = 80;
  public baseHealth = 5000;
  public maxHealth = 5000;
  public readiness = 85; // 0-100%
  private rotatingRadar: THREE.Object3D | null = null;

  constructor(terrain: TerrainGenerator) {
    this.group = new THREE.Group();
    this.basePos.y = terrain.getHeight(this.basePos.x, this.basePos.z);
    this.buildEnemyCompound();
  }

  private buildEnemyCompound() {
    const { x, y, z } = this.basePos;
    const compound = new THREE.Group();
    compound.position.set(x, y, z);

    // Hostile red boundary marker ring
    const ringGeo = new THREE.RingGeometry(this.territoryRadius - 1.5, this.territoryRadius, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.3;
    compound.add(ring);

    // Hostile Fortress Citadel
    const fortGeo = new THREE.CylinderGeometry(8, 11, 6, 8);
    const fortMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8, metalness: 0.2 });
    const fort = new THREE.Mesh(fortGeo, fortMat);
    fort.position.y = 3;
    fort.castShadow = true;
    compound.add(fort);

    // Hostile Rotating Red Radar Mast
    const radarTower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5 })
    );
    radarTower.position.set(12, 4, 10);
    compound.add(radarTower);

    const dishRotator = new THREE.Group();
    dishRotator.position.set(12, 8, 10);
    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 0.4, 0.8, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.6 })
    );
    dish.rotateX(Math.PI / 3);
    dishRotator.add(dish);
    compound.add(dishRotator);
    this.rotatingRadar = dishRotator;

    // Enemy AA Missile Battery Launchers
    for (let i = -1; i <= 1; i += 2) {
      const samGeo = new THREE.BoxGeometry(3, 1.2, 4);
      const samMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.7 });
      const sam = new THREE.Mesh(samGeo, samMat);
      sam.position.set(i * 16, 0.6, -14);
      compound.add(sam);

      // Red missile tubes
      const tubeGeo = new THREE.CylinderGeometry(0.35, 0.35, 3.8, 8);
      tubeGeo.rotateX(Math.PI / 2.5);
      const tube = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0x991b1b }));
      tube.position.set(i * 16, 1.8, -14);
      compound.add(tube);
    }

    // Hostile Aircraft Hangar
    const hangarGeo = new THREE.CylinderGeometry(4, 4, 12, 12, 1, false, 0, Math.PI);
    hangarGeo.rotateZ(Math.PI / 2);
    const hangar = new THREE.Mesh(
      hangarGeo,
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6 })
    );
    hangar.position.set(-18, 0, 16);
    compound.add(hangar);

    this.group.add(compound);
  }

  public update(delta: number) {
    if (this.rotatingRadar) {
      this.rotatingRadar.rotation.y += delta * 1.6;
    }
  }

  public takeDamage(amount: number) {
    this.baseHealth = Math.max(0, this.baseHealth - amount);
    this.readiness = Math.max(10, Math.round((this.baseHealth / this.maxHealth) * 100));
  }
}
