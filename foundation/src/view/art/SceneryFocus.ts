import * as THREE from 'three';
import { SceneryMask, type SceneryClearance } from './SceneryMask';

export const SCENERY_FOCUS_LAYER = 2;

/** Render only the distant toys out of focus; the musical stage is drawn sharply afterward. */
export class SceneryFocus {
  private readonly target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly clearColor = new THREE.Color();
  private readonly material: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private blur = .6;

  constructor(mask: SceneryMask) {
    this.target.samples = 4;
    this.material = new THREE.ShaderMaterial({
      uniforms: { skyColor: { value: this.target.texture }, blurStep: { value: new THREE.Vector2() } },
      vertexShader: `varying vec2 vSky;
        void main(){vSky=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader: `uniform sampler2D skyColor; uniform vec2 blurStep; varying vec2 vSky;
        void main(){
          vec4 diffuseColor=vec4(0.);
          for(int y=-2;y<=2;y++) for(int x=-2;x<=2;x++){
            float wx=x==0?6.:(abs(x)==1?4.:1.);
            float wy=y==0?6.:(abs(y)==1?4.:1.);
            diffuseColor+=texture2D(skyColor,vSky+vec2(float(x),float(y))*blurStep)*(wx*wy/256.);
          }
          // Transparent render targets contain premultiplied edge colors.
          diffuseColor.rgb/=max(diffuseColor.a,.00001);
          #include <alphatest_fragment>
          gl_FragColor=diffuseColor;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthTest: false, depthWrite: false,
    });
    // Apply clearance after the blur as well, so soft edges cannot bleed through a faint note.
    mask.apply(this.material);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  setBlur(blur: number) { this.blur = blur; }

  update({ bufferSize, viewportHeight }: SceneryClearance) {
    if (this.target.width !== bufferSize.x || this.target.height !== bufferSize.y) this.target.setSize(bufferSize.x, bufferSize.y);
    const radius = this.blur * bufferSize.y / Math.max(1, viewportHeight);
    (this.material.uniforms.blurStep.value as THREE.Vector2).set(radius / bufferSize.x, radius / bufferSize.y);
  }

  render(renderer: THREE.WebGLRenderer, world: THREE.Scene, camera: THREE.Camera) {
    const target = renderer.getRenderTarget(), layers = camera.layers.mask, clear = renderer.autoClear;
    const shadows = renderer.shadowMap.enabled, alpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);
    try {
      renderer.autoClear = true;
      renderer.shadowMap.enabled = false;
      renderer.setClearColor('#000000', 0);
      renderer.setRenderTarget(this.target);
      camera.layers.set(SCENERY_FOCUS_LAYER);
      renderer.render(world, camera);
      camera.layers.mask = layers;
      renderer.setRenderTarget(target);
      renderer.setClearColor(this.clearColor, alpha);
      renderer.render(this.scene, this.camera);
    } finally {
      camera.layers.mask = layers;
      renderer.shadowMap.enabled = shadows;
      renderer.autoClear = clear;
      renderer.setRenderTarget(target);
      renderer.setClearColor(this.clearColor, alpha);
    }
  }

  dispose() { this.target.dispose(); this.quad.geometry.dispose(); this.material.dispose(); }
}
