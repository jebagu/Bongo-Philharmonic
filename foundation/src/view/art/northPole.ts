import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** A floating landmark at composition +Z, which is +Y in the rendered world. */
export class NorthPole extends THREE.Group {
  private readonly sign = new THREE.Group();

  constructor() {
    super();
    this.name = 'Bongo Planet North Pole';
    this.position.set(0, 1.105, 0);
    const snow = new THREE.MeshStandardMaterial({ color: '#fff8e8', roughness: 0.65 });
    const red = new THREE.MeshStandardMaterial({ color: '#ed5268', roughness: 0.4 });
    const gold = new THREE.MeshStandardMaterial({ color: '#ffd35b', roughness: 0.35 });
    const ink = new THREE.MeshBasicMaterial({ color: '#344362' });
    const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    add(this, new THREE.CylinderGeometry(0.076, 0.06, 0.022, 8), snow, 0, 0.011);
    add(this, new THREE.CylinderGeometry(0.014, 0.014, 0.192, 16), snow, 0, 0.118);
    for (const y of [0.042, 0.082, 0.122, 0.162, 0.202]) {
      add(this, new THREE.CylinderGeometry(0.0145, 0.0145, 0.02, 16), red, 0, y);
    }
    add(this, new THREE.SphereGeometry(0.023, 12, 8), gold, 0, 0.236);

    this.sign.position.y = 0.177;
    this.sign.name = 'North Pole sign';
    this.add(this.sign);
    add(this.sign, new RoundedBoxGeometry(0.145, 0.08, 0.025, 2, 0.01), gold, 0, 0);
    add(this.sign, new RoundedBoxGeometry(0.127, 0.062, 0.008, 2, 0.005), snow, 0, 0, 0.014);
    // Model the letter with solid strokes so it needs no font or image asset.
    const stroke = new THREE.BoxGeometry(0.009, 0.039, 0.003);
    for (const x of [-0.017, 0.017]) add(this.sign, stroke, ink, x, 0, 0.02);
    const diagonal = add(this.sign, new THREE.BoxGeometry(0.009, Math.hypot(0.034, 0.039), 0.003), ink, 0, 0, 0.02);
    diagonal.rotation.z = Math.atan2(0.034, 0.039);
  }

}
