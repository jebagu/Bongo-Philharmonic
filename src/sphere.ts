import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { topology } from '../foundation/src/core/geometry';
import { INSTRUMENTS, type Instrument } from '../foundation/src/core/instruments';
import { toRenderPoint } from '../foundation/src/view/math';
import { createFacetedPlanet, createToy } from '../foundation/src/view/art/toys';
import { DEFAULT_APPEARANCE, type Appearance } from '../foundation/src/view/art/appearance';
import { applyCompleteTheme } from '../foundation/src/view/art/completeThemes';
import { PlanetMaterials } from '../foundation/src/view/art/planetMaterials';
import { NorthPole } from '../foundation/src/view/art/northPole';
import { protectFromScenery } from '../foundation/src/view/art/SceneryMask';
import { SCENERY_FOCUS_LAYER } from '../foundation/src/view/art/SceneryFocus';
import nativeManifest from '../asset-packs/mario-paint/manifest.json';
import type { Composition } from './model';
import { ComposerBackground } from './background';

type Callbacks = {
  onJunction: (junctionId: number) => void;
  onSelect: (performerId: string) => void;
  onMove: (performerId: string, junctionId: number) => void;
  onCancel?: () => void;
};
type Options = { performance: boolean; selectedId: string | null; placementType: string | null };
type Visual = {
  group: THREE.Group;
  body: THREE.Group;
  halo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  materials: THREE.MeshStandardMaterial[];
  typeId: string;
  assetSetId: string;
  junctionId: number;
  alive: boolean;
};
type Gesture = { pointer: number; id: string; x: number; y: number; moved: boolean };
export type ProjectedComposerJunction = { junctionId: number; label: string; locationName: string | null; x: number; y: number; visible: boolean; performerId: string | null };
export type ProjectedComposerPerformer = { id: string; label: string; junctionId: number; x: number; y: number; visible: boolean };

const OUT = new THREE.Vector3(0, 0, 1);
const INITIAL_CAMERA = new THREE.Vector3(.3, .26, 3.5);
const point = (junctionId: number, radius = 1) => new THREE.Vector3(...toRenderPoint(topology.vertices[junctionId], radius));

/** The composer's isolated presentation surface. It never changes music or owns a clock. */
export class ComposerSphere {
  private readonly world = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 30);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: TrackballControls;
  private readonly planet = createFacetedPlanet(topology.vertices.map((_, i) => point(i)), topology.faces, DEFAULT_APPEARANCE.planet);
  private readonly materials = new PlanetMaterials();
  private readonly pole = new NorthPole();
  private readonly background = new ComposerBackground();
  private readonly ambient = new THREE.AmbientLight('#ffffff', 1.2);
  private readonly key = new THREE.DirectionalLight('#fff1da', 3);
  private readonly fill = new THREE.DirectionalLight('#c4b5ff', .65);
  private readonly edges: LineSegments2;
  private readonly slots: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly performers = new Map<string, Visual>();
  private readonly templates = new Map<string, Promise<THREE.Group>>();
  private readonly reactionTimes = new Map<string, number[]>();
  private readonly resizeObserver: ResizeObserver;
  private readonly preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly label = document.createElement('div');
  private readonly hintRing = new THREE.Mesh(new THREE.TorusGeometry(.073, .005, 8, 40), new THREE.MeshBasicMaterial({ color: '#fff9df', transparent: true, depthWrite: false }));
  private appearance: Appearance = structuredClone(DEFAULT_APPEARANCE);
  private appearanceId = '';
  private composition: Composition | null = null;
  private options: Options = { performance: false, selectedId: null, placementType: null };
  private drag: Gesture | null = null;
  private cameraTap: { pointer: number; x: number; y: number; moved: boolean } | null = null;
  private ghost: Visual | null = null;
  private ghostVertex: number | null = null;
  private hoveredId: string | null = null;
  private focusedJunction: number | null = null;
  private reducedMotion = this.preference.matches;
  private disposed = false;
  private contextLost = false;
  private frame = 0;
  private slowRotate = false;
  private previousFrameTime = 0;

  constructor(private readonly container: HTMLElement, private readonly callbacks: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor('#000000', 0);
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline-offset:-3px';
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.append(canvas);
    this.camera.position.copy(INITIAL_CAMERA);
    this.controls = new TrackballControls(this.camera, canvas);
    this.controls.staticMoving = true;
    this.controls.noPan = true;
    this.controls.keys = ['', '', ''];
    this.controls.rotateSpeed = 2;
    this.controls.zoomSpeed = .7;
    this.controls.minZoom = .65;
    this.controls.maxZoom = 1.5;

    this.key.position.set(-2, 3, 4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    Object.assign(this.key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: .1, far: 12 });
    this.key.shadow.normalBias = .018;
    this.fill.position.set(3, -1, 2);
    for (const light of [this.ambient, this.key, this.fill]) light.layers.enable(SCENERY_FOCUS_LAYER);
    this.world.add(this.ambient, this.key, this.fill, this.planet, this.pole, this.hintRing);
    protectFromScenery(this.pole);
    const positions = topology.edges.flatMap(([a, b]) => [...point(a, .99).toArray(), ...point(b, .99).toArray()]);
    this.edges = new LineSegments2(new LineSegmentsGeometry().setPositions(positions), new LineMaterial({ color: '#c3b8ff', linewidth: 1.6, transparent: true, opacity: .85, depthWrite: false }));
    this.world.add(this.edges);
    topology.vertices.forEach((_, i) => {
      const slot = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff0c7', transparent: true, depthWrite: false }));
      slot.position.copy(point(i, .992));
      this.slots.push(slot);
      this.world.add(slot);
    });
    this.hintRing.visible = false;
    this.label.className = 'composer-sphere-label';
    this.label.setAttribute('aria-hidden', 'true');
    this.label.style.cssText = 'position:absolute;max-width:220px;transform:translate(-50%,-100%);padding:6px 10px;border:1px solid #ffffff60;border-radius:9px;background:#101729e8;color:#fff8e8;font:500 12px/1.4 "DM Sans",sans-serif;pointer-events:none;z-index:2;text-align:center;box-shadow:0 4px 12px #070b1926;display:none';
    container.append(this.label);
    canvas.addEventListener('pointerdown', this.pointerDown, true);
    canvas.addEventListener('pointermove', this.hover);
    canvas.addEventListener('pointerleave', this.leave);
    canvas.addEventListener('dragover', this.paletteDragOver);
    canvas.addEventListener('drop', this.paletteDrop);
    canvas.addEventListener('dragleave', this.paletteDragLeave);
    canvas.addEventListener('keydown', this.keyDown);
    canvas.addEventListener('webglcontextlost', this.contextLoss);
    canvas.addEventListener('webglcontextrestored', this.contextRestore);
    document.addEventListener('pointermove', this.pointerMove, true);
    document.addEventListener('pointerup', this.pointerUp, true);
    document.addEventListener('pointercancel', this.pointerCancel, true);
    document.addEventListener('pointerdown', this.competingPointer, true);
    document.addEventListener('dragend', this.paletteDragLeave);
    window.addEventListener('blur', this.cancelGesture);
    document.addEventListener('visibilitychange', this.visibilityChange);
    this.preference.addEventListener('change', this.motionPreference);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.applyAppearance('original');
    this.resize();
    this.frame = requestAnimationFrame(this.animate);
  }

  update(composition: Composition, options: Options): void {
    const old = this.options;
    const appearanceChanged = this.appearanceId !== composition.appearance;
    const bankChanged = this.composition?.assetSetId !== composition.assetSetId;
    if (old.performance !== options.performance || old.placementType !== options.placementType || bankChanged || appearanceChanged) this.cancelGesture();
    this.composition = composition;
    this.options = { ...options };
    if (appearanceChanged) this.applyAppearance(composition.appearance);
    for (const [id, visual] of this.performers) {
      const performer = composition.performers.find(p => p.id === id);
      if (!performer || visual.assetSetId !== composition.assetSetId || visual.typeId !== performer.instrumentTypeId || appearanceChanged) {
        this.disposeVisual(visual);
        this.performers.delete(id);
        this.reactionTimes.delete(id);
      }
    }
    for (const performer of composition.performers) {
      let visual = this.performers.get(performer.id);
      if (!visual) {
        visual = this.createVisual(composition.assetSetId, performer.instrumentTypeId);
        visual.group.userData.performerId = performer.id;
        this.performers.set(performer.id, visual);
        this.world.add(visual.group);
      }
      visual.junctionId = performer.junctionId;
      this.orient(visual.group, performer.junctionId);
    }
    if (this.drag && !this.performers.has(this.drag.id)) this.cancelGesture();
    if (options.performance) this.hoveredId = null;
    this.updateAria();
    this.resize();
  }

  /** Optional when is a DOM monotonic timestamp in seconds, never AudioContext time. */
  react(performerIds: string[], when = performance.now() / 1000): void {
    if (!Number.isFinite(when)) return;
    for (const id of new Set(performerIds)) {
      if (!this.performers.has(id)) continue;
      const times = this.reactionTimes.get(id) ?? [];
      times.push(when);
      times.sort((a, b) => a - b);
      this.reactionTimes.set(id, times.slice(-64));
    }
  }

  reveal(id: string): void {
    const visual = this.performers.get(id);
    if (!visual) return;
    this.cancelGesture();
    this.controls.reset();
    const normal = point(visual.junctionId);
    this.camera.position.copy(normal).multiplyScalar(INITIAL_CAMERA.length());
    this.camera.up.set(0, 1, 0);
    if (Math.abs(normal.y) > .95) this.camera.up.set(0, 0, -1);
    this.controls.target.set(0, 0, 0);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  resetCamera(): void {
    this.cancelGesture();
    this.controls.reset();
    this.camera.position.copy(INITIAL_CAMERA);
    this.camera.up.set(0, 1, 0);
    this.camera.zoom = 1;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  setSlowRotate(enabled: boolean): void { this.slowRotate=enabled; }

  /** Stable client coordinates for pointer QA; the data never becomes musical state. */
  getProjectedJunctions(): ProjectedComposerJunction[] {
    this.camera.updateMatrixWorld();
    const rect = this.renderer.domElement.getBoundingClientRect();
    return topology.vertices.map((_, junctionId) => {
      const position = point(junctionId, 1.035), p = position.clone().project(this.camera);
      const locationName = this.composition?.locationNames[String(junctionId)] ?? null;
      return { junctionId, label: locationName ?? `Junction ${junctionId + 1}`, locationName, x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2,
        visible: this.front(position, .045) && Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1,
        performerId: this.composition?.performers.find(p => p.junctionId === junctionId)?.id ?? null };
    });
  }

  getProjectedPerformers(): ProjectedComposerPerformer[] {
    return this.getProjectedJunctions().flatMap(j => {
      const performer = this.composition?.performers.find(p => p.id === j.performerId);
      return performer ? [{ id: performer.id, label: `${j.locationName ? `${j.locationName} · ` : ''}${this.typeName(performer.instrumentTypeId)} ${performer.familyNumber}`, junctionId: j.junctionId, x: j.x, y: j.y, visible: j.visible }] : [];
    });
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.cancelGesture();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.pointerDown, true);
    canvas.removeEventListener('pointermove', this.hover);
    canvas.removeEventListener('pointerleave', this.leave);
    canvas.removeEventListener('dragover', this.paletteDragOver);
    canvas.removeEventListener('drop', this.paletteDrop);
    canvas.removeEventListener('dragleave', this.paletteDragLeave);
    canvas.removeEventListener('keydown', this.keyDown);
    canvas.removeEventListener('webglcontextlost', this.contextLoss);
    canvas.removeEventListener('webglcontextrestored', this.contextRestore);
    document.removeEventListener('pointermove', this.pointerMove, true);
    document.removeEventListener('pointerup', this.pointerUp, true);
    document.removeEventListener('pointercancel', this.pointerCancel, true);
    document.removeEventListener('pointerdown', this.competingPointer, true);
    document.removeEventListener('dragend', this.paletteDragLeave);
    window.removeEventListener('blur', this.cancelGesture);
    document.removeEventListener('visibilitychange', this.visibilityChange);
    this.preference.removeEventListener('change', this.motionPreference);
    this.background.dispose();
    this.disposeObject(this.world);
    this.materials.dispose();
    for (const template of this.templates.values()) void template.then(object => this.disposeObject(object), () => {});
    this.renderer.dispose();
    canvas.remove();
    this.label.remove();
  }

  private applyAppearance(id: string) {
    this.appearanceId = id;
    const aliases: Record<string, string> = { 'Blue Marble': 'original', 'blue-marble': 'original', Nebula: 'nebula-space', Fireflies: 'firefly-garden' };
    const themeId = aliases[id] ?? id;
    this.appearance = applyCompleteTheme(['nebula-space', 'firefly-garden'].includes(themeId) ? themeId : 'original', structuredClone(DEFAULT_APPEARANCE));
    const a = this.appearance, theme = a.theme;
    this.materials.apply(this.planet.material, a.planet, a.planetFinish);
    const color = new THREE.Color(a.planet);
    const luminance = .2126 * color.r + .7152 * color.g + .0722 * color.b;
    this.edges.material.color.copy(a.gridColor ? new THREE.Color(a.gridColor) : luminance > .4 ? color.clone().lerp(new THREE.Color('#344362'), .45) : new THREE.Color('#c3b8ff'));
    this.edges.material.opacity = a.gridOpacity;
    this.edges.material.linewidth = a.gridWidth;
    this.ambient.color.set(theme?.lights.ambient ?? '#ffffff');
    this.ambient.intensity = a.lighting * (theme?.lights.ambientPower ?? 1.2);
    this.key.color.set(theme?.lights.key ?? '#fff1da');
    this.key.intensity = a.lighting * (theme?.lights.keyPower ?? 3);
    this.key.position.set(...(theme?.lights.keyPosition ?? [-2, 3, 4]));
    this.key.shadow.intensity = theme?.shadows.strength ?? 1;
    this.key.shadow.radius = theme?.shadows.softness ?? 1;
    this.fill.color.set(theme?.lights.fill ?? '#c4b5ff');
    this.fill.intensity = a.lighting * (theme?.lights.fillPower ?? .65);
    this.fill.position.set(...(theme?.lights.fillPosition ?? [3, -1, 2]));
    this.background.apply(theme);
    this.world.fog = theme?.atmosphere.fog ? new THREE.Fog(theme.atmosphere.haze, theme.atmosphere.fogNear, theme.atmosphere.fogFar) : null;
  }

  private createVisual(assetSetId: string, typeId: string): Visual {
    const group = new THREE.Group(), body = new THREE.Group();
    const halo = new THREE.Mesh(new THREE.RingGeometry(.105, .115, 40), new THREE.MeshBasicMaterial({ name: 'Selection halo', color: '#fff9df', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    halo.position.z = .003;
    group.add(body, halo);
    const visual: Visual = { group, body, halo, materials: [], typeId, assetSetId, junctionId: 0, alive: true };
    if (assetSetId === 'bongo') {
      const toy = createToy('note', this.appearance, typeId as Instrument);
      // The composer's single selection ring replaces the original stack halo.
      toy.halo.removeFromParent();
      toy.halo.geometry.dispose();
      toy.halo.material.dispose();
      body.add(toy.group);
      body.scale.setScalar(this.appearance.size);
      this.collectMaterials(visual, toy.group);
      protectFromScenery(body);
    } else {
      void this.loadNative(typeId).then(template => {
        if (!visual.alive || this.disposed) return;
        const model = template.clone(true);
        model.traverse(object => {
          if (object instanceof THREE.Mesh) {
            object.geometry = object.geometry.clone();
            object.material = Array.isArray(object.material) ? object.material.map(m => m.clone()) : object.material.clone();
            object.castShadow = true;
          }
        });
        body.add(model);
        this.collectMaterials(visual, model);
        protectFromScenery(body);
      }).catch(error => {
        if (visual.alive && !this.disposed) {
          this.renderer.domElement.dataset.assetError = `Could not load ${typeId}`;
          console.error('Bongo Planet Philharmonic original Mario model could not load.', error);
        }
      });
    }
    return visual;
  }

  private collectMaterials(visual: Visual, object: THREE.Object3D) {
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.transparent = true;
          visual.materials.push(material);
        }
      }
    });
  }

  private loadNative(typeId: string) {
    let promise = this.templates.get(typeId);
    if (!promise) {
      const instrument = nativeManifest.instruments.find(i => i.id === typeId);
      if (!instrument) return Promise.reject(Error(`Unknown native model: ${typeId}`));
      const base = new URL(import.meta.env.BASE_URL, location.origin);
      const url = new URL(`asset-packs/mario-paint/${instrument.model}`, base).href;
      promise = new GLTFLoader().loadAsync(url).then(gltf => gltf.scene);
      this.templates.set(typeId, promise);
    }
    return promise;
  }

  private orient(group: THREE.Object3D, junctionId: number) {
    const normal = point(junctionId);
    group.position.copy(normal).multiplyScalar(1.035);
    group.quaternion.setFromUnitVectors(OUT, normal);
  }

  private front(position: THREE.Vector3, margin = 0) {
    return position.clone().normalize().dot(this.camera.position.clone().sub(this.controls.target).normalize()) > margin;
  }

  private nearest(x: number, y: number, touch = false) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (x < rect.left || y < rect.top || x > rect.right || y > rect.bottom) return null;
    const junctions = this.getProjectedJunctions().filter(j => j.visible).map(j => ({ ...j, distance: Math.hypot(x - j.x, y - j.y) })).sort((a, b) => a.distance - b.distance);
    return junctions[0] && junctions[0].distance <= (touch ? 34 : 28) ? junctions[0].junctionId : null;
  }

  private performerAt(x: number, y: number, touch = false) {
    this.world.updateMatrixWorld(true);
    this.camera.updateMatrixWorld();
    const rect = this.renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x - rect.left) / Math.max(1, rect.width) * 2 - 1, 1 - (y - rect.top) / Math.max(1, rect.height) * 2), this.camera);
    const hit = ray.intersectObjects([this.planet, ...[...this.performers.values()].map(v => v.body)], true)[0];
    if (hit) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        const id = object.userData.performerId;
        if (typeof id === 'string') return id;
        object = object.parent;
      }
    }
    const near = this.getProjectedPerformers().filter(p => p.visible).map(p => ({ ...p, distance: Math.hypot(x - p.x, y - p.y) })).sort((a, b) => a.distance - b.distance)[0];
    return near && near.distance <= (touch ? 23 : 15) ? near.id : null;
  }

  private showGhost(junctionId: number | null, typeId: string, movingId: string | null = null) {
    this.ghostVertex = junctionId;
    const setId = this.composition?.assetSetId ?? 'bongo';
    if (this.ghost && (this.ghost.typeId !== typeId || this.ghost.assetSetId !== setId)) {
      this.disposeVisual(this.ghost); this.ghost = null;
    }
    if (!this.ghost) { this.ghost = this.createVisual(setId, typeId); this.world.add(this.ghost.group); }
    this.ghost.group.visible = junctionId !== null;
    this.hintRing.visible = junctionId !== null && !this.options.performance;
    if (junctionId === null) return;
    this.orient(this.ghost.group, junctionId);
    this.orient(this.hintRing, junctionId);
    const occupied = this.composition?.performers.some(p => p.junctionId === junctionId && p.id !== movingId);
    this.hintRing.material.color.set(occupied ? '#ff7676' : '#fff9df');
    this.ghost.group.userData.invalid = occupied;
  }

  private clearGhost() {
    if (this.ghost) this.disposeVisual(this.ghost);
    this.ghost = null;
    this.ghostVertex = null;
    this.hintRing.visible = false;
  }

  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (this.options.performance) {
      this.cameraTap = { pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      return;
    }
    const id = !this.options.placementType ? this.performerAt(event.clientX, event.clientY, event.pointerType === 'touch') : null;
    if (id) {
      event.preventDefault(); event.stopImmediatePropagation();
      this.controls.enabled = false;
      this.renderer.domElement.setPointerCapture(event.pointerId);
      this.drag = { pointer: event.pointerId, id, x: event.clientX, y: event.clientY, moved: false };
      this.renderer.domElement.style.cursor = 'grabbing';
    } else this.cameraTap = { pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  };

  private pointerMove = (event: PointerEvent) => {
    if (this.cameraTap?.pointer === event.pointerId) this.cameraTap.moved ||= Math.hypot(event.clientX - this.cameraTap.x, event.clientY - this.cameraTap.y) > 6;
    if (!this.drag || this.drag.pointer !== event.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    this.drag.moved ||= Math.hypot(event.clientX - this.drag.x, event.clientY - this.drag.y) > 6;
    if (this.drag.moved) {
      const visual = this.performers.get(this.drag.id);
      if (visual) this.showGhost(this.nearest(event.clientX, event.clientY, event.pointerType === 'touch'), visual.typeId, this.drag.id);
    }
  };

  private pointerUp = (event: PointerEvent) => {
    if (this.drag?.pointer === event.pointerId) {
      event.preventDefault(); event.stopImmediatePropagation();
      const drag = this.drag, junction = this.nearest(event.clientX, event.clientY, event.pointerType === 'touch');
      this.cancelGesture();
      if (!drag.moved) this.callbacks.onSelect(drag.id);
      else if (junction !== null && junction !== this.performers.get(drag.id)?.junctionId) this.callbacks.onMove(drag.id, junction);
      return;
    }
    if (this.cameraTap?.pointer !== event.pointerId) return;
    const tap = this.cameraTap;
    this.cameraTap = null;
    if (!tap.moved && !this.options.performance && this.options.placementType) {
      const junction = this.nearest(event.clientX, event.clientY, event.pointerType === 'touch');
      if (junction !== null) this.callbacks.onJunction(junction);
    }
  };

  private pointerCancel = (event: PointerEvent) => {
    if (this.drag?.pointer === event.pointerId) {
      event.preventDefault(); event.stopImmediatePropagation(); this.cancelGesture();
    } else if (this.cameraTap?.pointer === event.pointerId) this.cameraTap = null;
  };

  private competingPointer = (event: PointerEvent) => {
    if (this.drag && this.drag.pointer !== event.pointerId) {
      event.preventDefault(); event.stopImmediatePropagation(); this.cancelGesture();
    }
    if (this.cameraTap && this.cameraTap.pointer !== event.pointerId) this.cameraTap.moved = true;
  };

  private cancelGesture = () => {
    if (this.drag && this.renderer.domElement.hasPointerCapture(this.drag.pointer)) this.renderer.domElement.releasePointerCapture(this.drag.pointer);
    this.drag = null;
    this.cameraTap = null;
    this.controls.enabled = true;
    this.clearGhost();
    this.renderer.domElement.style.cursor = this.options.placementType && !this.options.performance ? 'crosshair' : 'grab';
  };

  private hover = (event: PointerEvent) => {
    if (this.drag || this.cameraTap || this.options.performance || event.pointerType === 'touch') return;
    this.hoveredId = this.performerAt(event.clientX, event.clientY);
    if (this.options.placementType) this.showGhost(this.nearest(event.clientX, event.clientY), this.options.placementType);
    else this.renderer.domElement.style.cursor = this.hoveredId ? 'pointer' : 'grab';
  };
  private leave = () => { this.hoveredId = null; if (!this.drag) this.clearGhost(); };

  private paletteDragOver = (event: DragEvent) => {
    if (this.options.performance || !this.options.placementType) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.showGhost(this.nearest(event.clientX, event.clientY, true), this.options.placementType);
  };

  private paletteDrop = (event: DragEvent) => {
    if (this.options.performance || !this.options.placementType) return;
    event.preventDefault();
    const junction = this.nearest(event.clientX, event.clientY, true);
    this.clearGhost();
    if (junction !== null) this.callbacks.onJunction(junction);
  };

  private paletteDragLeave = () => { if (!this.drag) this.clearGhost(); };

  private keyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { this.cancelGesture(); this.focusedJunction = null; this.callbacks.onCancel?.(); return; }
    if (this.options.performance) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const projected = this.getProjectedJunctions().filter(j => j.visible);
      const selectedVertex = this.options.selectedId ? this.performers.get(this.options.selectedId)?.junctionId : undefined;
      const current = projected.find(j => j.junctionId === (this.focusedJunction ?? selectedVertex));
      const rect = this.renderer.domElement.getBoundingClientRect();
      const from = current ?? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight', sign = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
      const next = projected.map(j => {
        const dx = j.x - from.x, dy = j.y - from.y, forward = (horizontal ? dx : dy) * sign;
        return { ...j, forward, cost: Math.hypot(dx, dy) + Math.abs(horizontal ? dy : dx) * 2 };
      }).filter(j => j.forward > 3).sort((a, b) => a.cost - b.cost)[0] ?? projected[0];
      if (next) {
        this.focusedJunction = next.junctionId;
        if (this.options.placementType) this.showGhost(next.junctionId, this.options.placementType);
        this.updateAria();
      }
    } else if ((event.key === 'Enter' || event.key === ' ') && this.focusedJunction !== null) {
      event.preventDefault();
      if (this.options.placementType) this.callbacks.onJunction(this.focusedJunction);
      else {
        const id = this.composition?.performers.find(p => p.junctionId === this.focusedJunction)?.id;
        if (id) this.callbacks.onSelect(id);
      }
    }
  };

  private updateAria() {
    const description = this.options.performance ? 'Bongo Planet Philharmonic performance sphere. Drag to rotate; scroll or pinch to zoom.'
      : `Bongo Planet Philharmonic instrument sphere. ${this.options.placementType ? `Place ${this.typeName(this.options.placementType)} on an empty junction. ` : ''}Click an instrument to select it; drag its body to move it. Drag empty space to rotate. Scroll or pinch to zoom. Arrow keys choose junctions, Enter selects or places, Escape cancels.${this.focusedJunction !== null ? ` Current junction ${this.focusedJunction + 1}.` : ''}`;
    this.renderer.domElement.setAttribute('aria-label', description);
  }

  private typeName(id: string) {
    return INSTRUMENTS.find(i => i.id === id)?.name ?? nativeManifest.instruments.find(i => i.id === id)?.name ?? id;
  }

  private updateLabel() {
    if (this.options.performance) { this.label.style.display = 'none'; return; }
    const id = this.hoveredId ?? this.options.selectedId;
    const performer = this.composition?.performers.find(p => p.id === id);
    const junction = this.ghostVertex ?? (performer?.junctionId ?? this.focusedJunction);
    if (junction === null || junction === undefined || !this.front(point(junction), .05)) { this.label.style.display = 'none'; return; }
    const text = performer && this.ghostVertex === null
      ? `${this.composition?.locationNames[String(junction)] ? `${this.composition.locationNames[String(junction)]} · ` : ''}${this.typeName(performer.instrumentTypeId)} ${performer.familyNumber}`
      : `${this.composition?.locationNames[String(junction)] ?? `Junction ${junction + 1}`}${this.ghost?.group.userData.invalid ? ' · Occupied' : ''}`;
    const p = point(junction, 1.2).project(this.camera);
    this.label.textContent = text;
    let labelBottom = (1 - p.y) * this.container.clientHeight / 2 - 24;
    const visual = this.ghostVertex !== null ? this.ghost : id ? this.performers.get(id) : undefined;
    if (visual?.body.children.length) {
      // Use the visible toy's bounds: a label at a front junction would otherwise cover its face.
      const bounds = new THREE.Box3().setFromObject(visual.body);
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const corner = new THREE.Vector3(x, y, z).project(this.camera);
        labelBottom = Math.min(labelBottom, (1 - corner.y) * this.container.clientHeight / 2 - 8);
      }
    }
    const halfWidth = Math.min(110, (this.container.clientWidth - 24) / 2);
    this.label.style.maxWidth = `${halfWidth * 2}px`;
    this.label.style.left = `${Math.max(halfWidth + 8, Math.min(this.container.clientWidth - halfWidth - 8, (p.x + 1) * this.container.clientWidth / 2))}px`;
    this.label.style.top = `${Math.max(35, labelBottom)}px`;
    this.label.style.display = 'block';
  }

  private resize = () => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight), aspect = width / height;
    this.renderer.setSize(width, height, false);
    this.edges.material.resolution.set(width, height);
    const halfHeight = 1.42 / Math.min(1, aspect);
    Object.assign(this.camera, { left: -halfHeight * aspect, right: halfHeight * aspect, top: halfHeight, bottom: -halfHeight });
    this.camera.updateProjectionMatrix();
    this.controls.handleResize();
  };

  private animate = (timeMs: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const elapsed=this.previousFrameTime?Math.min(.05,(timeMs-this.previousFrameTime)/1000):0;
    this.previousFrameTime=timeMs;
    if (this.contextLost || this.container.clientWidth < 2 || this.container.clientHeight < 2) return;
    if(this.slowRotate&&!this.reducedMotion&&!this.drag&&!this.cameraTap){
      const axis=new THREE.Vector3(0,1,0),angle=elapsed*.065;
      this.camera.position.sub(this.controls.target).applyAxisAngle(axis,angle).add(this.controls.target);
      this.camera.up.applyAxisAngle(axis,angle);
    }
    if (!this.drag) this.controls.update();
    const now = timeMs / 1000;
    for (const [id, visual] of this.performers) {
      const times = (this.reactionTimes.get(id) ?? []).filter(t => t > now - 1.5);
      this.reactionTimes.set(id, times);
      const onset = times.filter(t => t <= now).at(-1);
      const reaction = onset === undefined ? 0 : Math.exp(-(now - onset) / .18);
      const facing = this.front(point(visual.junctionId));
      const motion = this.reducedMotion ? 0 : reaction;
      visual.group.scale.set(1 + motion * .12, 1 + motion * .23, 1 + motion * .16);
      this.orient(visual.group, visual.junctionId);
      for (const material of visual.materials) {
        material.opacity = this.drag?.id === id && this.drag.moved ? .35 : facing ? 1 : .15;
        material.emissiveIntensity = reaction * .22;
        material.emissive.set('#fff0cb');
      }
      visual.halo.material.opacity = !this.options.performance && facing && this.options.selectedId === id ? .85 : 0;
    }
    this.slots.forEach((slot, junctionId) => {
      slot.visible = !this.options.performance;
      const occupied = this.composition?.performers.some(p => p.junctionId === junctionId);
      slot.material.opacity = this.front(point(junctionId)) ? occupied ? .1 : .9 : .04;
    });
    if (this.ghost) for (const material of this.ghost.materials) {
      material.opacity = .4;
      material.depthWrite = false;
      material.emissive.set(this.ghost.group.userData.invalid ? '#ff5555' : '#ffffff');
      material.emissiveIntensity = .3;
    }
    if (!this.options.performance && this.focusedJunction !== null && !this.ghost) {
      this.hintRing.visible = this.front(point(this.focusedJunction), .045);
      this.orient(this.hintRing, this.focusedJunction);
    }
    this.updateLabel();
    this.camera.updateMatrixWorld();
    const autoClear = this.renderer.autoClear;
    try {
      this.background.render(this.renderer, this.world, this.camera, now, this.reducedMotion, this.container.clientWidth, this.container.clientHeight);
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.world, this.camera);
    } finally { this.renderer.autoClear = autoClear; }
  };

  private motionPreference = () => { this.reducedMotion = this.preference.matches; };
  private visibilityChange = () => { if (document.hidden) this.cancelGesture(); };
  private contextLoss = (event: Event) => { event.preventDefault(); this.contextLost = true; this.cancelGesture(); };
  private contextRestore = () => { this.contextLost = false; this.resize(); };

  private disposeVisual(visual: Visual) { visual.alive = false; this.disposeObject(visual.group); }
  private disposeObject(object: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    object.traverse(child => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        geometries.add(child.geometry);
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    object.removeFromParent();
  }
}
