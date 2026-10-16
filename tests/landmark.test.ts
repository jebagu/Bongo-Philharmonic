import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { choosePoleLandmark, MARIO_LANDMARKS, POLE_LANDMARKS, mountMarioLandmark, PhilharmonicPole } from '../src/landmark';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Mario pole landmarks', () => {
  it('selects the original North Pole and the five requested entries with equal random intervals', () => {
    expect(MARIO_LANDMARKS.map(model => model.number)).toEqual(['02', '08', '10', '11', '12']);
    expect(POLE_LANDMARKS.map(model => model.number)).toEqual(['original', '02', '08', '10', '11', '12']);
    const choices = Array.from({ length: 120 }, (_, i) => choosePoleLandmark(() => (i + .5) / 120).number);
    for (const model of POLE_LANDMARKS) expect(choices.filter(number => number === model.number)).toHaveLength(20);
    expect(choosePoleLandmark(() => 0).number).toBe('original');
    expect(choosePoleLandmark(() => .999999).number).toBe('12');
  });

  it('can select the existing North Pole without requesting any model files', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const loading = vi.spyOn(GLTFLoader.prototype, 'loadAsync');
    const pole = new PhilharmonicPole();
    expect(pole.snapshot()).toMatchObject({ id: 'north-pole', status: 'ready', originalVisible: true, nativeVisible: false });
    expect(loading).not.toHaveBeenCalled();
    pole.dispose();
  });

  it.each(MARIO_LANDMARKS)('fits $name without distorting an offset authored model', definition => {
    const scene = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 4), new THREE.MeshStandardMaterial());
    mesh.position.set(75, -100, 35);
    mesh.scale.set(2, 3, 4);
    scene.add(mesh);
    const originalSize = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
    const mounted = mountMarioLandmark(scene, definition);
    const bounds = new THREE.Box3().setFromObject(mounted), size = bounds.getSize(new THREE.Vector3());
    expect(bounds.min.y).toBeCloseTo(0, 10);
    expect(bounds.getCenter(new THREE.Vector3()).x).toBeCloseTo(0, 10);
    expect(bounds.getCenter(new THREE.Vector3()).z).toBeCloseTo(0, 10);
    size.toArray().forEach((dimension, axis) => expect(dimension).toBeLessThanOrEqual(definition.maxSize[axis] + 1e-10));
    expect(size.x / size.y).toBeCloseTo(originalSize.x / originalSize.y, 10);
    expect(size.z / size.y).toBeCloseTo(originalSize.z / originalSize.y, 10);
    expect(Math.max(...size.toArray().map((dimension, axis) => dimension / definition.maxSize[axis]))).toBeCloseTo(1);
    mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
  });

  it('rejects empty models instead of producing an invalid scale', () => {
    expect(() => mountMarioLandmark(new THREE.Group(), MARIO_LANDMARKS[0])).toThrow('Invalid landmark bounds');
  });

  it('starts its single selected model immediately without receiving a sound set', async () => {
    vi.stubGlobal('location', { origin: 'http://127.0.0.1:5417' });
    vi.spyOn(Math, 'random').mockReturnValue(.55);
    let finish!: (model: GLTF) => void;
    const loading = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pole = new PhilharmonicPole();
    expect(pole.snapshot()).toMatchObject({ number: '10', status: 'loading', originalVisible: true });
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), new THREE.MeshStandardMaterial()));
    finish({ scene } as GLTF);
    await vi.waitFor(() => expect(pole.snapshot().status).toBe('ready'));
    expect(pole.snapshot()).toMatchObject({ number: '10', nativeVisible: true, originalVisible: false });
    expect(loading).toHaveBeenCalledTimes(1);
    pole.dispose();
  });

  it('keeps the orientation marker on a failed model download', async () => {
    vi.stubGlobal('location', { origin: 'http://127.0.0.1:5417' });
    vi.spyOn(Math, 'random').mockReturnValue(.55);
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockRejectedValue(Error('missing local asset'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const pole = new PhilharmonicPole();
    await vi.waitFor(() => expect(pole.snapshot().status).toBe('error'));
    expect(pole.snapshot()).toMatchObject({ nativeVisible: false, originalVisible: true });
    pole.dispose();
  });

  it('disposes a model that finishes after the presentation surface was closed', async () => {
    vi.stubGlobal('location', { origin: 'http://127.0.0.1:5417' });
    vi.spyOn(Math, 'random').mockReturnValue(.55);
    let finish!: (model: GLTF) => void;
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pole = new PhilharmonicPole(); pole.dispose();
    const scene = new THREE.Group(), geometry = new THREE.BoxGeometry(), texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const disposed = [vi.spyOn(geometry, 'dispose'), vi.spyOn(material, 'dispose'), vi.spyOn(texture, 'dispose')];
    scene.add(new THREE.Mesh(geometry, material)); finish({ scene } as GLTF);
    await vi.waitFor(() => disposed.forEach(spy => expect(spy).toHaveBeenCalledTimes(1)));
    expect(pole.children).toHaveLength(0);
  });
});
