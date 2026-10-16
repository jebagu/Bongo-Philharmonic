import * as THREE from 'three';
import { createToyEyes, createToyMaterial } from './toys';
import type { ThemePresentation } from './themePresentation';
import { SceneryMask, type SceneryClearance } from './SceneryMask';
import { SceneryFocus, SCENERY_FOCUS_LAYER } from './SceneryFocus';

type Character = { group: THREE.Group; home: THREE.Vector3; size: number; drift: number };

/** Background toys share the instruments' solid geometry, painted materials and eyes. */
export class ThemeScenery extends THREE.Group {
  private readonly garden = new THREE.Group();
  private readonly nebula = new THREE.Group();
  private readonly distantNebula = new THREE.Group();
  private readonly sphere = new THREE.SphereGeometry(1, 32, 24);
  private readonly hill = new THREE.CapsuleGeometry(.29, .65, 12, 32);
  private readonly ring = new THREE.TorusGeometry(.22, .023, 12, 48);
  private readonly star = starGeometry();
  private readonly face = createToyEyes();
  private readonly mask = new SceneryMask();
  private readonly focus = new SceneryFocus(this.mask);
  private readonly characters: Character[] = [];
  private readonly distantCharacters: Character[] = [];
  private readonly cameraOrigin = new THREE.Vector3();
  private readonly skyHaze = new THREE.Color('#253a54');
  private readonly dayMaterials: { material: THREE.MeshPhysicalMaterial; picnic: string; pudding: string }[] = [];

  constructor() {
    super();
    this.name = 'Theme scenery';
    this.garden.name = 'Theme garden characters';
    this.nebula.name = 'Theme nebula characters';
    this.distantNebula.name = 'Distant nebula sky';
    this.add(this.garden, this.nebula, this.distantNebula);

    for (const [x, y, scale] of [[-1.22, 1.04, .85], [1.25, 1.05, .83], [1.20, -1.25, .76]]) {
      const material = this.dayMaterial('#fff2db', '#e5e5ff');
      const cloud = this.cloud(material);
      this.place(this.garden, cloud, x, y, -1.8, scale, .018);
    }
    const hills = [
      [-1.40, -1.13, .78, 1.22], [-1.02, -1.68, .95, .9], [-.39, -1.85, 1.5, .75],
      [.40, -1.85, 1.5, .8], [1.05, -1.65, .95, .9], [1.40, -1.12, .83, 1.35],
    ];
    hills.forEach(([x, y, width, height], index) => {
      const material = this.dayMaterial(['#91be9c', '#b4cd96', '#7daea6'][index % 3], ['#a7a1d2', '#b7c6df', '#91adc9'][index % 3]);
      const character = new THREE.Group(); character.name = 'Theme hill';
      this.mesh(character, this.hill, material, 0, 0, 0, width, height, .85);
      this.eyes(character, 0, .23 * height, .253, 3.3);
      this.place(this.garden, character, x, y, -2.4 - index % 2 * .18, 1, 0);
    });

    const nebulae = [
      [-1.22, .98, .92, '#9a88d9'], [1.18, 1.04, 1.02, '#65bec7'],
      [-1.19, -.95, 1.13, '#7b9fd8'], [1.21, -.96, 1.04, '#c58bb9'],
    ] as const;
    nebulae.forEach(([x, y, scale, color], index) => {
      const character = this.cloud(this.material(color)); character.name = 'Theme nebula';
      character.rotation.z = index % 2 ? -.14 : .12;
      this.place(this.nebula, character, x, y, -2.25, scale, .025);
    });
    for (const [x, y, scale, color, ringed] of [
      [-.64, 1.13, .82, '#efbe7b', true], [1.48, .29, .78, '#af9fe2', false],
    ] as const) {
      const character = new THREE.Group(); character.name = 'Theme little planet';
      this.mesh(character, this.sphere, this.material(color), 0, 0, 0, .16, .16, .16);
      if (ringed) {
        const ring = this.mesh(character, this.ring, this.material('#a6d9d0'), 0, 0, 0);
        ring.rotation.set(.85, -.3, -.38);
      }
      this.eyes(character, 0, -.014, .158, 1.65);
      this.place(this.nebula, character, x, y, -2, scale, .025);
    }
    for (const [x, y, size, tilt] of [[-1.40, .36, .86, -.2], [.50, 1.18, .78, .15], [1.44, .70, .68, -.12]]) {
      const character = new THREE.Group(); character.name = 'Theme star';
      this.mesh(character, this.star, this.material('#f6d68a'), 0, 0, 0);
      this.eyes(character, 0, 0, .052, 1.15);
      character.rotation.z = tilt;
      this.place(this.nebula, character, x, y, -1.9, size, .018);
    }
    // Sculpted, tapered ribbons give the new nebula its own flowing silhouette.
    for (const [x, y, size, tilt] of [[.66, .77, .40, .12], [-.76, -.67, .26, -.38]]) {
      const character = this.nebulaRibbon();
      character.rotation.set(-.12, .16, tilt);
      this.place(this.distantNebula, character, x, y, -1, size, .004);
    }
    const starColors = ['#d3c48d', '#96c2c6', '#b3a5cc'];
    [[-.84, .40, .35], [-.52, .89, .30], [.10, .88, .36], [.87, .28, .33],
      [.83, -.63, .31], [-.82, -.83, .27], [.35, -.88, .25]].forEach(([x, y, size], index) => {
      const character = new THREE.Group(); character.name = 'Distant star';
      this.mesh(character, this.star, this.distantMaterial(starColors[index % starColors.length]), 0, 0, 0);
      this.eyes(character, 0, 0, .052, 1.65);
      character.rotation.set(index % 2 ? .15 : -.12, index % 2 ? -.25 : .25, index * .17 - .4);
      this.place(this.distantNebula, character, x, y, index % 3, size, .002);
    });
    this.visible = false;
  }

  private distantMaterial(color: string) {
    const material = this.material(color);
    material.color.lerp(this.skyHaze, .32);
    material.roughness = .72;
    material.clearcoat = .12;
    return material;
  }

  private nebulaRibbon() {
    const character = new THREE.Group(); character.name = 'Distant nebula';
    const strands = [
      { color: '#9983c5', radius: .17, points: [[-.85, -.13, -.05], [-.53, .02, .01], [-.16, -.03, .10], [.17, .13, .03], [.52, .24, -.08], [.80, .48, -.14]] },
      { color: '#62aeb9', radius: .12, points: [[-.86, -.22, -.04], [-.48, -.15, .13], [-.10, -.19, .17], [.25, -.03, .05], [.53, .13, .03], [.77, .12, -.10]] },
      { color: '#b17da4', radius: .09, points: [[-.74, -.02, -.09], [-.46, .24, -.02], [-.13, .22, -.01], [.18, .32, -.07], [.44, .53, -.13], [.61, .54, -.18]] },
    ];
    for (const strand of strands) {
      const path = new THREE.CatmullRomCurve3(strand.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      const geometry = new THREE.TubeGeometry(path, 64, strand.radius, 16, false);
      const positions = geometry.attributes.position, point = new THREE.Vector3(), center = new THREE.Vector3();
      for (let segment = 0; segment <= 64; segment++) {
        const t = segment / 64, taper = Math.pow(Math.sin(Math.PI * t), .65) * (1 + .13 * Math.sin(t * Math.PI * 7));
        path.getPointAt(t, center);
        for (let side = 0; side <= 16; side++) {
          const index = segment * 17 + side;
          point.fromBufferAttribute(positions, index).sub(center).multiplyScalar(taper).add(center);
          positions.setXYZ(index, point.x, point.y, point.z);
        }
      }
      geometry.computeVertexNormals();
      this.mesh(character, geometry, this.distantMaterial(strand.color), 0, 0, 0);
    }
    this.mesh(character, this.sphere, this.distantMaterial('#9d91c7'), -.15, -.02, .08, .22, .18, .19);
    this.eyes(character, -.15, -.025, .275, 1.25);
    return character;
  }

  private material(color: string) {
    const material = createToyMaterial(color, { roughness: .6, clearcoat: .18, texture: 'none' }) as THREE.MeshPhysicalMaterial;
    material.transparent = true;
    material.fog = false;
    this.mask.apply(material);
    return material;
  }

  private dayMaterial(picnic: string, pudding: string) {
    const material = this.material(picnic);
    this.dayMaterials.push({ material, picnic, pudding });
    return material;
  }

  private mesh(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }

  private eyes(parent: THREE.Group, x: number, y: number, z: number, scale: number) {
    const face = this.face.clone(true);
    face.position.set(x, y, z); face.scale.setScalar(scale);
    face.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.material.fog = false;
        this.mask.apply(object.material);
      }
    });
    parent.add(face);
  }

  private cloud(material: THREE.Material) {
    const character = new THREE.Group(); character.name = 'Theme cloud';
    for (const [x, y, z, sx, sy, sz] of [
      [0, -.035, .02, .31, .12, .155], [-.21, .01, -.015, .135, .13, .12],
      [-.09, .095, -.015, .155, .18, .15], [.10, .075, -.015, .18, .16, .15], [.25, 0, -.01, .12, .115, .12],
    ]) this.mesh(character, this.sphere, material, x, y, z, sx, sy, sz);
    this.eyes(character, 0, -.027, .18, 2.4);
    return character;
  }

  private place(parent: THREE.Group, group: THREE.Group, x: number, y: number, z: number, scale: number, drift: number) {
    group.position.set(x, y, z); group.scale.setScalar(scale);
    parent.add(group);
    (parent === this.distantNebula ? this.distantCharacters : this.characters).push({ group, home: group.position.clone(), size: scale, drift });
  }

  apply(theme?: ThemePresentation) {
    this.garden.visible = theme?.atmosphere.decoration === 'clouds';
    this.nebula.visible = theme?.atmosphere.decoration === 'nebula';
    this.distantNebula.visible = theme?.atmosphere.decoration === 'distant-nebula';
    this.visible = this.garden.visible || this.nebula.visible || this.distantNebula.visible;
    this.focus.setBlur(theme?.atmosphere.backgroundBlur ?? 0);
    this.distantNebula.traverse(object => { if (object instanceof THREE.Mesh) object.layers.set(SCENERY_FOCUS_LAYER); });
    for (const { material, picnic, pudding } of this.dayMaterials) {
      material.color.set(theme?.id === 'cloud-pudding' ? pudding : picnic);
      material.roughness = theme?.materials.roughness ?? .6;
      material.clearcoat = theme?.materials.clearcoat ?? .18;
    }
  }

  tick(time: number, reducedMotion: boolean, rotation?: THREE.Quaternion, clearance?: SceneryClearance) {
    if (!this.visible) return;
    if (rotation) this.quaternion.copy(rotation);
    this.updateWorldMatrix(true, false);
    const origin = this.getWorldPosition(new THREE.Vector3());
    const scale = this.getWorldScale(new THREE.Vector3()).z;
    const originDepth = clearance ? origin.applyMatrix4(clearance.camera.matrixWorldInverse).z : 0;
    let depth = originDepth - 8;
    for (const sphere of clearance?.foreground ?? []) depth = Math.min(depth, sphere.center.z - sphere.radius - 2);
    this.characters.forEach(({ group, home, drift }, index) => {
      group.position.copy(home);
      // Orthographic projection keeps their apparent size while depth becomes unambiguously distant.
      group.position.z = (depth - originDepth) / scale + home.z * .1;
      if (!reducedMotion) {
        group.position.x += Math.sin(time * .17 + index) * drift;
        group.position.y += Math.sin(time * .23 + index * 1.7) * drift;
      }
    });
    if (this.distantNebula.visible) {
      const camera = clearance?.camera;
      this.getWorldPosition(this.cameraOrigin);
      if (camera) this.cameraOrigin.applyMatrix4(camera.matrixWorldInverse);
      const halfWidth = camera ? (camera.right - camera.left) / (2 * camera.zoom * scale) : 1.8;
      const halfHeight = camera ? (camera.top - camera.bottom) / (2 * camera.zoom * scale) : 1.4;
      const unit = Math.min(halfWidth, halfHeight) * .74;
      const skyDepth = Math.min(originDepth - 20, depth - 10);
      this.distantCharacters.forEach(({ group, home, size, drift }, index) => {
        // Cancel globe zoom so the tiny background toys retain their distant apparent scale.
        group.position.set(home.x * halfWidth - this.cameraOrigin.x / scale, home.y * halfHeight - this.cameraOrigin.y / scale, (skyDepth - originDepth) / scale - home.z * .2);
        group.scale.setScalar(size * unit);
        if (!reducedMotion) {
          group.position.x += Math.sin(time * .05 + index) * drift * unit;
          group.position.y += Math.sin(time * .04 + index * 1.7) * drift * unit;
        }
      });
    }
    if (clearance) { this.mask.update(clearance); if (this.distantNebula.visible) this.focus.update(clearance); }
  }

  renderMask(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    if (this.visible) this.mask.render(renderer, scene, camera);
  }

  renderBackground(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    if (!this.visible || !this.distantNebula.visible) return false;
    this.focus.render(renderer, scene, camera);
    return true;
  }

  dispose() {
    this.mask.dispose();
    this.focus.dispose();
    const geometries = new Set<THREE.BufferGeometry>([this.sphere, this.hill, this.ring, this.star]);
    const materials = new Set<THREE.Material>();
    this.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    this.removeFromParent();
  }
}

function starGeometry() {
  const outline = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? .07 : .145;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (i === 0) outline.moveTo(x, y); else outline.lineTo(x, y);
  }
  outline.closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: .04, bevelEnabled: true, bevelSize: .014, bevelThickness: .015, bevelSegments: 5, steps: 1 });
  geometry.translate(0, 0, -.02);
  return geometry;
}
