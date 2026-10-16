import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NorthPole } from '../foundation/src/view/art/northPole';
import { protectFromScenery } from '../foundation/src/view/art/SceneryMask';

export const MARIO_LANDMARKS = [
  { id: 'checkpoint-flag', number: '02', name: 'Checkpoint flag', file: '02-checkpoint-flag.glb', maxSize: [.16, .26, .14] },
  { id: 'super-star', number: '08', name: 'Super Star', file: '08-super-star.glb', maxSize: [.19, .18, .10] },
  { id: 'super-mushroom', number: '10', name: 'Super Mushroom', file: '10-super-mushroom.glb', maxSize: [.19, .17, .19] },
  { id: 'question-block', number: '11', name: 'Question Block', file: '11-question-block.glb', maxSize: [.16, .16, .16] },
  { id: 'warp-pipe', number: '12', name: 'Warp pipe', file: '12-warp-pipe.glb', maxSize: [.16, .18, .16] },
] as const;

export type MarioLandmark = typeof MARIO_LANDMARKS[number];

export const POLE_LANDMARKS = [
  { id: 'north-pole', number: 'original', name: 'North Pole', file: null, maxSize: [.16, .26, .16] },
  ...MARIO_LANDMARKS,
] as const;
export type PoleLandmark = typeof POLE_LANDMARKS[number];

/** One equal-probability choice per startup, independent of music and sound sets. */
export function choosePoleLandmark(random = Math.random): PoleLandmark {
  return POLE_LANDMARKS[Math.min(POLE_LANDMARKS.length - 1, Math.max(0, Math.floor(random() * POLE_LANDMARKS.length)))];
}

/** Keep authored proportions, center horizontally, and put the bottom at y=0. */
export function mountMarioLandmark(model: THREE.Object3D, definition: MarioLandmark): THREE.Group {
  const content = new THREE.Group();
  content.add(model);
  const box = new THREE.Box3().setFromObject(content);
  const size = box.getSize(new THREE.Vector3());
  if (box.isEmpty() || !size.toArray().every(Number.isFinite) || Math.max(size.x, size.y, size.z) <= 0)
    throw Error(`Invalid landmark bounds: ${definition.id}`);
  const center = box.getCenter(new THREE.Vector3());
  const scale = Math.min(...size.toArray().map((dimension, i) => dimension > 0 ? definition.maxSize[i] / dimension : Infinity));
  content.scale.setScalar(scale);
  content.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  const mount = new THREE.Group();
  mount.name = `Mario landmark: ${definition.name}`;
  mount.add(content);
  mount.traverse(object => {
    if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
  });
  protectFromScenery(mount);
  return mount;
}

function disposeLandmark(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
  object.removeFromParent();
}

/** Owns only landmark presentation. It has no sound-set or composition input. */
export class PhilharmonicPole extends THREE.Group {
  readonly selected = choosePoleLandmark();
  private readonly original = new NorthPole();
  private native: THREE.Group | null = null;
  private disposed = false;
  private status: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  onChange?: () => void;

  constructor() {
    super();
    this.name = 'Philharmonic pole landmark';
    this.add(this.original);
    if (this.selected.id === 'north-pole') this.status = 'ready';
    else void this.load(this.selected);
  }

  snapshot() {
    const size = this.status === 'ready'
      ? new THREE.Box3().setFromObject(this.native ?? this.original).getSize(new THREE.Vector3()).toArray() : null;
    return { id: this.selected.id, number: this.selected.number, name: this.selected.name, status: this.status,
      nativeVisible: this.native?.visible ?? false, originalVisible: this.original.visible, size, maxSize: [...this.selected.maxSize] };
  }

  dispose(): void {
    this.disposed = true;
    if (this.native) disposeLandmark(this.native);
    disposeLandmark(this.original);
    this.removeFromParent();
  }

  private updateVisibility(): void {
    const showNative = this.native !== null;
    this.original.visible = !showNative;
    if (this.native) this.native.visible = showNative;
    this.onChange?.();
  }

  private async load(definition: MarioLandmark): Promise<void> {
    this.status = 'loading';
    this.onChange?.();
    let scene: THREE.Group | undefined;
    try {
      const base = new URL(import.meta.env.BASE_URL, location.origin);
      scene = (await new GLTFLoader().loadAsync(new URL(`assets/landmarks/${definition.file}`, base).href)).scene;
      if (this.disposed) { disposeLandmark(scene); return; }
      this.native = mountMarioLandmark(scene, definition);
      this.native.position.y = 1.105;
      this.add(this.native);
      this.status = 'ready';
      this.updateVisibility();
    } catch (error) {
      if (scene) disposeLandmark(scene);
      if (this.disposed) return;
      this.status = 'error';
      this.updateVisibility();
      console.error(`Bongo Philharmonic could not load ${this.selected.name}.`, error);
    }
  }
}
