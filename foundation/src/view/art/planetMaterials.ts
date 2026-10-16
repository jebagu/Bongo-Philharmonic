import * as THREE from 'three';

export const PLANET_FINISHES = {
  smooth: { name: 'Smooth paint', roughness: .68, clearcoat: 0, bump: 0 },
  clay: { name: 'Soft molded clay', roughness: .94, clearcoat: .01, bump: .045 },
  workedClay: { name: 'Hand-worked clay', roughness: .98, clearcoat: .01, bump: .085 },
  paintedWood: { name: 'Painted wood', roughness: .62, clearcoat: .18, bump: .018 },
  velvet: { name: 'Soft jade', roughness: .96, clearcoat: .03, bump: .018 },
} as const;
export type PlanetFinish = keyof typeof PLANET_FINISHES;

/** The same seeded grain used in the approved HTML color studies. */
export function createPlanetGrainTexture(kind: PlanetFinish | 'chalk') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  const pixels = context.createImageData(256, 256);
  let seed = 4837;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    const x = (i / 4) % 256, y = Math.floor(i / 1024);
    const grain = Math.sin(x * .18 + Math.sin(y * .045) * 4 + Math.sin(y * .013) * 7);
    const value = kind === 'paintedWood' ? Math.round(245 + grain * 6) : kind === 'smooth' ? 255 : kind === 'clay' || kind === 'workedClay'
      ? 250 + ((seed >>> 24) % 6)
      : (kind === 'chalk' ? 242 : 248) + ((seed >>> 24) % (kind === 'chalk' ? 13 : 7));
    pixels.data.set([value, value, value, 255], i);
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(4, 2);
  return texture;
}

export function createClayReliefTexture(worked: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d')!;
  const pixels = context.createImageData(512, 512);
  let seed = 9283;
  const impressions = [[.24, .32, .16, .19], [.73, .67, .20, .14], [.62, .19, .12, .16], [.37, .83, .18, .12]];
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const u = x / 512, v = y / 512;
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    const grain = ((seed >>> 24) / 255 - .5) * (worked ? .15 : .07);
    let height = .52 + grain + Math.sin(u * Math.PI * 6 + Math.sin(v * Math.PI * 4)) * .045
      + Math.cos(v * Math.PI * 8 + u * Math.PI * 4) * .025;
    for (const [cx, cy, rx, ry] of impressions) {
      const dx = (u - cx) / rx, dy = (v - cy) / ry;
      const patch = Math.exp(-(dx * dx + dy * dy) * 2);
      height -= patch * (worked ? .13 : .035);
      if (worked) height += patch * Math.sin(Math.hypot(dx * .8, dy + .6) * 51) * .028;
    }
    const value = Math.round(Math.max(0, Math.min(1, height)) * 255);
    pixels.data.set([value, value, value, 255], (y * 512 + x) * 4);
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

/** Own textures per view; generate each clay finish once, only when selected. */
export class PlanetMaterials {
  private readonly textures = new Map<PlanetFinish, { grain: THREE.Texture; relief: THREE.Texture }>();
  private finish: PlanetFinish = 'smooth';

  apply(material: THREE.MeshPhysicalMaterial, color: string, finish: PlanetFinish) {
    const settings = PLANET_FINISHES[finish];
    if (finish !== 'smooth' && !this.textures.has(finish)) {
      this.textures.set(finish, { grain: createPlanetGrainTexture(finish), relief: finish === 'paintedWood' || finish === 'velvet' ? createPlanetGrainTexture(finish) : createClayReliefTexture(finish === 'workedClay') });
    }
    const textures = this.textures.get(finish);
    material.color.set(color);
    material.roughness = settings.roughness;
    material.clearcoat = settings.clearcoat;
    material.clearcoatRoughness = .85;
    material.map = textures?.grain ?? null;
    material.bumpMap = textures?.relief ?? null;
    material.bumpScale = settings.bump;
    if (this.finish !== finish) material.needsUpdate = true;
    this.finish = finish;
  }

  dispose() {
    for (const textures of this.textures.values()) {
      textures.grain.dispose();
      textures.relief.dispose();
    }
    this.textures.clear();
  }
}
