import * as THREE from 'three';
import { validateVoxelSprite } from './types';

// Counterclockwise corners viewed from outside each face.
const FACES = [
  { normal: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { normal: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { normal: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { normal: [0, -1, 0], corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]] },
  { normal: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { normal: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
] as const;

/** One mesh / draw call, hidden voxel faces removed; +Z faces the player. */
export function createMarioPaintModel(value: unknown): THREE.Group {
  const data = validateVoxelSprite(value);
  const cells = new Set(data.voxels.map(([x, y, z]) => `${x},${y},${z}`));
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], indices: number[] = [];
  const palette = data.palette.map(color => new THREE.Color(color)); // sRGB input -> linear glTF vertex colors
  for (const [x, y, z, paletteIndex] of data.voxels) {
    const color = palette[paletteIndex];
    for (const { normal, corners } of FACES) {
      if (cells.has(`${x + normal[0]},${y + normal[1]},${z + normal[2]}`)) continue;
      const first = positions.length / 3;
      for (const corner of corners) {
        positions.push((x + corner[0] - data.size[0] / 2) * data.pixelSize,
          (y + corner[1] - data.size[1] / 2) * data.pixelSize,
          (z + corner[2]) * data.pixelSize + data.surfaceLift);
        normals.push(...normal);
        colors.push(color.r, color.g, color.b);
      }
      indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({ name: 'Original sprite palette', vertexColors: true, roughness: 0.78, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `Mario Paint ${data.id} — extruded pixels`;
  const group = new THREE.Group();
  group.name = `Bongo Planet / Mario Paint / ${data.id}`;
  group.userData = { pack: 'mario-paint', instrument: data.id, axes: data.axes, pixelSize: data.pixelSize, voxelCount: data.voxels.length };
  group.add(mesh);
  return group;
}

export function disposeMarioPaintModel(group: THREE.Group): void {
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
  });
}
