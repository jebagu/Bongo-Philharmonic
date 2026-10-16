import * as THREE from 'three';
import type { ThemePresentation } from './themePresentation';
import { ThemeScenery } from './ThemeScenery';
import type { SceneryClearance } from './SceneryMask';

/** A reusable rim shell and background toy characters, independent of musical objects. */
export class ThemeAtmosphere extends THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  private readonly scenery = new ThemeScenery();
  constructor() {
    super(new THREE.SphereGeometry(1.028, 64, 48), new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color() }, alpha: { value: 0 } },
      vertexShader: `varying vec3 vNormal; varying vec3 vView;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
      fragmentShader: `uniform vec3 tint; uniform float alpha; varying vec3 vNormal; varying vec3 vView;
        void main(){
          float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.);
          gl_FragColor=vec4(tint,alpha*rim);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    }));
    this.visible = false;
    this.name = 'Theme atmosphere';
    this.add(this.scenery);
  }

  apply(theme?: ThemePresentation) {
    this.visible = !!theme;
    this.scenery.apply(theme);
    if (theme) {
      this.material.uniforms.tint.value.set(theme.atmosphere.rim);
      this.material.uniforms.alpha.value = theme.atmosphere.rimOpacity;
    }
  }

  get hasScenery() { return this.visible && this.scenery.visible; }

  tick(time: number, reducedMotion: boolean, cameraRotation?: THREE.Quaternion, clearance?: SceneryClearance) {
    this.scenery.tick(time, reducedMotion, cameraRotation, clearance);
  }

  renderMask(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    if (this.hasScenery) this.scenery.renderMask(renderer, scene, camera);
  }

  renderBackground(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    return this.hasScenery && this.scenery.renderBackground(renderer, scene, camera);
  }

  dispose() { this.scenery.dispose(); this.geometry.dispose(); this.material.dispose(); this.removeFromParent(); }
}
