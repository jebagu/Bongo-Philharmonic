import * as THREE from 'three';

export type SceneryClearance = {
  camera: THREE.OrthographicCamera;
  foreground: readonly THREE.Sphere[]; // Camera-space bounds, including faint rear instruments.
  viewportHeight: number;
  bufferSize: THREE.Vector2;
};

export const SCENERY_MASK_LAYER = 1;

/** Only musical silhouettes and the pole participate; scenery and selection halos do not. */
export function protectFromScenery(object: THREE.Object3D) {
  object.traverse(child => {
    if (child instanceof THREE.Mesh && child.name !== 'Selection halo') child.layers.enable(SCENERY_MASK_LAYER);
  });
}

/** One reusable silhouette pass keeps scenery out of even translucent rear instruments. */
export class SceneryMask {
  private readonly target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  private readonly silhouette = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  readonly texture = this.target.texture;
  readonly bufferSize = new THREE.Vector2(1, 1);
  private readonly texel = new THREE.Vector2(1, 1);
  private readonly maskSize = new THREE.Vector2(1, 1);
  private readonly clearColor = new THREE.Color();
  private readonly patched = new WeakSet<THREE.Material>();

  apply(material: THREE.Material) {
    if (this.patched.has(material)) return;
    this.patched.add(material);
    const previous = material.onBeforeCompile.bind(material);
    material.customProgramCacheKey = () => 'scenery-clearance-v1';
    material.onBeforeCompile = (shader, renderer) => {
      previous(shader, renderer);
      shader.uniforms.sceneryMask = { value: this.texture };
      shader.uniforms.sceneryBufferSize = { value: this.bufferSize };
      shader.uniforms.sceneryMaskTexel = { value: this.texel };
      shader.uniforms.sceneryMaskSize = { value: this.maskSize };
      shader.fragmentShader = `uniform sampler2D sceneryMask; uniform vec2 sceneryBufferSize; uniform vec2 sceneryMaskTexel; uniform vec2 sceneryMaskSize;\n${shader.fragmentShader}`
        .replace('#include <alphatest_fragment>', `
          vec2 sceneryUV = gl_FragCoord.xy / sceneryBufferSize;
          // Preserve solid coverage for even a one-texel instrument detail on Retina screens.
          vec2 sceneryCell = (floor(sceneryUV * sceneryMaskSize) + .5) / sceneryMaskSize;
          float sceneryCoverage = texture2D(sceneryMask, sceneryCell).r;
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
            sceneryCoverage = max(sceneryCoverage, texture2D(sceneryMask, sceneryUV + vec2(float(x), float(y)) * sceneryMaskTexel).r);
          }
          diffuseColor.a *= 1. - sceneryCoverage;
          if (diffuseColor.a < .005) discard;
          #include <alphatest_fragment>`);
    };
  }

  update({ bufferSize, viewportHeight }: SceneryClearance) {
    this.bufferSize.copy(bufferSize);
    const width = Math.max(1, Math.ceil(bufferSize.x / 2)), height = Math.max(1, Math.ceil(bufferSize.y / 2));
    if (this.target.width !== width || this.target.height !== height) this.target.setSize(width, height);
    this.maskSize.set(width, height);
    const pixelRatio = bufferSize.y / Math.max(1, viewportHeight);
    this.texel.set(pixelRatio / width, pixelRatio / height);
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const target = renderer.getRenderTarget(), override = scene.overrideMaterial, layers = camera.layers.mask;
    const shadows = renderer.shadowMap.enabled, alpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);
    try {
      renderer.shadowMap.enabled = false;
      renderer.setClearColor('#000000', 0);
      renderer.setRenderTarget(this.target);
      scene.overrideMaterial = this.silhouette;
      camera.layers.set(SCENERY_MASK_LAYER);
      renderer.render(scene, camera);
    } finally {
      camera.layers.mask = layers;
      scene.overrideMaterial = override;
      renderer.shadowMap.enabled = shadows;
      renderer.setRenderTarget(target);
      renderer.setClearColor(this.clearColor, alpha);
    }
  }

  dispose() { this.target.dispose(); this.silhouette.dispose(); }
}
