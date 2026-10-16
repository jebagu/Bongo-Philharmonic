import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Piece } from '../../core/contracts';
import type { Instrument } from '../../core/instruments';
import type { Appearance } from './appearance';
import type { ThemePresentation } from './themePresentation';

export type Toy = {
  group: THREE.Group;
  material: THREE.MeshStandardMaterial;
  eyes: THREE.Group;
  halo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
};

/** The same painted body finish is shared by instruments and scenery characters. */
export function createToyMaterial(color: string, finish?: ThemePresentation['materials']) {
  const parameters = {
    name: 'Body', color, roughness: finish?.roughness ?? 0.4, metalness: 0,
    transparent: true, emissive: color, emissiveIntensity: 0,
  };
  const material = finish
    ? new THREE.MeshPhysicalMaterial({ ...parameters, clearcoat: finish.clearcoat, clearcoatRoughness: .24 })
    : new THREE.MeshStandardMaterial(parameters);
  if (finish?.texture === 'wood' || finish?.texture === 'clay') {
    // Object-space grain needs neither image downloads nor per-piece texture allocations.
    const wood = finish.texture === 'wood';
    material.customProgramCacheKey = () => `toy-grain-${finish.texture}`;
    material.onBeforeCompile = shader => {
      shader.vertexShader = `varying vec3 vGrainPosition;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrainPosition = position;');
      const grain = wood
        ? '0.5 + 0.5 * sin(vGrainPosition.y * 380.0 + sin(vGrainPosition.x * 52.0) * 3.0)'
        : 'fract(sin(dot(floor(vGrainPosition * 1800.0), vec3(12.9898, 78.233, 45.164))) * 43758.5453)';
      shader.fragmentShader = `varying vec3 vGrainPosition;\n${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb *= mix(${wood ? '.91' : '.96'}, 1.0, ${grain});`);
    };
  }
  return material;
}

/** Tiny solid eyes with white glints, shared by every kind of toy. */
export function createToyEyes(height = 1.25) {
  const eyes = new THREE.Group();
  eyes.name = 'Eyes';
  const ink = new THREE.MeshStandardMaterial({ name: 'Eyes', color: '#15234e', roughness: .22, transparent: true });
  const white = new THREE.MeshBasicMaterial({ name: 'Eye highlights', color: '#ffffff', transparent: true });
  for (const x of [-.021, .021]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.008, 10, 8), ink);
    eye.scale.set(.72, height, .65); eye.position.x = x;
    const shine = new THREE.Mesh(new THREE.SphereGeometry(.002, 6, 4), white);
    shine.position.set(x - .0018, .003, .0046);
    eyes.add(eye, shine);
  }
  return eyes;
}

/** Real editable 3D meshes. Local +Z faces away from the planet surface. */
export function createToy(kind: Piece['kind'], appearance: Appearance, instrument?: Instrument, pose: 'planet' | 'portrait' = 'planet'): Toy {
  const group = new THREE.Group();
  group.name = `Bongo Planet ${instrument ?? kind}`;
  const color = appearance[instrument ?? kind];
  const outwardDrum = pose === 'planet' && (instrument === 'bongo-high' || instrument === 'bongo-low' || instrument === 'snare' || instrument === 'hi-hat');
  const material = createToyMaterial(color, appearance.theme?.materials);
  const geometry = kind === 'generator'
    ? new THREE.TorusGeometry(0.068, 0.025, 12, 28)
    : kind === 'note'
      ? new THREE.CapsuleGeometry(0.038, 0.067, 5, 12)
      : new RoundedBoxGeometry(0.115, 0.104, 0.074, 2, 0.019);
  const body = new THREE.Mesh(geometry, material);
  body.name = 'Body';
  body.castShadow = true;
  body.position.set(0, kind === 'note' ? 0.016 : 0, kind === 'beat' ? 0.043 : 0.045);
  group.add(body);
  if (instrument) {
    group.remove(body);
    geometry.dispose();
    const instrumentBody = new THREE.Group(); instrumentBody.name = 'Body';
    group.add(instrumentBody); addInstrumentBody(instrumentBody, material, instrument);
    if (outwardDrum) {
      // Turn the head from local +Y to outward +Z; portraits retain their upright pose.
      const centerZ = instrument === 'bongo-low' ? 0.031 : 0.037;
      instrumentBody.rotation.x = Math.PI / 2;
      instrumentBody.position.set(0, centerZ, centerZ);
    }
  }

  const eyes = createToyEyes(instrument === 'hi-hat' ? .75 : 1.25);
  eyes.visible = appearance.eyes;
  const eyeY = kind === 'generator' ? -.047 : instrument === 'guitar' || instrument === 'kick' ? -.014 : instrument === 'snare' ? -.003 : instrument === 'hi-hat' ? .009 : .013;
  const eyeZ = kind === 'generator' ? .068 : instrument === 'glass' ? .104 : instrument === 'bongo-high' ? outwardDrum ? .0955 : .076 : instrument === 'bongo-low' ? outwardDrum ? .097 : .080 : instrument === 'kick' ? .079 : instrument === 'snare' ? outwardDrum ? .0735 : .099 : instrument === 'hi-hat' ? outwardDrum ? .070 : .106 : kind === 'note' ? .081 : .082;
  eyes.position.set(0, eyeY, eyeZ);
  group.add(eyes);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.104, 0.113, 40),
    new THREE.MeshBasicMaterial({ name: 'Selection halo', color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  halo.name = 'Selection halo';
  halo.position.z = 0.003;
  group.add(halo);
  return { group, material, eyes, halo };
}

/** Compact instrument silhouettes, using the same editable toy materials and eyes. */
function addInstrumentBody(group: THREE.Group, material: THREE.MeshStandardMaterial, instrument: Instrument) {
  const detail = new THREE.MeshStandardMaterial({ name: 'Ivory details', color: '#fff8e8', roughness: 0.42 });
  const ink = new THREE.MeshStandardMaterial({ name: 'Ink details', color: '#344362', roughness: 0.4 });
  const add = (geometry: THREE.BufferGeometry, x: number, y: number, z: number, mat = material) => {
    const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.castShadow = true; group.add(mesh); return mesh;
  };
  const box = (w: number, h: number, d: number) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w,h,d) * 0.18);
  if (instrument === 'guitar') {
    const lower = add(new THREE.SphereGeometry(0.051, 16, 12), 0, -0.022, 0.044); lower.scale.set(1, 0.9, 0.7);
    const upper = add(new THREE.SphereGeometry(0.037, 16, 12), 0, 0.018, 0.044); upper.scale.z = 0.85;
    add(box(0.023, 0.09, 0.027), 0, 0.079, 0.047);
    add(box(0.038, 0.035, 0.027), 0, 0.126, 0.047);
    add(box(0.032, 0.007, 0.004), 0, -0.051, 0.080, ink);
    for (const x of [-0.004, 0, 0.004]) add(box(0.0015, 0.104, 0.002), x, 0.056, 0.065, detail);
  } else if (instrument === 'glass') {
    const bell = add(new THREE.CylinderGeometry(0.028, 0.054, 0.095, 8), 0, 0.006, 0.043);
    bell.rotation.x = Math.PI / 2; // Faceted blue glass bell, facing out from the planet.
    add(new THREE.TorusGeometry(0.045, 0.004, 6, 16), 0, 0.006, 0.092, detail);
    add(new THREE.SphereGeometry(0.014, 10, 8), 0, -0.055, 0.044, detail);
  } else if (instrument === 'bongo-high' || instrument === 'bongo-low') {
    const high = instrument === 'bongo-high';
    const radius = high ? 0.045 : 0.053, height = high ? 0.094 : 0.109, z = high ? 0.037 : 0.031;
    add(new THREE.CylinderGeometry(radius, radius * 0.78, height, 20), 0, 0.003, z);
    add(new THREE.CylinderGeometry(radius + 0.003, radius + 0.003, 0.009, 20), 0, 0.003 + height / 2, z, detail);
    const rim = add(new THREE.TorusGeometry(radius, 0.004, 8, 24), 0, 0.003 + height / 2 + 0.004, z, detail);
    rim.rotation.x = Math.PI / 2;
  } else if (instrument === 'kick') {
    const shell = add(new THREE.CylinderGeometry(0.063, 0.063, 0.09, 24), 0, 0, 0.028);
    shell.rotation.x = Math.PI / 2;
    const head = add(new THREE.CylinderGeometry(0.057, 0.057, 0.003, 24), 0, 0, 0.075, detail);
    head.rotation.x = Math.PI / 2;
    for (const z of [-0.014, 0.075]) add(new THREE.TorusGeometry(0.061, 0.005, 8, 28), 0, 0, z);
  } else if (instrument === 'snare') {
    add(new THREE.CylinderGeometry(0.063, 0.063, 0.05, 24), 0, 0, 0.037);
    for (const y of [-0.029, 0.029]) {
      add(new THREE.CylinderGeometry(0.063, 0.063, 0.007, 24), 0, y, 0.037, detail);
      const rim = add(new THREE.TorusGeometry(0.063, 0.004, 8, 24), 0, y, 0.037, detail);
      rim.rotation.x = Math.PI / 2;
    }
    for (const x of [-0.048, 0.048]) for (const z of [0, 0.074]) add(box(0.008, 0.049, 0.007), x, 0, z, detail);
  } else if (instrument === 'hi-hat') {
    add(new THREE.CylinderGeometry(0.018, 0.068, 0.025, 24), 0, 0.019, 0.037);
    add(new THREE.CylinderGeometry(0.068, 0.068, 0.016, 24), 0, 0.009, 0.037);
    add(new THREE.CylinderGeometry(0.065, 0.058, 0.012, 24), 0, -0.014, 0.037);
    const cap = add(new THREE.SphereGeometry(0.012, 12, 8), 0, 0.034, 0.037);
    cap.scale.y = 0.65;
  } else {
    add(box(0.116, 0.108, 0.071), 0, 0, 0.044);
    if (instrument === 'piano') {
      for (let i = 0; i < 7; i++) add(box(0.014, 0.037, 0.009), (i-3)*0.015, -0.032, 0.084, detail);
      for (const i of [0,1,3,4,5]) add(box(0.007, 0.019, 0.01), (i-2.5)*0.015, -0.022, 0.092, ink);
    } else if (instrument === 'kalimba') {
      for (let i = 0; i < 5; i++) add(box(0.009, 0.024 + (2-Math.abs(i-2))*0.008, 0.007), (i-2)*0.017, -0.023, 0.084, detail);
    } else {
      for (let i = 0; i < 5; i++) add(box(0.016, 0.033 + i*0.006, 0.013), (i-2)*0.022, -0.029, 0.084, detail);
    }
  }
}

export function createFacetedPlanet(vertices: THREE.Vector3[], faces: [number, number, number][], color: string) {
  const positions: number[] = [];
  for (const face of faces) {
    const points = face.map(i => vertices[i]);
    const normal = new THREE.Vector3().subVectors(points[1], points[0]).cross(new THREE.Vector3().subVectors(points[2], points[0]));
    if (normal.dot(points[0]) < 0) [points[1], points[2]] = [points[2], points[1]];
    for (const p of points) positions.push(p.x * 0.99, p.y * 0.99, p.z * 0.99);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const uv: number[] = [];
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 3) {
    const face = Array.from({ length: 3 }, (_, j) => {
      const point = new THREE.Vector3().fromBufferAttribute(position, i + j).normalize();
      return [Math.atan2(point.z, point.x) / (2 * Math.PI) + .5, Math.asin(point.y) / Math.PI + .5];
    });
    // Unwrap each triangle across the texture seam without changing the mesh.
    if (Math.max(...face.map(p => p[0])) - Math.min(...face.map(p => p[0])) > .5) {
      for (const p of face) if (p[0] < .5) p[0] += 1;
    }
    uv.push(...face.flat());
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const material = new THREE.MeshPhysicalMaterial({ name: 'Planet', color, roughness: 0.68, flatShading: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Bongo Planet faceted globe';
  mesh.receiveShadow = true;
  return mesh;
}
